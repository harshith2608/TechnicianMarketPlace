/**
 * Helper Functions for Payment Processing
 * Handles calculations, validation, and utility operations
 */

const config = require('./config');

/**
 * Calculate commission for a payment
 * Commission = min(amount * rate, cap)
 */
function calculateCommission(amount) {
  const commission = amount * config.payment.commissionRate;
  return Math.min(commission, config.payment.commissionCap);
}

/**
 * Calculate technician earnings (amount - commission)
 */
function calculateTechnicianEarnings(amount) {
  const commission = calculateCommission(amount);
  return amount - commission;
}

/**
 * Calculate refund based on time elapsed since payment
 * Returns: { customerRefund, technicianCompensation, platformFee }
 */
function calculateRefund(amount, paymentTime, currentTime) {
  const hoursElapsed = (currentTime.getTime() - paymentTime.getTime()) / (1000 * 60 * 60);
  const commission = calculateCommission(amount);

  // Full refund within 3 hours
  if (hoursElapsed <= config.refund.fullRefundWindowHours) {
    return {
      customerRefund: amount,
      technicianCompensation: 0,
      platformFee: 0,
      refundType: 'FULL',
      reason: `Full refund within ${config.refund.fullRefundWindowHours} hours`,
    };
  }

  // Partial refund (80%) if within 1 hour before service
  // Note: This would need service start time comparison in real implementation
  if (hoursElapsed <= config.refund.fullRefundWindowHours + config.refund.partialRefundWindowHours) {
    const cancellationFee = commission * config.refund.cancellationFeePercent;
    const techShare = cancellationFee * config.refund.technicianFeeShare;
    const platformShare = cancellationFee * config.refund.platformFeeShare;

    return {
      customerRefund: amount * config.refund.refundPercentage,
      technicianCompensation: techShare,
      platformFee: platformShare,
      refundType: 'PARTIAL',
      reason: `80% refund (20% cancellation fee: ${techShare} to tech, ${platformShare} to platform)`,
    };
  }

  // No refund - service in progress or completed
  return {
    customerRefund: 0,
    technicianCompensation: 0,
    platformFee: 0,
    refundType: 'NONE',
    reason: 'No refund - service in progress or completed',
  };
}

/**
 * Validate payment amount
 */
function validatePaymentAmount(amount) {
  if (!amount || typeof amount !== 'number') {
    throw new Error('Invalid amount: must be a number');
  }
  if (amount < config.payment.minPaymentAmount) {
    throw new Error(`Amount must be at least ₹${config.payment.minPaymentAmount}`);
  }
  if (amount > config.payment.maxPaymentAmount) {
    throw new Error(`Amount cannot exceed ₹${config.payment.maxPaymentAmount}`);
  }
  return true;
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  return `₹${amount.toFixed(2)}`;
}

/**
 * Generate transaction ID
 */
function generateTransactionId() {
  return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

/**
 * Generate order ID for Razorpay
 */
function generateOrderId() {
  return `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

/**
 * Create payment object for Firestore
 */
function createPaymentRecord(data) {
  return {
    id: generateTransactionId(),
    orderId: data.orderId,
    razorpayOrderId: data.razorpayOrderId,
    customerId: data.customerId,
    technicianId: data.technicianId,
    bookingId: data.bookingId,
    amount: data.amount,
    commission: calculateCommission(data.amount),
    technicianEarnings: calculateTechnicianEarnings(data.amount),
    currency: config.payment.currency,
    status: data.status || 'pending',
    description: data.description,
    paymentMethod: data.paymentMethod || 'razorpay',
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
    },
  };
}

/**
 * Create refund record for Firestore
 */
function createRefundRecord(paymentId, refundData, calculatedRefund) {
  return {
    id: generateTransactionId(),
    paymentId,
    razorpayRefundId: refundData.razorpayRefundId,
    customerId: refundData.customerId,
    technicianId: refundData.technicianId,
    amount: refundData.amount,
    customerRefund: calculatedRefund.customerRefund,
    technicianCompensation: calculatedRefund.technicianCompensation,
    platformFee: calculatedRefund.platformFee,
    reason: calculatedRefund.reason,
    status: refundData.status || 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create payout record for Firestore
 */
function createPayoutRecord(data) {
  return {
    id: generateTransactionId(),
    technicianId: data.technicianId,
    razorpayPayoutId: data.razorpayPayoutId,
    amount: data.amount,
    method: data.method, // 'bank' or 'upi'
    accountDetails: data.accountDetails,
    status: data.status || 'pending',
    requestedAt: new Date(),
    processedAt: null,
    updatedAt: new Date(),
  };
}

/**
 * Exponential backoff retry logic
 */
async function retryWithBackoff(asyncFn, maxAttempts = config.retry.maxAttempts) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delayMs =
          config.retry.initialDelayMs * Math.pow(config.retry.backoffMultiplier, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms:`, error.message);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

module.exports = {
  calculateCommission,
  calculateTechnicianEarnings,
  calculateRefund,
  validatePaymentAmount,
  formatCurrency,
  generateTransactionId,
  generateOrderId,
  createPaymentRecord,
  createRefundRecord,
  createPayoutRecord,
  retryWithBackoff,
};
