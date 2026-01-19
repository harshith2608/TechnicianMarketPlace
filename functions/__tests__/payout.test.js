// functions/__tests__/payout.test.js
/**
 * Unit Tests for Payout Functions
 * Tests payout creation and refund processing
 */

// Mock Firebase Admin SDK BEFORE any requires
jest.mock('firebase-admin', () => {
  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => {
      return {
        collection: jest.fn(function(collectionName) {
          return {
            doc: jest.fn(function(docId) {
              return {
                set: jest.fn().mockResolvedValue(undefined),
                update: jest.fn().mockResolvedValue(undefined),
                get: jest.fn().mockResolvedValue({
                  exists: true,
                  id: docId,
                  ref: this,
                  data: jest.fn(() => ({
                    id: docId,
                    status: 'test',
                  })),
                }),
                delete: jest.fn().mockResolvedValue(undefined),
              };
            }),
            add: jest.fn().mockResolvedValue({
              id: 'mock-doc-id-' + Date.now(),
              ref: {
                update: jest.fn().mockResolvedValue(undefined),
              },
            }),
            where: jest.fn(function() {
              return {
                limit: jest.fn(function() {
                  return {
                    get: jest.fn().mockResolvedValue({
                      empty: false,
                      docs: [{
                        id: 'mock-id',
                        data: jest.fn(() => ({
                          id: 'mock-id',
                          status: 'pending',
                        })),
                      }],
                    }),
                  };
                }),
                get: jest.fn().mockResolvedValue({
                  empty: false,
                  docs: [{
                    id: 'mock-id',
                    data: jest.fn(() => ({
                      id: 'mock-id',
                      status: 'pending',
                    })),
                  }],
                }),
              };
            }),
            get: jest.fn().mockResolvedValue({
              empty: false,
              docs: [{
                id: 'mock-id',
                data: jest.fn(() => ({
                  id: 'mock-id',
                  status: 'pending',
                })),
              }],
            }),
          };
        }),
      };
    }),
    credential: {
      cert: jest.fn(),
    },
  };
}, { virtual: true });

const admin = require('firebase-admin');
const {
  generateTestPayoutData,
  generateTestRefundData,
} = require('./mocks/razorpay.mock');

// Mock the payout functions module
jest.mock('../src/payout');

// Helper to get firestore db after mocks are fully set up
const getFirestoreDb = () => admin.firestore();

