/**
 * Firebase Cloud Functions Configuration
 * Centralized configuration for all payment processing functions
 * 
 * ⚠️ IMPORTANT: Razorpay credentials must be set via environment variables!
 * See /functions/.env.example for setup instructions.
 * 
 * These credentials are required in Firebase Cloud Functions for refunds to work.
 * If they're not set, the refund API calls will fail with authentication errors.
 */

module.exports = {
  // Razorpay Configuration
  // ⚠️ CRITICAL: Must be set in .env file for deployment
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5Qwfrbq71Ub9s',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret',
  },

  // Payment Configuration
  payment: {
    commissionRate: 0.10, // 10%
    commissionCap: 200, // ₹200 max
    minPaymentAmount: 100, // Minimum payment
    maxPaymentAmount: 100000, // Maximum payment
    currency: 'INR',
  },

  // Refund Configuration
  refund: {
    fullRefundWindowHours: 4, // 100% refund within 4 hours
    partialRefundWindowHours: 1, // 80% refund within 1 hour before service
    refundPercentage: 0.80, // 80% after window
    cancellationFeePercent: 0.20, // 20% fee split
    technicianFeeShare: 0.50, // 50% goes to tech
    platformFeeShare: 0.50, // 50% goes to platform
  },

  // Payout Configuration
  payout: {
    minThreshold: 500, // ₹500 minimum
    frequency: 'weekly', // Weekly payouts
    currency: 'INR',
  },

  // Retry Configuration
  retry: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
  },

  // Notification Configuration
  notification: {
    smsProvider: 'twilio', // Deferred to Phase 6
    enableSMS: false, // Push notifications only for now
    enablePush: true,
  },

  // Database Collections
  firestore: {
    payments: 'payments',
    refunds: 'refunds',
    payouts: 'payouts',
    bookings: 'bookings',
    users: 'users',
    transactions: 'transactions',
    notifications: 'notifications',
  },

  // Function Timeouts
  timeouts: {
    processPayment: 30, // seconds
    capturePayment: 30,
    refundPayment: 45,
    createPayout: 45,
  },
};
