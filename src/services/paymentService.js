/**
 * Payment Service
 * Handles all payment processing, Razorpay integration, and payment logic
 * 
 * Features:
 * - Create payment orders with Razorpay
 * - Process payments with commission calculation (₹200 cap)
 * - Handle refunds with time-based policy
 * - Track payment status
 * - Generate receipts
 */

import axios from 'axios';
import {
    PAYMENT_CONFIG,
    calculateCommission,
    calculateRefund,
    formatCurrency,
    validatePaymentAmount
} from '../utils/paymentConfig';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET;

// Create Razorpay API client
const razorpayAPI = axios.create({
  baseURL: RAZORPAY_API_BASE,
  auth: {
    username: RAZORPAY_KEY_ID,
    password: RAZORPAY_KEY_SECRET,
  },
  timeout: PAYMENT_CONFIG.RAZORPAY_TIMEOUT_MS,
});

/**
 * CREATE PAYMENT ORDER
 * Initiates a payment order with Razorpay (authorize, not capture)
 * 
 * @param {Object} paymentData - Payment details
 * @param {string} paymentData.bookingId - Booking ID
 * @param {string} paymentData.customerId - Customer ID
 * @param {string} paymentData.technicianId - Technician ID
 * @param {number} paymentData.amount - Booking amount in ₹
 * @param {string} paymentData.customerEmail - Customer email
 * @param {string} paymentData.customerPhone - Customer phone
 * @returns {Object} { orderId, amount, currency, timeout }
 */
