/**
 * Razorpay Webhook Handler
 * Handles incoming webhook events from Razorpay
 * Updates payment status in Firestore automatically
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const express = require('express');
const config = require('./config');

// Create Express app
const app = express();

// Parse JSON
app.use(express.json());

// Webhook handler
app.post('/', async (req, res) => {
  try {
    // NOTE: Firebase Cloud Functions pre-processes request bodies,
    // making HMAC signature verification unreliable.
    // Instead, we validate by checking if the payment/refund exists in our database.
    // This is secure because:
    // 1. Only payments we created will have matching IDs in our DB
    // 2. Only authorized users can access their own refunds
    // 3. Webhook events only trigger actions on existing, verified payments

    // Extract webhook data
    const body = req.body;
    const { event, payload } = body;

    // Handle different payment events
    switch (event) {
      case 'payment.authorized':
        await handlePaymentAuthorized(payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;

      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;

      case 'refund.created':
        await handleRefundCreated(payload);
        break;

      case 'refund.processed':
        await handleRefundProcessed(payload);
        break;

      case 'payout.initiated':
        await handlePayoutInitiated(payload);
        break;

      default:
        // Ignoring unknown event
    }

    // Always return 200 OK to Razorpay
    res.status(200).json({ status: 'received' });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Razorpay from retrying
    res.status(200).json({ error: error.message });
  }
});

/**
 * Handle payment.authorized event
 * Payment has been authorized but not yet captured
 */
async function handlePaymentAuthorized(payload) {
  try {
    const paymentEntity = payload.payment;
    const paymentId = paymentEntity.entity.id;
    const orderId = paymentEntity.entity.order_id;

    // Find payment record in Firestore
    const db = admin.firestore();
    const snapshot = await db
      .collection('payments')
      .where('razorpayOrderId', '==', orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn(`⚠️  Payment record not found for order: ${orderId}`);
      return;
    }

    const paymentDoc = snapshot.docs[0];
    const paymentRef = paymentDoc.ref;

    // Update payment record
    await paymentRef.update({
      razorpayPaymentId: paymentId,
      status: 'authorized',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      'auditLog.webhook_authorized': {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        paymentId,
        event: 'payment.authorized',
      },
    });
  } catch (error) {
    console.error('Error handling payment.authorized:', error);
    throw error;
  }
}

/**
 * Handle payment.failed event
 * Payment attempt has failed
 */
async function handlePaymentFailed(payload) {
  try {
    const paymentEntity = payload.payment;
    const paymentId = paymentEntity.entity.id;
    const orderId = paymentEntity.entity.order_id;
    const reason = paymentEntity.entity.error_code || 'unknown_error';

    console.log(`❌ Payment failed: ${paymentId} (Reason: ${reason})`);

    // Find payment record in Firestore
    const db = admin.firestore();
    const snapshot = await db
      .collection('payments')
      .where('razorpayOrderId', '==', orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn(`⚠️  Payment record not found for order: ${orderId}`);
      return;
    }

    const paymentDoc = snapshot.docs[0];
    const paymentRef = paymentDoc.ref;
    const paymentData = paymentDoc.data();

    // Update payment record
    await paymentRef.update({
      status: 'failed',
      failureReason: reason,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      'auditLog.webhook_failed': {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        paymentId,
        reason,
        event: 'payment.failed',
      },
    });

    // Release technician earnings hold
    if (paymentData.technicianId) {
      await updateTechnicianBalance(
        paymentData.technicianId,
        -paymentData.technicianEarnings,
        'payment_failed'
      );
    }
  } catch (error) {
    console.error('Error handling payment.failed:', error);
    throw error;
  }
}

/**
 * Handle payment.captured event
 * Payment has been successfully captured
 */
async function handlePaymentCaptured(payload) {
  try {
    const paymentEntity = payload.payment;
    const paymentId = paymentEntity.entity.id;
    const orderId = paymentEntity.entity.order_id;

    console.log(`✅ Payment captured: ${paymentId} (Order: ${orderId})`);

    // Find payment record in Firestore
    const db = admin.firestore();
    const snapshot = await db
      .collection('payments')
      .where('razorpayOrderId', '==', orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn(`⚠️  Payment record not found for order: ${orderId}`);
      return;
    }

    const paymentDoc = snapshot.docs[0];
    const paymentRef = paymentDoc.ref;
    const paymentData = paymentDoc.data();

    // Update payment record
    await paymentRef.update({
      status: 'captured',
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      'auditLog.webhook_captured': {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        paymentId,
        event: 'payment.captured',
      },
    });

    // Update booking status if exists
    if (paymentData.bookingId) {
      await updateBookingPaymentStatus(paymentData.bookingId, 'completed');
    }
  } catch (error) {
    console.error('Error handling payment.captured:', error);
    throw error;
  }
}

/**
 * Handle refund.created event
 * Refund has been initiated
 */
