// functions/__tests__/mocks/razorpay.mock.js
/**
 * Razorpay Mock Utilities
 * Provides realistic mock responses for Razorpay API calls
 * Uses CommonJS exports for compatibility with Jest
 */

const mockRazorpayOrder = {
  id: 'order_1Aa00000000001',
  entity: 'order',
  amount: 50000, // ₹500 in paise
  amount_paid: 0,
  amount_due: 50000,
  currency: 'INR',
  receipt: 'receipt_001',
  offer_id: null,
  status: 'created',
  attempts: 0,
  notes: {
    customerId: 'cust_123',
    technicianId: 'tech_123',
    bookingId: 'book_123',
  },
  created_at: Math.floor(Date.now() / 1000),
};

const mockRazorpayPayment = {
  id: 'pay_1Aa00000000001',
  entity: 'payment',
  amount: 50000,
  currency: 'INR',
  status: 'captured',
  method: 'card',
  description: 'Payment for service',
  amount_refunded: 0,
  refund_status: null,
  captured: true,
  card_id: 'card_1Aa00000000001',
  bank: null,
  wallet: null,
  vpa: null,
  email: 'customer@example.com',
  contact: '+919876543210',
  fee: 1180,
  tax: 180,
  error_code: null,
  error_description: null,
  error_source: null,
  error_reason: null,
  acquirer_data: {
    auth_code: '123456',
  },
  notes: {
    customerId: 'cust_123',
  },
  created_at: Math.floor(Date.now() / 1000),
};

const mockRazorpayRefund = {
  id: 'rfnd_1Aa00000000001',
  entity: 'refund',
  payment_id: 'pay_1Aa00000000001',
  amount: 50000,
  currency: 'INR',
  receipt: null,
  status: 'processed',
  speed_processed: 'normal',
  speed_requested: 'normal',
  notes: {
    reason: 'Customer requested',
  },
  created_at: Math.floor(Date.now() / 1000),
};

const mockRazorpayPayout = {
  id: 'pout_1Aa00000000001',
  entity: 'payout',
  fund_account_id: 'fa_1Aa00000000001',
  amount: 45000,
  currency: 'INR',
  narration: 'Payout to technician',
  purpose: 'payout',
  status: 'initiated',
  fees: null,
  tax: null,
  utr: null,
  mode: 'NEFT',
  reference_id: null,
  receipt_number: null,
  notes: {
    technicianId: 'tech_123',
  },
  created_at: Math.floor(Date.now() / 1000),
};

/**
 * Mock Razorpay Order Creation
 */
const createMockRazorpayOrder = (overrides = {}) => ({
  ...mockRazorpayOrder,
  ...overrides,
});

/**
 * Mock Razorpay Payment Capture
 */
const createMockRazorpayPayment = (overrides = {}) => ({
  ...mockRazorpayPayment,
  ...overrides,
});

/**
 * Mock Razorpay Refund
 */
const createMockRazorpayRefund = (overrides = {}) => ({
  ...mockRazorpayRefund,
  ...overrides,
});

/**
 * Mock Razorpay Payout
 */
const createMockRazorpayPayout = (overrides = {}) => ({
  ...mockRazorpayPayout,
  ...overrides,
});

/**
 * Create valid Razorpay signature
 */
const createValidSignature = (orderId, paymentId, secret = 'test-secret') => {
  const crypto = require('crypto');
  const body = orderId + '|' + paymentId;
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
};

/**
 * Test data generators
 */
const generateTestPaymentData = () => ({
  customerId: 'test-customer-' + Date.now(),
  technicianId: 'test-technician-' + Date.now(),
  bookingId: 'test-booking-' + Date.now(),
  amount: 500,
  description: 'Test service payment',
});

const generateTestRefundData = () => ({
  reason: 'Test refund',
  bookingId: 'test-booking-' + Date.now(),
});

const generateTestPayoutData = () => ({
  technicianId: 'test-technician-' + Date.now(),
  amount: 450,
  method: 'bank',
  accountDetails: {
    accountNumber: '9876543210123456',
    accountHolderName: 'Test Technician',
    ifscCode: 'SBIN0001234',
  },
});

// CommonJS exports
module.exports = {
  mockRazorpayOrder,
  mockRazorpayPayment,
  mockRazorpayRefund,
  mockRazorpayPayout,
  createMockRazorpayOrder,
  createMockRazorpayPayment,
  createMockRazorpayRefund,
  createMockRazorpayPayout,
  createValidSignature,
  generateTestPaymentData,
  generateTestRefundData,
  generateTestPayoutData,
};
