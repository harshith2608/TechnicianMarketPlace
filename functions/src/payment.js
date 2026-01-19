/**
 * Payment Processing Functions
 * Core functions for payment handling with Razorpay
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('./config');
const {
  calculateCommission,
  calculateTechnicianEarnings,
  validatePaymentAmount,
  createPaymentRecord,
  generateTransactionId,
  retryWithBackoff,
} = require('./helpers');
const {
  sendPaymentSuccessNotification,
  sendPaymentFailureNotification,
} = require('./notifications');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

/**
 * FUNCTION 1: Process Payment (Create Razorpay Order)
 * Called from: PaymentScreen when user initiates payment
 * Input: amount, description, customerId, technicianId, bookingId
 * Output: { orderId, razorpayOrderId, amount, commission }
 */
exports.processPayment = functions
  .runWith({ timeoutSeconds: config.timeouts.processPayment })
  .https.onCall(async (data, context) => {
    try {
      console.log('🔵 STEP 1: Processing payment request');

      // Verify user is authenticated
      if (!context.auth) {
        throw new Error('User must be authenticated');
      }

      const { amount, description, technicianId, bookingId, customerId } = data;

      // Validate input
      if (!amount || !technicianId || !bookingId) {
        throw new Error('Missing required fields: amount, technicianId, bookingId');
      }

      validatePaymentAmount(amount);

      // Calculate commission
      const commission = calculateCommission(amount);
      const technicianEarnings = calculateTechnicianEarnings(amount);

      console.log(`💰 Payment details: Amount=${amount}, Commission=${commission}, Tech=${technicianEarnings}`);

      // Create Razorpay order
      const razorpayOrder = await retryWithBackoff(async () => {
        return await razorpay.orders.create({
          amount: amount * 100, // Convert to paise
          currency: config.payment.currency,
          receipt: `receipt_${Date.now()}`,
          notes: {
            customerId,
            technicianId,
            bookingId,
            description,
          },
          payment_capture: 0, // Manual capture (we capture after OTP)
        });
      });

      console.log(`✓ Razorpay order created: ${razorpayOrder.id}`);

      // Create payment record in Firestore
      const paymentRecord = createPaymentRecord({
        orderId: generateTransactionId(),
        razorpayOrderId: razorpayOrder.id,
        customerId,
        technicianId,
        bookingId,
        amount,
        description,
        status: 'pending',
      });

      // Save to Firestore
      await admin
        .firestore()
        .collection(config.firestore.payments)
        .doc(paymentRecord.id)
        .set(paymentRecord);

      console.log(`✓ Payment record saved to Firestore: ${paymentRecord.id}`);

      return {
        success: true,
        orderId: paymentRecord.id,
        razorpayOrderId: razorpayOrder.id,
        amount,
        commission,
        technicianEarnings,
        message: 'Order created successfully. Please proceed with payment.',
      };
    } catch (error) {
      console.error('❌ Error in processPayment:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * FUNCTION 2: Capture Payment (After OTP Verification)
 * Called from: App after OTP verification
 * Input: orderId, razorpayPaymentId, razorpaySignature
 * Output: { success, payment details }
 */
exports.capturePayment = functions
  .runWith({ timeoutSeconds: config.timeouts.capturePayment })
  .https.onCall(async (data, context) => {
    try {
      console.log('🟢 STEP 2: Capturing payment after OTP');

      if (!context.auth) {
        throw new Error('User must be authenticated');
      }

      const { orderId, razorpayPaymentId, razorpaySignature } = data;

      if (!orderId || !razorpayPaymentId || !razorpaySignature) {
        throw new Error('Missing required fields for payment capture');
      }

      // Verify signature
      const body = orderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        throw new Error('Invalid payment signature - possible tampering');
      }

      console.log(`✓ Payment signature verified: ${razorpayPaymentId}`);

      // Get payment record from Firestore
      const paymentSnapshot = await admin
        .firestore()
        .collection(config.firestore.payments)
        .where('razorpayOrderId', '==', orderId)
        .limit(1)
        .get();

      if (paymentSnapshot.empty) {
        throw new Error('Payment record not found');
      }

      const paymentDoc = paymentSnapshot.docs[0];
      const payment = paymentDoc.data();

      // Capture the payment from Razorpay
      const capturedPayment = await retryWithBackoff(async () => {
        return await razorpay.payments.capture(
          razorpayPaymentId,
          payment.amount * 100, // Amount in paise
          config.payment.currency
        );
      });

      console.log(`✓ Payment captured: ${razorpayPaymentId}`);

      // Create payments collection document (Phase 4)
      const paymentsCollectionDoc = {
        bookingId: payment.bookingId,
        customerId: payment.customerId,
        technicianId: payment.technicianId,
        serviceAmount: payment.amount,
        commissionAmount: payment.commission,
        platformFee: 0,
        totalAmount: payment.amount,
        razorpayOrderId: orderId,
        razorpayPaymentId,
        razorpaySignature,
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentMethod: capturedPayment.method || 'card',
        notes: payment.description || '',
      };

      const paymentsRef = await admin
        .firestore()
        .collection('payments')
        .add(paymentsCollectionDoc);

      console.log(`✓ Payment document created in payments collection: ${paymentsRef.id}`);

      // Create payment_logs entry for audit (Phase 4)
      await admin
        .firestore()
        .collection('payment_logs')
        .add({
          eventType: 'payment_completed',
          paymentId: paymentsRef.id,
          description: `Payment of ₹${payment.amount} completed successfully`,
          metadata: {
            amount: payment.amount,
            commission: payment.commission,
            razorpayPaymentId,
            razorpayOrderId: orderId,
          },
          source: 'cloud_function',
          userId: payment.customerId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          statusAfter: 'completed',
        });

      console.log(`✓ Payment logged to payment_logs collection`);

      // Update payment status in Firestore
      await paymentDoc.ref.update({
        status: 'completed',
        razorpayPaymentId,
        razorpaySignature,
        capturedAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✓ Payment status updated to completed`);

      // Update booking status to "payment_completed"
      const booking = await admin
        .firestore()
        .collection(config.firestore.bookings)
        .doc(payment.bookingId)
        .get();

      if (booking.exists) {
        await booking.ref.update({
          paymentStatus: 'completed',
          paymentId: paymentDoc.id,
          updatedAt: new Date(),
        });
        console.log(`✓ Booking updated with payment status`);
      }

      // Add commission to technician's earnings
      const technicianRef = admin
        .firestore()
        .collection(config.firestore.users)
        .doc(payment.technicianId);

      await technicianRef.update({
        totalEarnings: admin.firestore.FieldValue.increment(payment.technicianEarnings),
        pendingPayout: admin.firestore.FieldValue.increment(payment.technicianEarnings),
        totalTransactions: admin.firestore.FieldValue.increment(1),
        updatedAt: new Date(),
      });

      console.log(`✓ Technician earnings updated`);

      // Send success notification to customer
      await sendPaymentSuccessNotification(payment.customerId, {
        amount: payment.amount,
        bookingId: payment.bookingId,
        transactionId: paymentDoc.id,
        technicianName: booking.data()?.technicianName || 'Technician',
      });

      return {
        success: true,
        paymentId: paymentDoc.id,
        status: 'completed',
        amount: payment.amount,
        commission: payment.commission,
        technicianEarnings: payment.technicianEarnings,
        message: 'Payment captured successfully',
      };
    } catch (error) {
      console.error('❌ Error in capturePayment:', error);

      // Send failure notification
      const { customerId, amount } = data;
      if (customerId && amount) {
        await sendPaymentFailureNotification(customerId, {
          amount,
          reason: error.message,
          transactionId: null,
        });
      }

      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * FUNCTION 3: Verify Payment (called from app to verify payment was successful)
 * Called from: App to verify payment after capture
 * Input: paymentId
 * Output: { status, details }
 */
exports.verifyPayment = functions
  .runWith({ timeoutSeconds: 15 })
  .https.onCall(async (data, context) => {
    try {
      console.log('🟡 Verifying payment');

      if (!context.auth) {
        throw new Error('User must be authenticated');
      }

      const { paymentId } = data;

      if (!paymentId) {
        throw new Error('paymentId is required');
      }

      // Get payment from Firestore
      const paymentDoc = await admin
        .firestore()
        .collection(config.firestore.payments)
        .doc(paymentId)
        .get();

      if (!paymentDoc.exists) {
        throw new Error('Payment not found');
      }

      const payment = paymentDoc.data();

      return {
        success: true,
        status: payment.status,
        details: {
          id: paymentDoc.id,
          amount: payment.amount,
          commission: payment.commission,
          technicianEarnings: payment.technicianEarnings,
          status: payment.status,
          createdAt: payment.createdAt,
        },
      };
    } catch (error) {
      console.error('❌ Error in verifyPayment:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

module.exports = exports;