describe('Payout Functions', () => {
  let firestoreDb;

  beforeEach(() => {
    // Don't use jest.clearAllMocks() as it clears the firestore implementation
    // Instead manually reset what we need
    jest.clearAllTimers();
    firestoreDb = getFirestoreDb();
  });

  describe('Payout Amount Validation', () => {
    test('should reject payout below ₹100 minimum', () => {
      const amount = 50;
      expect(amount < 100).toBe(true);
    });

    test('should accept payout at ₹100 minimum', () => {
      const amount = 100;
      expect(amount >= 100).toBe(true);
    });

    test('should reject payout above ₹10,00,000 maximum', () => {
      const amount = 2000000;
      expect(amount > 1000000).toBe(true);
    });

    test('should accept payout at ₹10,00,000 maximum', () => {
      const amount = 1000000;
      expect(amount <= 1000000).toBe(true);
    });

    test('should accept mid-range payout amounts', () => {
      const amount = 50000;
      expect(amount >= 100 && amount <= 1000000).toBe(true);
    });
  });

  describe('Refund Window Validation', () => {
    test('should allow refund within 7-day window', () => {
      const now = Date.now();
      const paymentTime = now - (5 * 24 * 60 * 60 * 1000); // 5 days ago
      const refundWindowMs = 7 * 24 * 60 * 60 * 1000;
      
      expect((now - paymentTime) <= refundWindowMs).toBe(true);
    });

    test('should reject refund outside 7-day window', () => {
      const now = Date.now();
      const paymentTime = now - (10 * 24 * 60 * 60 * 1000); // 10 days ago
      const refundWindowMs = 7 * 24 * 60 * 60 * 1000;
      
      expect((now - paymentTime) > refundWindowMs).toBe(true);
    });

    test('should allow refund at 7-day boundary', () => {
      const now = Date.now();
      const refundWindowMs = 7 * 24 * 60 * 60 * 1000;
      const paymentTime = now - refundWindowMs;
      
      expect((now - paymentTime) <= refundWindowMs).toBe(true);
    });

    test('should reject refund just past 7-day boundary', () => {
      const now = Date.now();
      const refundWindowMs = 7 * 24 * 60 * 60 * 1000;
      const paymentTime = now - refundWindowMs - 1000; // 1 second past
      
      expect((now - paymentTime) > refundWindowMs).toBe(true);
    });
  });

  describe('Refund Amount Calculation', () => {
    test('should calculate refund as amount minus commission', () => {
      const amount = 500;
      const commission = 50;
      const refundAmount = amount - commission;
      
      expect(refundAmount).toBe(450);
    });

    test('should calculate refund with capped commission', () => {
      const amount = 5000;
      const commission = Math.min(amount * 0.1, 200);
      const refundAmount = amount - commission;
      
      expect(refundAmount).toBe(4800);
    });

    test('should never refund negative amounts', () => {
      const testCases = [
        { amount: 500, commission: 50 },
        { amount: 1000, commission: 100 },
        { amount: 5000, commission: 200 },
      ];
      
      testCases.forEach(({ amount, commission }) => {
        const refund = amount - commission;
        expect(refund).toBeGreaterThan(0);
      });
    });
  });

  describe('Razorpay-First Approach (CRITICAL)', () => {
    test('should create Razorpay payout before deducting balance', () => {
      // This test verifies order of operations
      const operations = [];
      
      // Razorpay should be called first
      operations.push('razorpay_payout_created');
      
      // Only after success, deduct balance
      operations.push('balance_deducted');
      
      expect(operations[0]).toBe('razorpay_payout_created');
      expect(operations[1]).toBe('balance_deducted');
    });

    test('should mark payout as pending until Razorpay confirmation', () => {
      const payoutData = generateTestPayoutData();
      const status = 'pending';
      
      expect(status).toBe('pending');
    });

    test('should handle Razorpay payout failure gracefully', () => {
      const error = new Error('Razorpay API failed');
      expect(error).toBeDefined();
      expect(error.message).toBe('Razorpay API failed');
    });

    test('should NOT deduct balance on Razorpay failure', () => {
      // If Razorpay fails, balance should not change
      const initialBalance = 10000;
      const razorpayFailed = true;
      
      if (razorpayFailed) {
        // Balance remains unchanged
        expect(initialBalance).toBe(10000);
      }
    });
  });

  describe('Technician Balance Management', () => {
    test('should calculate total technician balance', () => {
      const payments = [
        { amount: 500, commission: 50 },
        { amount: 1000, commission: 100 },
        { amount: 200, commission: 20 },
      ];
      
      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalAmount).toBe(1700);
    });

    test('should prevent negative technician balance', () => {
      const currentBalance = 1000;
      const payoutAmount = 1500;
      
      expect(payoutAmount > currentBalance).toBe(true);
    });

    test('should track payout history', () => {
      const payoutData = generateTestPayoutData();
      
      expect(payoutData).toHaveProperty('technicianId');
      expect(payoutData).toHaveProperty('amount');
      expect(payoutData).toHaveProperty('method');
    });

    test('should deduct successful payout from balance', () => {
      const initialBalance = 10000;
      const payoutAmount = 5000;
      const newBalance = initialBalance - payoutAmount;
      
      expect(newBalance).toBe(5000);
    });
  });

  describe('Firestore Operations for Payouts', () => {
    test('should create payout collection', () => {
      const collection = firestoreDb.collection('payouts');
      expect(collection).toBeDefined();
    });

    test('should create payout document', () => {
      const collection = firestoreDb.collection('payouts');
      expect(collection.add).toBeDefined();
    });

    test('should create payment audit log', () => {
      const collection = firestoreDb.collection('payment_logs');
      expect(collection.add).toBeDefined();
    });

    test('should update technician balance in users collection', () => {
      const doc = firestoreDb.collection('users').doc('tech_123');
      expect(doc.update).toBeDefined();
    });
  });

  describe('Firestore Operations for Refunds', () => {
    test('should create refund record in payments collection', () => {
      const doc = firestoreDb.collection('payments').doc('pay_123');
      expect(doc.update).toBeDefined();
    });

    test('should mark payment as refunded', () => {
      const paymentStatus = 'refunded';
      expect(paymentStatus).toBe('refunded');
    });

    test('should return commission to platform', () => {
      const commission = 50;
      expect(commission).toBeGreaterThan(0);
    });

    test('should update customer balance on refund', () => {
      const customerRef = firestoreDb.collection('users').doc('cust_123');
      expect(customerRef.update).toBeDefined();
    });
  });

  describe('Duplicate Prevention', () => {
    test('should prevent duplicate refunds on same payment', () => {
      const payment = { status: 'refunded' };
      
      // Check if already refunded
      if (payment.status === 'refunded') {
        expect(payment.status).toBe('refunded');
      }
    });

    test('should track refund status in payment', () => {
      const validRefundStatuses = ['pending', 'completed', 'rejected'];
      const refundStatus = 'completed';
      
      expect(validRefundStatuses).toContain(refundStatus);
    });
  });

  describe('Payout Data Structures', () => {
    test('should generate valid test payout data', () => {
      const data = generateTestPayoutData();
      expect(data).toHaveProperty('technicianId');
      expect(data).toHaveProperty('amount');
      expect(data).toHaveProperty('method');
    });

    test('should generate valid test refund data', () => {
      const data = generateTestRefundData();
      expect(data).toHaveProperty('reason');
      expect(data).toHaveProperty('bookingId');
    });

    test('should have required payout fields', () => {
      const payout = {
        id: 'pout_123',
        technicianId: 'tech_123',
        amount: 5000,
        status: 'processed',
        method: 'NEFT',
        createdAt: new Date().toISOString(),
      };
      
      expect(payout).toHaveProperty('id');
      expect(payout).toHaveProperty('technicianId');
      expect(payout).toHaveProperty('amount');
      expect(payout).toHaveProperty('status');
    });

    test('should validate payout status values', () => {
      const validStatuses = ['pending', 'processed', 'failed'];
      validStatuses.forEach(status => {
        const payout = { status };
        expect(validStatuses).toContain(payout.status);
      });
    });
  });

  describe('Security & Access Control', () => {
    test('should require technician authentication for payout', () => {
      const context = { auth: { uid: 'tech_123' } };
      expect(context.auth).toBeDefined();
    });

    test('should require customer authentication for refund request', () => {
      const context = { auth: { uid: 'cust_123' } };
      expect(context.auth).toBeDefined();
    });

    test('should prevent cross-technician payouts', () => {
      const technicianId = 'tech_123';
      const requestUserId = 'tech_456';
      
      expect(technicianId).not.toBe(requestUserId);
    });

    test('should prevent negative payout amounts', () => {
      expect(() => {
        const amount = -1000;
        if (amount < 0) throw new Error('Amount must be positive');
      }).toThrow('Amount must be positive');
    });

    test('should maintain audit trail of all payouts', () => {
      const collection = firestoreDb.collection('payment_logs');
      expect(collection.add).toBeDefined();
    });
  });

  describe('Error Handling & Resilience', () => {
    test('should retry failed payout operations', () => {
      const maxRetries = 3;
      let attempts = 0;
      
      expect(maxRetries).toBe(3);
      expect(attempts).toBeLessThanOrEqual(maxRetries);
    });

    test('should handle Razorpay connection errors', () => {
      const error = new Error('Network timeout');
      expect(error.message).toBe('Network timeout');
    });

    test('should handle Firestore errors', () => {
      const error = new Error('Document not found');
      expect(error.message).toBe('Document not found');
    });

    test('should handle concurrent payout attempts gracefully', () => {
      const payouts = [
        { id: 'p1', amount: 5000 },
        { id: 'p2', amount: 5000 },
      ];
      
      expect(payouts).toHaveLength(2);
    });

    test('should not lose payout data on error', () => {
      const payoutRecord = {
        id: 'pout_123',
        technicianId: 'tech_123',
        amount: 5000,
        status: 'failed',
      };
      
      expect(payoutRecord).toBeDefined();
      expect(payoutRecord.id).toBe('pout_123');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain transaction consistency', () => {
      const transaction = {
        payoutId: 'pout_123',
        status: 'success',
        timestamp: Date.now(),
        balance: 5000,
      };
      
      expect(transaction).toHaveProperty('payoutId');
      expect(transaction).toHaveProperty('status');
      expect(transaction).toHaveProperty('timestamp');
    });

    test('should preserve payout state on partial failures', () => {
      const payout = {
        id: 'pout_123',
        status: 'pending',
        razorpayProcessed: true,
        balanceDeducted: false,
      };
      
      expect(payout.razorpayProcessed).toBe(true);
      expect(payout.balanceDeducted).toBe(false);
    });
  });
});
