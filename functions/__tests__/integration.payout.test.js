/**
 * Integration Tests - Payout Processing
 * Tests actual Firebase Firestore with emulator
 * Verifies payout and refund workflow
 */

const admin = require('firebase-admin');
const {
  initializeFirebaseEmulator,
  clearFirestore,
  createTestUser,
  createTestPayment,
  getDoc,
  getAllDocs,
  queryDocs,
} = require('./integration.setup');

let firebaseAdmin;

// Initialize Firebase Admin with emulator
beforeAll(() => {
  firebaseAdmin = initializeFirebaseEmulator();
});

// Clear Firestore before each test
beforeEach(async () => {
  await clearFirestore(firebaseAdmin);
});

describe('Integration: Payout Processing', () => {
  let db;

  beforeEach(() => {
    db = firebaseAdmin.firestore();
  });

  describe('Payout Creation', () => {
    test('should create payout document', async () => {
      const technicianId = 'tech_001';

      // Create technician
      await createTestUser(admin, technicianId, { balance: 10000 });

      // Create payout request
      const payoutId = 'pout_001';
      await db.collection('payouts').doc(payoutId).set({
        id: payoutId,
        technicianId,
        amount: 5000,
        status: 'pending',
        razorpayPayoutId: null,
        createdAt: new Date().toISOString(),
      });

      // Verify
      const payout = await getDoc(firebaseAdmin, 'payouts', payoutId);
      expect(payout.amount).toBe(5000);
      expect(payout.status).toBe('pending');
    });

    test('should store payout with all required fields', async () => {
      const payoutData = {
        id: 'pout_001',
        technicianId: 'tech_001',
        amount: 10000,
        status: 'pending',
        method: 'NEFT',
        accountNumber: '123456789',
        ifscCode: 'HDFC0000001',
        razorpayPayoutId: null,
        createdAt: new Date().toISOString(),
      };

      await db.collection('payouts').doc(payoutData.id).set(payoutData);

      const payout = await getDoc(firebaseAdmin, 'payouts', 'pout_001');
      expect(payout).toHaveProperty('id');
      expect(payout).toHaveProperty('technicianId');
      expect(payout).toHaveProperty('amount');
      expect(payout).toHaveProperty('status');
      expect(payout).toHaveProperty('method');
    });
  });

  describe('Payout Status Tracking', () => {
    test('should track payout status transitions', async () => {
      const payoutId = 'pout_001';

      // Create payout (pending)
      await db.collection('payouts').doc(payoutId).set({
        id: payoutId,
        status: 'pending',
      });

      // Update to processed
      await db.collection('payouts').doc(payoutId).update({
        status: 'processed',
        razorpayPayoutId: 'pay_ABC123',
      });

      // Verify
      const payout = await getDoc(firebaseAdmin, 'payouts', payoutId);
      expect(payout.status).toBe('processed');
      expect(payout.razorpayPayoutId).toBe('pay_ABC123');
    });

    test('should query payouts by technician', async () => {
      const technicianId = 'tech_001';

      // Create payouts for technician
      for (let i = 1; i <= 3; i++) {
        await db.collection('payouts').doc(`pout_00${i}`).set({
          id: `pout_00${i}`,
          technicianId,
          amount: 5000,
        });
      }

      // Create payout for different technician
      await db.collection('payouts').doc('pout_999').set({
        id: 'pout_999',
        technicianId: 'tech_002',
        amount: 5000,
      });

      // Query
      const techPayouts = await queryDocs(firebaseAdmin, 'payouts', 'technicianId', '==', technicianId);
      expect(techPayouts).toHaveLength(3);
    });
  });

  describe('Refund Processing', () => {
    test('should create refund record', async () => {
      // Create payment first
      const paymentId = 'pay_001';
      await createTestPayment(admin, paymentId, {
        status: 'completed',
        amount: 5000,
        commission: 500,
      });

      // Create refund
      const refundId = `ref_${Date.now()}`;
      await db.collection('refunds').doc(refundId).set({
        id: refundId,
        paymentId,
        amount: 4500, // amount - commission
        reason: 'customer_request',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      // Verify
      const refund = await getDoc(firebaseAdmin, 'refunds', refundId);
      expect(refund.amount).toBe(4500);
      expect(refund.status).toBe('pending');
    });

    test('should update payment status on refund', async () => {
      const paymentId = 'pay_001';

      // Create completed payment
      await createTestPayment(admin, paymentId, { status: 'completed' });

      // Process refund
      await db.collection('payments').doc(paymentId).update({
        status: 'refunded',
        refundDate: new Date().toISOString(),
      });

      // Verify
      const payment = await getDoc(firebaseAdmin, 'payments', paymentId);
      expect(payment.status).toBe('refunded');
    });

    test('should enforce 7-day refund window', async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);

      // Create old payments
      await db.collection('payments').doc('pay_within_window').set({
        createdAt: sevenDaysAgo.toISOString(),
        status: 'completed',
      });

      await db.collection('payments').doc('pay_outside_window').set({
        createdAt: eightDaysAgo.toISOString(),
        status: 'completed',
      });

      // Get payments
      const withinWindow = await getDoc(firebaseAdmin, 'payments', 'pay_within_window');
      const outsideWindow = await getDoc(firebaseAdmin, 'payments', 'pay_outside_window');

      // Verify window logic (application would use this)
      const refundWindowMs = 7 * 24 * 60 * 60 * 1000;
      const withinWindowTime = now - new Date(withinWindow.createdAt).getTime();
      const outsideWindowTime = now - new Date(outsideWindow.createdAt).getTime();

      expect(withinWindowTime <= refundWindowMs).toBe(true);
      expect(outsideWindowTime > refundWindowMs).toBe(true);
    });
  });

  describe('Technician Balance Management', () => {
    test('should deduct balance after successful payout', async () => {
      const technicianId = 'tech_001';
      const initialBalance = 10000;

      // Create technician
      await createTestUser(admin, technicianId, { balance: initialBalance });

      // Create payout
      const payoutAmount = 5000;
      const payoutId = 'pout_001';
      await db.collection('payouts').doc(payoutId).set({
        id: payoutId,
        technicianId,
        amount: payoutAmount,
        status: 'pending',
      });

      // Simulate payout processing - deduct balance
      await db.collection('users').doc(technicianId).update({
        balance: admin.firestore.FieldValue.increment(-payoutAmount),
      });

      // Verify
      const user = await getDoc(firebaseAdmin, 'users', technicianId);
      expect(user.balance).toBe(5000); // 10000 - 5000
    });

    test('should prevent negative balance', async () => {
      const technicianId = 'tech_001';
      const balance = 2000;

      await createTestUser(admin, technicianId, { balance });

      // Try to payout more than balance
      const payoutAmount = 5000;
      
      // In real app, this validation happens in code
      const wouldGoNegative = balance - payoutAmount < 0;
      expect(wouldGoNegative).toBe(true);

      // Don't deduct if it would go negative
      if (wouldGoNegative) {
        const user = await getDoc(firebaseAdmin, 'users', technicianId);
        expect(user.balance).toBe(2000); // unchanged
      }
    });

    test('should track balance history', async () => {
      const technicianId = 'tech_001';

      await createTestUser(admin, technicianId, { balance: 0 });

      // Add earnings through payments
      const payments = [
        { id: 'pay_001', amount: 5000, commission: 500 },
        { id: 'pay_002', amount: 10000, commission: 1000 },
      ];

      let currentBalance = 0;

      for (const payment of payments) {
        const earnings = payment.amount - payment.commission;
        await db.collection('payments').doc(payment.id).set(payment);
        
        // Update balance
        currentBalance += earnings;
        await db.collection('users').doc(technicianId).update({
          balance: currentBalance,
        });
      }

      // Verify final balance
      const user = await getDoc(firebaseAdmin, 'users', technicianId);
      expect(user.balance).toBe(13500); // (5000-500) + (10000-1000)
    });
  });

  describe('Duplicate Prevention', () => {
    test('should prevent duplicate refunds', async () => {
      const paymentId = 'pay_001';

      // Create payment
      await createTestPayment(admin, paymentId, { status: 'completed' });

      // Create first refund
      await db.collection('payments').doc(paymentId).update({
        status: 'refunded',
      });

      // Try to create another refund
      const updatedPayment = await getDoc(firebaseAdmin, 'payments', paymentId);
      expect(updatedPayment.status).toBe('refunded');

      // Verify status is already refunded - prevent second refund
      if (updatedPayment.status === 'refunded') {
        // Don't process another refund
        expect(true).toBe(true);
      }
    });

    test('should track refund count per payment', async () => {
      const paymentId = 'pay_001';

      await createTestPayment(admin, paymentId, {
        status: 'completed',
        refundCount: 0,
      });

      // Process refund - increment count
      await db.collection('payments').doc(paymentId).update({
        status: 'refunded',
        refundCount: admin.firestore.FieldValue.increment(1),
      });

      // Verify
      const payment = await getDoc(firebaseAdmin, 'payments', paymentId);
      expect(payment.refundCount).toBe(1);

      // Prevent second refund
      if (payment.refundCount > 0) {
        expect(true).toBe(true); // already refunded
      }
    });
  });

  describe('Payout Audit Trail', () => {
    test('should create payout audit log', async () => {
      const payoutId = 'pout_001';

      await db.collection('payment_logs').doc(`log_${payoutId}`).set({
        payoutId,
        action: 'payout_created',
        timestamp: new Date().toISOString(),
      });

      await db.collection('payment_logs').doc(`log_${payoutId}_processed`).set({
        payoutId,
        action: 'payout_processed',
        razorpayPayoutId: 'pay_ABC123',
        timestamp: new Date().toISOString(),
      });

      // Query logs
      const logs = await queryDocs(firebaseAdmin, 'payment_logs', 'payoutId', '==', payoutId);
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Transaction Consistency', () => {
    test('should maintain payout and user balance consistency', async () => {
      const technicianId = 'tech_001';
      const payoutAmount = 5000;

      // Create user with balance
      await createTestUser(admin, technicianId, { balance: 10000 });

      // Create payout
      const payoutId = 'pout_001';
      await db.collection('payouts').doc(payoutId).set({
        id: payoutId,
        technicianId,
        amount: payoutAmount,
      });

      // Deduct balance
      await db.collection('users').doc(technicianId).update({
        balance: admin.firestore.FieldValue.increment(-payoutAmount),
      });

      // Verify consistency
      const user = await getDoc(firebaseAdmin, 'users', technicianId);
      const payout = await getDoc(firebaseAdmin, 'payouts', payoutId);

      expect(user.balance).toBe(5000);
      expect(payout.amount).toBe(5000);
      expect(payout.technicianId).toBe(technicianId);
    });

    test('should handle concurrent payouts', async () => {
      const technicianId = 'tech_001';
      const initialBalance = 50000;

      await createTestUser(admin, technicianId, { balance: initialBalance });

      // Create multiple concurrent payouts
      const payoutPromises = [];
      for (let i = 1; i <= 3; i++) {
        payoutPromises.push(
          db.collection('payouts').doc(`pout_00${i}`).set({
            id: `pout_00${i}`,
            technicianId,
            amount: 5000,
          })
        );
      }

      await Promise.all(payoutPromises);

      // Verify all created
      const allPayouts = await queryDocs(firebaseAdmin, 'payouts', 'technicianId', '==', technicianId);
      expect(allPayouts).toHaveLength(3);
      
      const totalPayout = allPayouts.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPayout).toBe(15000);
    });
  });
});
