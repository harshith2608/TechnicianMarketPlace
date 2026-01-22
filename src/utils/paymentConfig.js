/**
 * Payment Configuration
 * Centralized payment settings for FixBolt
 * 
 * Commission: 10% with ₹200 cap per transaction
 * Refund Policy: Time-based with partial fees
 * Payout: Weekly for technicians
 */

// Load Razorpay key from environment
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

export const PAYMENT_CONFIG = {
  // ====== RAZORPAY API KEY ======
  RAZORPAY_KEY_ID,
  // ====== COMMISSION SETTINGS ======
  // Commission calculation: min(10% of booking, ₹200)
  COMMISSION_RATE: 0.10, // 10%
  COMMISSION_CAP: 200, // Maximum ₹200 per transaction
  
  // ====== PAYOUT SETTINGS ======
  MIN_PAYOUT_THRESHOLD: 500, // ₹500 minimum balance to request payout
  PAYOUT_FREQUENCY: 'weekly', // Weekly automatic payouts
  
  // ====== REFUND POLICY (TIME-BASED) ======
  REFUND_POLICY: {
    // Full refund: 0-4 hours after booking
    FULL_REFUND_WINDOW_HOURS: 4,
    FULL_REFUND_PERCENT: 1.0, // 100%
    
    // Partial refund: 4 hours to 1 hour before service
    // 80% to customer, 20% cancellation fee split 50/50
    PARTIAL_REFUND_WINDOW_HOURS: 1, // 1 hour before service
    PARTIAL_REFUND_PERCENT: 0.80, // 80% to customer
    CANCELLATION_FEE_PERCENT: 0.20, // 20% cancellation fee total
    
    // Split of cancellation fee (20% total)
    TECHNICIAN_FEE_SHARE: 0.50, // 50% of cancellation fee to technician (10% of booking)
    PLATFORM_FEE_SHARE: 0.50, // 50% of cancellation fee to platform (10% of booking)
  },
  
  // ====== CURRENCY & FORMATTING ======
  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',
  DECIMAL_PLACES: 2,
  
  // ====== RAZORPAY ======
  RAZORPAY_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes for payment completion
  RAZORPAY_WEBHOOK_TIMEOUT_MS: 30 * 1000, // 30 seconds for webhook processing
  
  // ====== PAYMENT STATUS ======
  PAYMENT_STATUS: {
    PENDING: 'pending', // Awaiting payment initiation
    AUTHORIZED: 'authorized', // Payment authorized, not captured
    CAPTURED: 'captured', // Payment captured successfully
    FAILED: 'failed', // Payment failed
    REFUNDED: 'refunded', // Payment refunded
    PARTIALLY_REFUNDED: 'partially_refunded', // Partial refund issued
  },
  
  // ====== REFUND STATUS ======
  REFUND_STATUS: {
    PENDING: 'pending', // Refund initiated, awaiting processing
    PROCESSING: 'processing', // Refund being processed
    COMPLETED: 'completed', // Refund completed
    FAILED: 'failed', // Refund failed
  },
  
  // ====== PAYOUT STATUS ======
  PAYOUT_STATUS: {
    PENDING: 'pending', // Awaiting payout processing
    PROCESSING: 'processing', // Payout in progress
    COMPLETED: 'completed', // Payout completed
    FAILED: 'failed', // Payout failed
    CANCELLED: 'cancelled', // Payout cancelled
  },
  
  // ====== BOOKING STATUS ====== 
  BOOKING_STATUS: {
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },
  
  // ====== ERROR MESSAGES ======
  ERRORS: {
    INSUFFICIENT_BALANCE: 'Insufficient balance in wallet',
    PAYMENT_FAILED: 'Payment processing failed. Please try again.',
    REFUND_FAILED: 'Refund could not be processed',
    PAYOUT_FAILED: 'Payout could not be processed',
    INVALID_AMOUNT: 'Invalid payment amount',
    TIMEOUT: 'Payment processing timeout. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
  },
  
  // ====== SETTINGS FOR OTP + PAYMENT FLOW ======
  OTP_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes OTP validity
  OTP_MAX_ATTEMPTS: 3, // Maximum 3 OTP attempts
  
  // ====== FEATURE FLAGS ======
  FEATURES: {
    ENABLE_PAYMENT: true,
    ENABLE_REFUNDS: true,
    ENABLE_PAYOUTS: true,
    ENABLE_WALLET: false, // Future: prepaid wallet
    ENABLE_SUBSCRIPTIONS: false, // Future: subscription plans
  },
};

/**
 * COMMISSION CALCULATION HELPER
 * Returns platform commission with ₹200 cap
 * 
 * @param {number} bookingAmount - Total booking amount
 * @returns {number} Commission amount (capped at ₹200)
 * 
 * Examples:
 * - ₹1000 booking → 10% = ₹100 ✓
 * - ₹3000 booking → 10% = ₹300 → ₹200 (capped) ✓
 * - ₹5000 booking → 10% = ₹500 → ₹200 (capped) ✓
 */