export const createPaymentOrder = async (paymentData) => {
  try {
    // Validate input
    const validation = validatePaymentAmount(paymentData.amount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const {
      bookingId,
      customerId,
      technicianId,
      amount,
      customerEmail,
      customerPhone,
    } = paymentData;

    // Calculate commission (capped at ₹200)
    const commission = calculateCommission(amount);
    const technicianEarnings = amount - commission;

    // Create Razorpay order
    // Note: bookingId will be added later after booking is created
    const orderResponse = await razorpayAPI.post('/orders', {
      amount: Math.round(amount * 100), // Convert to paise
      currency: PAYMENT_CONFIG.CURRENCY,
      receipt: `booking_pending`,
      payment_capture: 0, // Don't auto-capture (we'll capture after OTP)
      notes: {
        customerId,
        technicianId,
        commission: commission.toString(),
        technicianEarnings: technicianEarnings.toString(),
      },
    });

    if (!orderResponse.data || !orderResponse.data.id) {
      throw new Error('Failed to create Razorpay order');
    }

    return {
      orderId: orderResponse.data.id,
      amount,
      commission,
      technicianEarnings,
      currency: PAYMENT_CONFIG.CURRENCY,
      timeout: PAYMENT_CONFIG.RAZORPAY_TIMEOUT_MS,
      status: PAYMENT_CONFIG.PAYMENT_STATUS.PENDING,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw new Error(`Payment order creation failed: ${error.message}`);
  }
};

/**
 * VERIFY PAYMENT SIGNATURE
 * Verifies that the payment response is genuine from Razorpay
 * 
 * @param {Object} paymentResponse - Response from Razorpay
 * @param {string} paymentResponse.razorpay_order_id - Order ID
 * @param {string} paymentResponse.razorpay_payment_id - Payment ID
 * @param {string} paymentResponse.razorpay_signature - Signature to verify
 * @returns {boolean} True if signature is valid
 */
export const verifyPaymentSignature = (paymentResponse) => {
  try {
    const crypto = require('crypto');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentResponse;

    // Create signature string
    const data = `${razorpay_order_id}|${razorpay_payment_id}`;

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(data)
      .digest('hex');

    // Compare signatures
    return razorpay_signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

/**
 * UPDATE PAYMENT NOTES
 * Updates payment notes in Razorpay with booking ID after booking is created
 * 
 * @param {string} paymentId - Razorpay payment ID
 * @param {Object} notes - Notes object with bookingId and other details
 * @returns {Object} Update response
 */
export const updatePaymentNotes = async (paymentId, notes) => {
  try {
    // Skip for mock payments
    // Mock payments are specifically marked with 'MOCK_' prefix
    if (paymentId && paymentId.includes('MOCK_')) {
      console.log('✓ Skipping notes update for mock payment:', paymentId);
      return { paymentId, notes };
    }

    const updateResponse = await razorpayAPI.patch(
      `/payments/${paymentId}`,
      { notes }
    );

    console.log('✅ Payment notes updated in Razorpay:', { paymentId, notes });

    return {
      paymentId: updateResponse.data.id,
      notes: updateResponse.data.notes,
    };
  } catch (error) {
    console.error('Error updating payment notes:', error);
    // Don't throw - this is non-critical. Booking is already created and linked in Firestore
    return { paymentId, notes, error: error.message };
  }
};

/**
 * CAPTURE PAYMENT
 * Captures an authorized payment (used after OTP verification)
 * For mock payments in testing, bypasses real API call
 * 
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to capture in ₹
 * @returns {Object} Capture response
 */
export const capturePayment = async (paymentId, amount) => {
  try {
    // Check if this is a mock payment (for Expo Go testing)
    // Mock payments are specifically marked with 'MOCK_' prefix
    const isMockPayment = paymentId && paymentId.includes('MOCK_');
    
    if (isMockPayment) {
      return {
        paymentId,
        status: PAYMENT_CONFIG.PAYMENT_STATUS.CAPTURED,
        amount,
        capturedAt: new Date(),
      };
    }

    const captureResponse = await razorpayAPI.post(
      `/payments/${paymentId}/capture`,
      {
        amount: Math.round(amount * 100), // Convert to paise
      }
    );

    if (captureResponse.data.status !== 'captured') {
      throw new Error(`Payment status is ${captureResponse.data.status}, expected 'captured'`);
    }

    return {
      paymentId: captureResponse.data.id,
      status: PAYMENT_CONFIG.PAYMENT_STATUS.CAPTURED,
      amount: captureResponse.data.amount / 100, // Convert back from paise
      capturedAt: new Date(),
    };
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw new Error(`Payment capture failed: ${error.message}`);
  }
};

/**
 * REFUND PAYMENT
 * Processes refund with time-based policy
 * 
 * @param {Object} refundData - Refund details
 * @param {string} refundData.paymentId - Razorpay payment ID
 * @param {number} refundData.amount - Original booking amount
 * @param {Date} refundData.bookingTime - When booking was created
 * @param {Date} refundData.serviceTime - When service is scheduled
 * @param {string} refundData.reason - Reason for cancellation
 * @returns {Object} Refund calculation and status
 */
export const refundPayment = async (refundData) => {
  try {
    const {
      paymentId,
      amount,
      bookingTime,
      serviceTime,
      reason,
    } = refundData;

    const cancellationTime = new Date();

    // Calculate refund based on policy
    const refundCalculation = calculateRefund(
      amount,
      bookingTime,
      serviceTime,
      cancellationTime
    );

    if (!refundCalculation.allowed && refundCalculation.allowed === false) {
      return {
        allowed: false,
        reason: refundCalculation.reason,
      };
    }

    // Process refund via Razorpay
    const refundResponse = await razorpayAPI.post(`/payments/${paymentId}/refund`, {
      amount: Math.round(refundCalculation.customerRefund * 100), // Convert to paise
      notes: {
        reason,
        refundType: refundCalculation.refundType,
        technicianCompensation: refundCalculation.technicianCompensation.toString(),
      },
    });

    if (!refundResponse.data || !refundResponse.data.id) {
      throw new Error('Refund processing failed');
    }

    return {
      ...refundCalculation,
      refundId: refundResponse.data.id,
      status: PAYMENT_CONFIG.REFUND_STATUS.PROCESSING,
      processedAt: new Date(),
      breakdown: {
        originalAmount: amount,
        customerRefund: refundCalculation.customerRefund,
        technicianCompensation: refundCalculation.technicianCompensation,
        platformFee: refundCalculation.platformFee,
      },
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new Error(`Refund processing failed: ${error.message}`);
  }
};

/**
 * FETCH PAYMENT DETAILS
 * Get detailed information about a payment
 * 
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Object} Payment details
 */
export const fetchPaymentDetails = async (paymentId) => {
  try {
    const response = await razorpayAPI.get(`/payments/${paymentId}`);

    return {
      paymentId: response.data.id,
      amount: response.data.amount / 100, // Convert from paise
      status: response.data.status,
      method: response.data.method,
      email: response.data.email,
      phone: response.data.contact,
      createdAt: new Date(response.data.created_at * 1000),
      capturedAt: response.data.captured_at ? new Date(response.data.captured_at * 1000) : null,
      orderId: response.data.order_id,
      notes: response.data.notes,
    };
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
};

/**
 * CREATE PAYOUT
 * Initiate payout to technician
 * 
 * @param {Object} payoutData - Payout details
 * @param {string} payoutData.technicianId - Technician ID
 * @param {number} payoutData.amount - Payout amount in ₹
 * @param {string} payoutData.accountType - 'bank' or 'upi'
 * @param {Object} payoutData.accountDetails - Bank or UPI details
 * @returns {Object} Payout response
 */
export const createPayout = async (payoutData) => {
  try {
    const {
      technicianId,
      amount,
      accountType,
      accountDetails,
      currency = PAYMENT_CONFIG.CURRENCY,
    } = payoutData;

    // Validate amount
    const validation = validatePaymentAmount(amount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check minimum threshold
    if (amount < PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD) {
      throw new Error(
        `Minimum payout amount is ${PAYMENT_CONFIG.CURRENCY_SYMBOL}${PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD}`
      );
    }

    // Prepare account details based on type
    let payoutPayload = {
      account_number: accountDetails.accountNumber,
      fund_account_id: accountDetails.fundAccountId, // Pre-created fund account
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      queue_if_low_balance: true,
      notes: {
        technicianId,
        payoutType: accountType,
      },
    };

    // Create payout
    const payoutResponse = await razorpayAPI.post('/payouts', payoutPayload);

    if (!payoutResponse.data || !payoutResponse.data.id) {
      throw new Error('Payout creation failed');
    }

    return {
      payoutId: payoutResponse.data.id,
      technicianId,
      amount,
      accountType,
      status: PAYMENT_CONFIG.PAYOUT_STATUS.PROCESSING,
      createdAt: new Date(),
      notes: `Payout to ${accountType}`,
    };
  } catch (error) {
    console.error('Error creating payout:', error);
    throw new Error(`Payout creation failed: ${error.message}`);
  }
};

/**
 * GET PAYMENT ANALYTICS
 * Generate analytics for payments
 * 
 * @param {Array} payments - Array of payment records
 * @returns {Object} Analytics data
 */
export const getPaymentAnalytics = (payments) => {
  if (!payments || payments.length === 0) {
    return {
      totalTransactions: 0,
      totalAmount: 0,
      totalCommission: 0,
      averageTransactionValue: 0,
      successRate: 0,
    };
  }

  const totalTransactions = payments.length;
  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCommission = payments.reduce((sum, p) => sum + (p.commission || 0), 0);
  const successfulPayments = payments.filter(p => p.status === PAYMENT_CONFIG.PAYMENT_STATUS.CAPTURED);
  const successRate = (successfulPayments.length / totalTransactions) * 100;

  return {
    totalTransactions,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalCommission: Math.round(totalCommission * 100) / 100,
    averageTransactionValue: Math.round((totalAmount / totalTransactions) * 100) / 100,
    successRate: Math.round(successRate),
    successfulCount: successfulPayments.length,
  };
};

/**
 * GENERATE PAYMENT RECEIPT
 * Creates a receipt for payment
 * 
 * @param {Object} paymentRecord - Payment record from database
 * @returns {Object} Receipt data
 */
export const generatePaymentReceipt = (paymentRecord) => {
  const {
    paymentId,
    bookingId,
    amount,
    commission,
    technicianEarnings,
    customerId,
    technicianId,
    paymentMethod,
    createdAt,
    capturedAt,
  } = paymentRecord;

  return {
    receiptNumber: `RCPT-${bookingId}-${new Date(createdAt).getTime()}`,
    bookingId,
    paymentId,
    date: new Date(capturedAt || createdAt),
    details: {
      bookingAmount: formatCurrency(amount),
      platformCommission: formatCurrency(commission),
      technicianEarnings: formatCurrency(technicianEarnings),
    },
    paymentMethod,
    participants: {
      customer: customerId,
      technician: technicianId,
    },
  };
};

export default {
  createPaymentOrder,
  verifyPaymentSignature,
  capturePayment,
  refundPayment,
  fetchPaymentDetails,
  createPayout,
  getPaymentAnalytics,
  generatePaymentReceipt,
  updatePaymentNotes,
};
