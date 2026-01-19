/**
 * Integration Tests - Payment Processing
 * Tests actual Firebase Firestore with emulator
 * NOT using mocks - testing real database operations
 */

const admin = require('firebase-admin');
const {
  initializeFirebaseEmulator,
  clearFirestore,
  createTestUser,
  createTestPayment,
  createTestBooking,
  getDoc,
  getAllDocs,
  queryDocs,
} = require('./integration.setup');

let firebaseAdmin;

// Initialize Firebase Admin with emulator
beforeAll(() => {
  firebaseAdmin = initializeFirebaseEmulator();
  console.log('\n🔥 Integration Tests - Firebase Emulator Started\n');
});

// Clear Firestore before each test
beforeEach(async () => {
  await clearFirestore(firebaseAdmin);
});

describe('Integration: Payment Processing', () => {
  let db;

  beforeEach(() => {
    db = firebaseAdmin.firestore();
  });

  describe('Payment Creation', () => {
    test('should create payment document in Firestore', async () => {
      // Arrange
      const paymentId = 'pay_test_001';
      const paymentData = {
        orderId: 'order_001',
        amount: 5000,
        commission: 500,
        customerId: 'cust_001',
        technicianId: 'tech_001',
        status: 'completed',
      };

      // Act - Create payment
      await db.collection('payments').doc(paymentId).set({
        id: paymentId,
        ...paymentData,
        createdAt: new Date().toISOString(),
      });

      // Assert - Verify in Firestore
      const saved = await getDoc(firebaseAdmin, 'payments', paymentId);
      expect(saved).toBeDefined();
      expect(saved.orderId).toBe('order_001');
      expect(saved.amount).toBe(5000);
    });

    test('should store payment with all required fields', async () => {
      const paymentData = {
        id: 'pay_001',
        orderId: 'order_001',
        amount: 10000,
        commission: 1000,
        customerId: 'cust_001',
        technicianId: 'tech_001',
        status: 'completed',
        paymentDate: new Date().toISOString(),
        signature: 'sig_abc123',
      };

      await db.collection('payments').doc(paymentData.id).set(paymentData);

      const saved = await getDoc(firebaseAdmin, 'payments', 'pay_001');
      expect(saved).toHaveProperty('id');
      expect(saved).toHaveProperty('orderId');
      expect(saved).toHaveProperty('amount');
      expect(saved).toHaveProperty('commission');
      expect(saved).toHaveProperty('customerId');
      expect(saved).toHaveProperty('technicianId');
      expect(saved).toHaveProperty('status');
      expect(saved).toHaveProperty('signature');
    });

    test('should create multiple payments', async () => {
      // Create 3 payments
      for (let i = 1; i <= 3; i++) {
        await db.collection('payments').doc(`pay_00${i}`).set({
          id: `pay_00${i}`,
          orderId: `order_00${i}`,
          amount: 5000 * i,
          commission: 500 * i,
          status: 'completed',
        });
      }

      // Query all payments
      const allPayments = await getAllDocs(firebaseAdmin, 'payments');
      expect(allPayments).toHaveLength(3);
    });

    test('should update payment status', async () => {
      const paymentId = 'pay_001';

      // Create initial payment
      await db.collection('payments').doc(paymentId).set({
        id: paymentId,
        status: 'pending',
      });

      // Update status
      await db.collection('payments').doc(paymentId).update({
        status: 'completed',
      });

      // Verify
      const updated = await getDoc(firebaseAdmin, 'payments', paymentId);
      expect(updated.status).toBe('completed');
    });
  });

  describe('Commission Tracking', () => {
    test('should store commission correctly', async () => {
      const amount = 10000;
      const commission = 1000; // 10%

      await db.collection('payments').doc('pay_001').set({
        id: 'pay_001',
        amount,
        commission,
        earnings: amount - commission,
      });

      const payment = await getDoc(firebaseAdmin, 'payments', 'pay_001');
      expect(payment.commission).toBe(1000);
      expect(payment.earnings).toBe(9000);
    });

    test('should query payments by customer', async () => {
      const customerId = 'cust_001';

      // Create payments
      for (let i = 1; i <= 3; i++) {
        await db.collection('payments').doc(`pay_00${i}`).set({
          id: `pay_00${i}`,
          customerId,
          amount: 5000,
        });
      }

      // Create payment for different customer
      await db.collection('payments').doc('pay_999').set({
        id: 'pay_999',
        customerId: 'cust_002',
        amount: 5000,
      });

      // Query customer's payments
      const customerPayments = await queryDocs(firebaseAdmin, 'payments', 'customerId', '==', customerId);
      expect(customerPayments).toHaveLength(3);
      customerPayments.forEach(p => {
        expect(p.customerId).toBe(customerId);
      });
    });
  });

  describe('Technician Earnings', () => {
    test('should calculate total technician earnings', async () => {
      const technicianId = 'tech_001';

      // Create payments
      const payments = [
        { id: 'pay_001', technicianId, amount: 5000, commission: 500 },
        { id: 'pay_002', technicianId, amount: 10000, commission: 1000 },
        { id: 'pay_003', technicianId, amount: 3000, commission: 300 },
      ];

      for (const payment of payments) {
        await db.collection('payments').doc(payment.id).set(payment);
      }

      // Query all technician's payments
      const techPayments = await queryDocs(firebaseAdmin, 'payments', 'technicianId', '==', technicianId);
      const totalEarnings = techPayments.reduce((sum, p) => sum + (p.amount - p.commission), 0);

      expect(techPayments).toHaveLength(3);
      expect(totalEarnings).toBe(16200); // (5000-500) + (10000-1000) + (3000-300)
    });

    test('should update technician balance after payment', async () => {
      const technicianId = 'tech_001';

      // Create user
      await createTestUser(admin, technicianId, {
        id: technicianId,
        balance: 0,
      });

      // Create payment
      const payment = await createTestPayment(admin, 'pay_001', {
        technicianId,
        amount: 5000,
        commission: 500,
      });

      // Update technician balance
      const earnings = payment.amount - payment.commission;
      await db.collection('users').doc(technicianId).update({
        balance: admin.firestore.FieldValue.increment(earnings),
      });

      // Verify
      const user = await getDoc(firebaseAdmin, 'users', technicianId);
      expect(user.balance).toBe(4500);
    });
  });

  describe('Payment Audit Log', () => {
    test('should create audit log entry', async () => {
      const logId = `log_${Date.now()}`;

      await db.collection('payment_logs').doc(logId).set({
        id: logId,
        paymentId: 'pay_001',
        action: 'payment_completed',
        timestamp: new Date().toISOString(),
        details: {
          amount: 5000,
          customerId: 'cust_001',
        },
      });

      const log = await getDoc(firebaseAdmin, 'payment_logs', logId);
      expect(log.action).toBe('payment_completed');
      expect(log.details.amount).toBe(5000);
    });

    test('should query payment logs by action', async () => {
      const action = 'payment_completed';

      // Create logs
      for (let i = 1; i <= 3; i++) {
        await db.collection('payment_logs').doc(`log_00${i}`).set({
          id: `log_00${i}`,
          action,
          timestamp: new Date().toISOString(),
        });
      }

      // Create log with different action
      await db.collection('payment_logs').doc('log_999').set({
        id: 'log_999',
        action: 'payment_failed',
        timestamp: new Date().toISOString(),
      });

      // Query
      const completedLogs = await queryDocs(firebaseAdmin, 'payment_logs', 'action', '==', action);
      expect(completedLogs).toHaveLength(3);
    });
  });

  describe('Data Consistency', () => {
    test('should maintain payment and log consistency', async () => {
      const paymentId = 'pay_001';

      // Create payment
      await db.collection('payments').doc(paymentId).set({
        id: paymentId,
        amount: 5000,
        status: 'pending',
      });

      // Create log
      await db.collection('payment_logs').doc(`log_${paymentId}`).set({
        paymentId,
        action: 'payment_created',
      });

      // Verify both exist
      const payment = await getDoc(firebaseAdmin, 'payments', paymentId);
      const log = await getDoc(firebaseAdmin, 'payment_logs', `log_${paymentId}`);

      expect(payment.id).toBe(paymentId);
      expect(log.paymentId).toBe(paymentId);
    });

    test('should handle concurrent writes', async () => {
      const promises = [];

      // Simulate concurrent payment writes
      for (let i = 1; i <= 5; i++) {
        promises.push(
          db.collection('payments').doc(`pay_00${i}`).set({
            id: `pay_00${i}`,
            amount: 5000 * i,
          })
        );
      }

      await Promise.all(promises);

      const allPayments = await getAllDocs(firebaseAdmin, 'payments');
      expect(allPayments).toHaveLength(5);
    });

    test('should preserve data types', async () => {
      const paymentId = 'pay_001';
      const timestamp = new Date();

      await db.collection('payments').doc(paymentId).set({
        id: paymentId,
        amount: 5000, // number
        status: 'completed', // string
        createdAt: timestamp, // Timestamp
        metadata: { key: 'value' }, // object
        tags: ['tag1', 'tag2'], // array
        isVerified: true, // boolean
      });

      const payment = await getDoc(firebaseAdmin, 'payments', paymentId);

      expect(typeof payment.amount).toBe('number');
      expect(typeof payment.status).toBe('string');
      expect(payment.createdAt).toBeDefined();
      expect(typeof payment.metadata).toBe('object');
      expect(Array.isArray(payment.tags)).toBe(true);
      expect(typeof payment.isVerified).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing document gracefully', async () => {
      const result = await getDoc(firebaseAdmin, 'payments', 'nonexistent_id');
      expect(result).toBeNull();
    });

    test('should handle empty collection query', async () => {
      const allPayments = await getAllDocs(firebaseAdmin, 'payments');
      expect(allPayments).toHaveLength(0);
    });

    test('should handle invalid query parameters', async () => {
      await expect(
        queryDocs(firebaseAdmin, 'payments', 'amount', 'invalid_operator', 5000)
      ).rejects.toThrow();
    });
  });
});
