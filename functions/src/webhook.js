/**
 * Razorpay Webhook Handler
 * Handles incoming webhook events from Razorpay
 * Updates payment status in Firestore automatically
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const config = require('./config');

/**
 * WEBHOOK: Handle Razorpay Payment Events
 * Listens for payment.authorized, payment.failed, payment.captured events
 * Called by: Razorpay Webhook (when payment status changes)
 * Updates Firestore payment record automatically
 */
exports.razorpayWebhookHandler = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    try {
      // Only accept POST requests
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      console.log('🔔 Razorpay webhook received');

      // Verify webhook signature
      const webhookSecret = config.razorpay.webhookSecret;
      if (!webhookSecret) {
        console.error('❌ Webhook secret not configured');
        return res.status(400).json({ error: 'Webhook not configured' });
      }

      const signature = req.headers['x-razorpay-signature'];
      if (!signature) {
        console.error('❌ Missing webhook signature header');
        return res.status(400).json({ error: 'Missing signature' });
      }

      // Verify signature
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      console.log('✓ Webhook signature verified');

      // Extract webhook data
      const { event, payload } = req.body;
      console.log(`📋 Webhook event: ${event}`);

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

        case 'payout.initiated':
          await handlePayoutInitiated(payload);
          break;

        default:
          console.log(`⏭️  Ignoring event: ${event}`);
      }

      // Always return 200 OK to Razorpay
      res.status(200).json({ status: 'received' });
    } catch (error) {
      console.error('❌ Webhook error:', error);
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

    console.log(`💳 Payment authorized: ${paymentId} (Order: ${orderId})`);

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

    console.log(`✓ Updated payment record to authorized: ${paymentDoc.id}`);
  } catch (error) {
    console.error('❌ Error handling payment.authorized:', error);
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

    console.log(`✓ Updated payment record to failed: ${paymentDoc.id}`);
  } catch (error) {
    console.error('❌ Error handling payment.failed:', error);
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

    console.log(`✓ Updated payment record to captured: ${paymentDoc.id}`);
  } catch (error) {
    console.error('❌ Error handling payment.captured:', error);
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

    console.log(`↩️  Refund created: ${refundId} (Payment: ${paymentId})`);

    // Find payment record by razorpay payment ID
    const db = admin.firestore();
    const snapshot = await db
      .collection('payments')
      .where('razorpayPaymentId', '==', paymentId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn(`⚠️  Payment record not found for razorpay ID: ${paymentId}`);
      return;
    }

    const paymentDoc = snapshot.docs[0];
    const paymentRef = paymentDoc.ref;

    // Update payment record with refund info
    await paymentRef.update({
      refundId,
      refundStatus: 'initiated',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      'auditLog.webhook_refund_created': {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        refundId,
        event: 'refund.created',
      },
    });

    console.log(`✓ Updated payment record with refund: ${paymentDoc.id}`);
  } catch (error) {
    console.error('❌ Error handling refund.created:', error);
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

    console.log(`✓ Updated payout record to initiated: ${payoutDoc.id}`);
  } catch (error) {
    console.error('❌ Error handling payout.initiated:', error);
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

    console.log(`✓ Updated technician balance: ${technicianId} (+${amount})`);
  } catch (error) {
    console.error('❌ Error updating technician balance:', error);
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

    console.log(`✓ Updated booking payment status: ${bookingId} → ${paymentStatus}`);
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    throw error;
  }
}
