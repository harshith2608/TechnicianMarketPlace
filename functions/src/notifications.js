/**
 * Notification Service
 * Handles Push Notifications for payment events
 * SMS implementation deferred to Phase 6 (see backlog)
 */

const admin = require('firebase-admin');

/**
 * Send payment success notification (Push only)
 */
async function sendPaymentSuccessNotification(
  customerId,
  { amount, bookingId, transactionId, technicianName }
) {
  try {
    // Create notification record in Firestore
    const notification = {
      userId: customerId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Your payment of ₹${amount.toFixed(2)} to ${technicianName} has been processed successfully.`,
      amount,
      transactionId,
      bookingId,
      createdAt: new Date(),
      read: false,
    };

    await admin.firestore().collection('notifications').add(notification);

    // Send Push Notification
    await sendPushNotification(customerId, {
      title: 'Payment Successful ✓',
      body: `₹${amount.toFixed(2)} paid to ${technicianName}`,
      sound: 'default',
    });

    console.log(`✓ Payment success notification sent to ${customerId}`);
    return { success: true, notificationType: 'payment_success' };
  } catch (error) {
    console.error('Error sending payment success notification:', error);
    // Don't throw - notification failure shouldn't block payment
    return { success: false, error: error.message };
  }
}

/**
 * Send payment failure notification (Push only)
 */
async function sendPaymentFailureNotification(customerId, { amount, reason, transactionId }) {
  try {
    const notification = {
      userId: customerId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Your payment of ₹${amount.toFixed(2)} failed. Reason: ${reason}. Please try again.`,
      amount,
      reason,
      transactionId,
      createdAt: new Date(),
      read: false,
    };

    await admin.firestore().collection('notifications').add(notification);

    // Send Push Notification
    await sendPushNotification(customerId, {
      title: 'Payment Failed ✕',
      body: `₹${amount.toFixed(2)} payment failed: ${reason}`,
      sound: 'default',
    });

    console.log(`✓ Payment failure notification sent to ${customerId}`);
    return { success: true, notificationType: 'payment_failed' };
  } catch (error) {
    console.error('Error sending payment failure notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send refund notification (Push only)
 */
async function sendRefundNotification(
  customerId,
  { refundAmount, reason, transactionId, estimatedDate }
) {
  try {
    const notification = {
      userId: customerId,
      type: 'refund_processed',
      title: 'Refund Initiated',
      message: `Refund of ₹${refundAmount.toFixed(2)} initiated. Reason: ${reason}. Expected by ${estimatedDate}.`,
      refundAmount,
      reason,
      transactionId,
      createdAt: new Date(),
      read: false,
    };

    await admin.firestore().collection('notifications').add(notification);

    // Send Push Notification
    await sendPushNotification(customerId, {
      title: 'Refund Initiated ↩',
      body: `₹${refundAmount.toFixed(2)} will be refunded by ${estimatedDate}`,
      sound: 'default',
    });

    console.log(`✓ Refund notification sent to ${customerId}`);
    return { success: true, notificationType: 'refund_processed' };
  } catch (error) {
    console.error('Error sending refund notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send payout notification to technician (Push only)
 */
async function sendPayoutNotification(
  technicianId,
  { payoutAmount, method, estimatedDate, payoutId }
) {
  try {
    const notification = {
      userId: technicianId,
      type: 'payout_processed',
      title: 'Payout Processed',
      message: `Your payout of ₹${payoutAmount.toFixed(2)} via ${method} has been processed. Expected by ${estimatedDate}.`,
      payoutAmount,
      method,
      payoutId,
      createdAt: new Date(),
      read: false,
    };

    await admin.firestore().collection('notifications').add(notification);

    // Send Push Notification
    await sendPushNotification(technicianId, {
      title: 'Payout Processed 💸',
      body: `₹${payoutAmount.toFixed(2)} payout via ${method}. Arriving by ${estimatedDate}`,
      sound: 'default',
    });

    console.log(`✓ Payout notification sent to ${technicianId}`);
    return { success: true, notificationType: 'payout_processed' };
  } catch (error) {
    console.error('Error sending payout notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Push Notification via Firebase Cloud Messaging
 */
async function sendPushNotification(userId, { title, body, sound = 'default' }) {
  try {
    // Get user's FCM tokens from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const fcmTokens = userDoc.data()?.fcmTokens || [];

    if (fcmTokens.length === 0) {
      console.log(`No FCM tokens found for user ${userId}`);
      return { success: false, message: 'No FCM tokens' };
    }

    const message = {
      notification: {
        title,
        body,
      },
      android: {
        priority: 'high',
        notification: {
          sound,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
      },
    };

    // Send to all tokens
    const results = [];
    for (const token of fcmTokens) {
      try {
        const response = await admin.messaging().sendToDevice(token, message);
        results.push(response);
      } catch (error) {
        console.error(`Error sending to token ${token}:`, error);
      }
    }

    console.log(`✓ Push notification sent to ${userId}`);
    return { success: true, results };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPaymentSuccessNotification,
  sendPaymentFailureNotification,
  sendRefundNotification,
  sendPayoutNotification,
  sendPushNotification,
};