export const calculateCommission = (bookingAmount) => {
  const commission = bookingAmount * PAYMENT_CONFIG.COMMISSION_RATE;
  return Math.min(commission, PAYMENT_CONFIG.COMMISSION_CAP);
};

/**
 * TECHNICIAN EARNINGS CALCULATION
 * Total amount technician receives
 * 
 * @param {number} bookingAmount - Total booking amount
 * @returns {number} Amount technician receives
 */
export const calculateTechnicianEarnings = (bookingAmount) => {
  const commission = calculateCommission(bookingAmount);
  return bookingAmount - commission;
};

/**
 * REFUND CALCULATION
 * Based on time from booking to cancellation
 * 
 * @param {number} bookingAmount - Total booking amount
 * @param {Date} bookingTime - When booking was created
 * @param {Date} serviceTime - When service is scheduled
 * @param {Date} cancellationTime - When cancellation is requested
 * @returns {Object} { customerRefund, technicianCompensation, platformFee }
 * 
 * Rules:
 * - 0-3 hours: 100% to customer
 * - 3 hours to 1 hour before: 80% to customer, 20% split (10% tech, 10% platform)
 * - < 1 hour before: Cannot cancel (or full fee applies)
 */
export const calculateRefund = (bookingAmount, bookingTime, serviceTime, cancellationTime) => {
  const hoursAfterBooking = (cancellationTime - bookingTime) / (1000 * 60 * 60);
  const hoursBeforeService = (serviceTime - cancellationTime) / (1000 * 60 * 60);
  
  // Scenario 1: Within 3 hours of booking - FULL REFUND
  if (hoursAfterBooking <= PAYMENT_CONFIG.REFUND_POLICY.FULL_REFUND_WINDOW_HOURS) {
    return {
      customerRefund: bookingAmount,
      technicianCompensation: 0,
      platformFee: 0,
      refundType: 'FULL',
      reason: 'Within 3-hour full refund window'
    };
  }
  
  // Scenario 2: 3+ hours but >= 1 hour before service - PARTIAL REFUND
  if (hoursBeforeService >= PAYMENT_CONFIG.REFUND_POLICY.PARTIAL_REFUND_WINDOW_HOURS) {
    const cancellationFee = bookingAmount * PAYMENT_CONFIG.REFUND_POLICY.CANCELLATION_FEE_PERCENT;
    const technicianShare = cancellationFee * PAYMENT_CONFIG.REFUND_POLICY.TECHNICIAN_FEE_SHARE;
    const platformShare = cancellationFee * PAYMENT_CONFIG.REFUND_POLICY.PLATFORM_FEE_SHARE;
    const customerRefund = bookingAmount * PAYMENT_CONFIG.REFUND_POLICY.PARTIAL_REFUND_PERCENT;
    
    return {
      customerRefund: Math.round(customerRefund * 100) / 100,
      technicianCompensation: Math.round(technicianShare * 100) / 100,
      platformFee: Math.round(platformShare * 100) / 100,
      refundType: 'PARTIAL',
      cancellationFeePercent: PAYMENT_CONFIG.REFUND_POLICY.CANCELLATION_FEE_PERCENT * 100,
      reason: 'Partial refund with cancellation fee'
    };
  }
  
  // Scenario 3: < 1 hour before service - NO CANCELLATION ALLOWED
  return {
    allowed: false,
    reason: 'Cannot cancel within 1 hour of service start'
  };
};

/**
 * PAYMENT BREAKDOWN HELPER
 * Shows how much goes to each party
 * 
 * @param {number} bookingAmount - Total booking amount
 * @returns {Object} Breakdown of payment distribution
 */
export const getPaymentBreakdown = (bookingAmount) => {
  const commission = calculateCommission(bookingAmount);
  const technicianEarnings = calculateTechnicianEarnings(bookingAmount);
  
  return {
    bookingAmount,
    commission,
    technicianEarnings,
    breakdown: {
      customer_pays: bookingAmount,
      platform_keeps: commission,
      technician_receives: technicianEarnings,
    }
  };
};

/**
 * FORMAT AMOUNT FOR DISPLAY
 * Converts number to formatted currency string
 * 
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount (e.g., "₹1,000.00")
 */
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0.00';
  return `${PAYMENT_CONFIG.CURRENCY_SYMBOL}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: PAYMENT_CONFIG.DECIMAL_PLACES,
    maximumFractionDigits: PAYMENT_CONFIG.DECIMAL_PLACES,
  })}`;
};

/**
 * VALIDATE PAYMENT AMOUNT
 * Ensures amount is valid for payment
 * 
 * @param {number} amount - Amount to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validatePaymentAmount = (amount) => {
  if (!amount || amount <= 0) {
    return { valid: false, error: PAYMENT_CONFIG.ERRORS.INVALID_AMOUNT };
  }
  
  if (amount > 10000000) { // ₹1 crore limit
    return { valid: false, error: 'Amount exceeds maximum limit (₹1 crore)' };
  }
  
  if (!Number.isFinite(amount)) {
    return { valid: false, error: PAYMENT_CONFIG.ERRORS.INVALID_AMOUNT };
  }
  
  return { valid: true };
};

export default PAYMENT_CONFIG;