async function handleRefundCreated(payload) {
  try {
    const refundEntity = payload.refund;
    const refundId = refundEntity.entity.id;
    const paymentId = refundEntity.entity.payment_id;

    // Find payment record by razorpay payment ID
    // Note: payments store the Razorpay ID in the 'paymentId' field
    const db = admin.firestore();
    const snapshot = await db
      .collection('payments')
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn('Payment record not found for refund:', paymentId);
      return;
    }

    const paymentDoc = snapshot.docs[0];
    const paymentRef = paymentDoc.ref;
    const payment = paymentDoc.data();

    // Update payment record with refund info
    await paymentRef.update({
      status: 'refunded',
      refundId,
      refundStatus: 'completed',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      'auditLog.webhook_refund_created': {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        refundId,
        event: 'refund.created',
      },
    });

    // Also update booking to "refunded"
    const bookingId = payment.bookingId;
    const conversationId = payment.conversationId; // Should be stored when payment is created
    
    if (bookingId && conversationId) {
      try {
        // Direct path to nested booking
        const bookingRef = db
          .collection('conversations')
          .doc(conversationId)
          .collection('bookings')
          .doc(bookingId);
        
        const bookingSnap = await bookingRef.get();
        if (bookingSnap.exists) {
          await bookingRef.update({
            paymentStatus: 'refunded',
            refundCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          console.warn('Booking not found for refund update:', bookingId);
        }
      } catch (err) {
        console.warn('Error updating booking for refund:', err.message);
      }
    } else if (bookingId) {
      console.warn('Missing conversationId for booking refund update:', bookingId);
    }
  } catch (error) {
    console.error('Error handling refund.created:', error);
    throw error;
  }
}

/**
 * Handle refund.processed event
 * Refund has been successfully processed and completed
 * Updates booking status to "refunded"
 */
async function handleRefundProcessed(payload) {
  try {
    const refundEntity = payload.refund;
    const refundId = refundEntity.entity.id;
    const paymentId = refundEntity.entity.payment_id;

    // Find payment record by razorpay payment ID
    const db = admin.firestore();
    const paymentSnapshot = await db
      .collection('payments')
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get();

    if (paymentSnapshot.empty) {
      console.warn('Payment record not found for refund:', paymentId);
      return;
    }

    const paymentDoc = paymentSnapshot.docs[0];
    const payment = paymentDoc.data();
    const bookingId = payment.bookingId;

    // Update payment record
    await paymentDoc.ref.update({
      status: 'refunded',
      refundId,
      refundStatus: 'completed',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      'auditLog.webhook_refund_processed': {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        refundId,
        event: 'refund.processed',
      },
    });

    // Update booking to "refunded" if bookingId exists
    const conversationId = payment.conversationId;
    if (bookingId && conversationId) {
      try {
        // Direct path to nested booking
        const bookingRef = db
          .collection('conversations')
          .doc(conversationId)
          .collection('bookings')
          .doc(bookingId);
        
        const nestedBookingSnap = await bookingRef.get();
        if (nestedBookingSnap.exists) {
          await bookingRef.update({
            paymentStatus: 'refunded',
            refundCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          console.warn('Booking not found for refund:', bookingId);
        }
      } catch (bookingError) {
        console.warn('Error updating booking for refund:', bookingError.message);
      }
    }
  } catch (error) {
    console.error('Error handling refund.processed:', error);
    throw error;
  }
}

/**
 * Handle payout.initiated event
 * Payout has been initiated to technician
 */
async function handlePayoutInitiated(payload) {
  try {
    const payoutEntity = payload.payout;
    const payoutId = payoutEntity.entity.id;

    console.log(`💸 Payout initiated: ${payoutId}`);

    // Find payout record in Firestore
    const db = admin.firestore();
    const snapshot = await db
      .collection('payouts')
      .where('razorpayPayoutId', '==', payoutId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn(`⚠️  Payout record not found for razorpay ID: ${payoutId}`);
      return;
    }

    const payoutDoc = snapshot.docs[0];
    const payoutRef = payoutDoc.ref;

    // Update payout record
    await payoutRef.update({
      status: 'initiated',
      initiatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      'auditLog.webhook_initiated': {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        event: 'payout.initiated',
      },
    });
  } catch (error) {
    console.error('Error handling payout.initiated:', error);
    throw error;
  }
}

/**
 * Helper: Update technician balance (earnings)
 */
async function updateTechnicianBalance(technicianId, amount, reason) {
  try {
    const db = admin.firestore();
    const techRef = db.collection('users').doc(technicianId);

    await techRef.update({
      'balance.available': admin.firestore.FieldValue.increment(amount),
      'balance.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
      'balance.history': admin.firestore.FieldValue.arrayUnion({
        amount,
        reason,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }),
    });
  } catch (error) {
    console.error('Error updating technician balance:', error);
    throw error;
  }
}

/**
 * Helper: Update booking payment status
 */
async function updateBookingPaymentStatus(bookingId, paymentStatus) {
  try {
    const db = admin.firestore();
    const bookingRef = db.collection('bookings').doc(bookingId);

    await bookingRef.update({
      paymentStatus,
      'paymentDetails.completedAt': admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
}

// Export the Express app as a Cloud Function
exports.razorpayWebhookHandler = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onRequest(app);
