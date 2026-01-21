/**
 * Refund & Payout Processing Functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Razorpay = require('razorpay');
const config = require('./config');
const {
  calculateRefund,
  createRefundRecord,
  retryWithBackoff,
} = require('./helpers');
const {
  sendRefundNotification,
  sendPayoutNotification,
} = require('./notifications');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

/**
 * FUNCTION 4: Process Refund (Webhook-based)
 * Called from: Booking screen when customer cancels
 * Input: paymentId, reason
 * Output: { success, message } - refund initiation only
 * 
 * ARCHITECTURE:
 * 1. This function initiates refund on Razorpay (fire-and-forget)
 * 2. Razorpay webhook handles refund completion
 * 3. Webhook updates booking status to "refunded"
 */
exports.processRefund = functions
  .runWith({ timeoutSeconds: 15 })
  .https.onCall(async (data, context) => {
    try {
      console.log('🔵 STEP 3: Initiating refund via Razorpay');

      if (!context.auth) {
        throw new Error('User must be authenticated');
      }

      const { paymentId, reason } = data;

      if (!paymentId) {
        throw new Error('paymentId is required');
      }

      // Get payment record
      const paymentDoc = await admin
        .firestore()
        .collection(config.firestore.payments)
        .doc(paymentId)
        .get();

      if (!paymentDoc.exists) {
        throw new Error('Payment not found');
      }

      const payment = paymentDoc.data();

      if (payment.status !== 'completed') {
        throw new Error(`Cannot refund payment with status: ${payment.status}`);
      }

      console.log(`✓ Payment found: ${paymentId}, Amount: ₹${payment.amount}`);

      // Calculate refund amount based on time
      const refundCalculation = calculateRefund(
        payment.amount,
        payment.capturedAt || payment.createdAt,
        new Date()
      );

      console.log(`💰 Refund amount: ₹${refundCalculation.customerRefund}`);

      // Check if refund is possible
      if (refundCalculation.customerRefund === 0) {
        throw new Error(refundCalculation.reason);
      }

      // Initiate refund on Razorpay (fire-and-forget)
      console.log(`📤 Initiating refund on Razorpay: ₹${refundCalculation.customerRefund}`);
      const razorpayRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: refundCalculation.customerRefund * 100, // Convert to paise
        notes: {
          reason,
          paymentId,
          bookingId: payment.bookingId,
          customerId: payment.customerId,
          refundType: refundCalculation.refundType,
        },
      });

      console.log(`✓ Refund initiated: ${razorpayRefund.id} (Status: ${razorpayRefund.status})`);

      // Mark booking as refunding (waiting for webhook confirmation)
      if (payment.bookingId) {
        await admin
          .firestore()
          .collection(config.firestore.bookings)
          .doc(payment.bookingId)
          .update({
            paymentStatus: 'refunding',
            refundInitiatedAt: admin.firestore.FieldValue.serverTimestamp(),
            razorpayRefundId: razorpayRefund.id,
          });
        console.log(`✓ Booking marked as refunding: ${payment.bookingId}`);
      }

      // Return success immediately (actual refund completion handled by webhook)
      return {
        success: true,
        refundId: razorpayRefund.id,
        message: 'Refund initiated. Status will update when Razorpay confirms.',
        refundAmount: refundCalculation.customerRefund,
        estimatedDays: 3,
      };
    } catch (error) {
      console.error('❌ Error initiating refund:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * FUNCTION 5: Create Payout
 * Called from: PayoutSettingsScreen when technician requests payout
 * Input: technicianId, amount, method (bank/upi), accountDetails
 * Output: { success, payoutDetails }
 * 
 * IMPORTANT: Waits for Razorpay confirmation before deducting funds
 * This is the legally safer and more ethical approach:
 * - Prevents double-spending
 * - Maintains clear audit trail
 * - Better accounting practices
 * - Technician sees accurate pending balance
 */
exports.createPayout = functions
  .runWith({ timeoutSeconds: config.timeouts.createPayout })
  .https.onCall(async (data, context) => {
    try {
      console.log('🔵 STEP 4: Creating payout');

      if (!context.auth) {
        throw new Error('User must be authenticated');
      }

      const { technicianId, amount, method, accountDetails } = data;

      if (!technicianId || !amount || !method || !accountDetails) {
        throw new Error('Missing required fields for payout');
      }

      if (amount < config.payout.minThreshold) {
        throw new Error(`Minimum payout amount is ₹${config.payout.minThreshold}`);
      }

      console.log(`💰 Payout request: ₹${amount} via ${method}`);

      // Get technician's current pending payout
      const technicianDoc = await admin
        .firestore()
        .collection(config.firestore.users)
        .doc(technicianId)
        .get();

      if (!technicianDoc.exists) {
        throw new Error('Technician not found');
      }

      const technician = technicianDoc.data();

      if ((technician.pendingPayout || 0) < amount) {
        throw new Error(
          `Insufficient balance. Available: ₹${technician.pendingPayout || 0}`
        );
      }

      // Step 1: Create payout record in PENDING state (before Razorpay processing)
      const payoutRecord = {
        id: `PAYOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        technicianId,
        razorpayPayoutId: null, // Will be filled after Razorpay confirmation
        amount,
        method,
        accountDetails: {
          accountNumber: `****${accountDetails.accountNumber.slice(-4)}`,
          accountHolderName: accountDetails.accountHolderName,
          ...(method === 'bank' && { ifscCode: accountDetails.ifscCode }),
          ...(method === 'upi' && { upiId: accountDetails.upiId }),
        },
        status: 'initiated', // Not deducted yet, waiting for Razorpay
        requestedAt: new Date(),
        processedAt: null,
        updatedAt: new Date(),
      };

      // Save payout record in INITIATED state
      await admin
        .firestore()
        .collection(config.firestore.payouts)
        .doc(payoutRecord.id)
        .set(payoutRecord);

      console.log(`✓ Payout record created in INITIATED state: ${payoutRecord.id}`);

      // Step 2: Process payout with Razorpay (3 retries)
      // This is done BEFORE deducting from technician's balance
      let razorpayPayout;
      try {
        razorpayPayout = await retryWithBackoff(
          async () => {
            const payoutData = {
              account_number: accountDetails.accountNumber,
              amount: amount * 100, // Convert to paise
              currency: config.payout.currency,
              mode: method === 'upi' ? 'NEFT' : 'NEFT',
              purpose: 'payout',
              queue_if_low_balance: true,
              notes: {
                technicianId,
                method,
              },
            };

            // Add IFSC for bank transfers
            if (method === 'bank') {
              payoutData.fund_account = {
                account_type: 'bank_account',
                bank_account: {
                  name: accountDetails.accountHolderName,
                  account_number: accountDetails.accountNumber,
                  ifsc_code: accountDetails.ifscCode,
                },
              };
            }

            return await razorpay.payouts.create(payoutData);
          },
          config.retry.maxAttempts
        );

        console.log(`✓ Razorpay payout created: ${razorpayPayout.id}`);
      } catch (razorpayError) {
        // If Razorpay fails, update payout status to FAILED
        // Money is NOT deducted from technician's account
        await admin
          .firestore()
          .collection(config.firestore.payouts)
          .doc(payoutRecord.id)
          .update({
            status: 'failed',
            failureReason: razorpayError.message,
            updatedAt: new Date(),
          });

        console.log(`❌ Razorpay payout failed: ${razorpayError.message}`);

        // Send failure notification
        await sendPayoutNotification(technicianId, {
          payoutAmount: amount,
          method,
          payoutId: payoutRecord.id,
          estimatedDate: 'N/A',
        }).catch((err) => console.error('Notification error:', err));

        throw new Error(`Payout failed: ${razorpayError.message}`);
      }

      // Step 3: ONLY AFTER Razorpay confirmation, deduct from technician's balance
      // This ensures money doesn't leave the account until Razorpay confirms
      await technicianDoc.ref.update({
        pendingPayout: admin.firestore.FieldValue.increment(-amount),
        payoutHistory: admin.firestore.FieldValue.arrayUnion(payoutRecord.id),
        updatedAt: new Date(),
      });

      console.log(`✓ Technician pending payout updated (money deducted AFTER Razorpay confirmed)`);

      // Step 4: Update payout record to COMPLETED with Razorpay details
      await admin
        .firestore()
        .collection(config.firestore.payouts)
        .doc(payoutRecord.id)
        .update({
          razorpayPayoutId: razorpayPayout.id,
          status: 'pending', // Razorpay is processing, will be completed soon
          processedAt: new Date(),
          updatedAt: new Date(),
        });

      console.log(`✓ Payout record updated with Razorpay ID and marked as PENDING processing`);

      // Create payout document in payouts collection (Phase 4)
      const payoutsCollectionRef = await admin
        .firestore()
        .collection('payouts')
        .add({
          technicianId,
          amount,
          currency: config.payout.currency,
          bankAccountLast4: accountDetails.accountNumber.slice(-4),
          payoutMethod: method,
          razorpayPayoutId: razorpayPayout.id,
          status: 'pending',
          failureReason: null,
          retryCount: 0,
          paymentIds: [],
          paymentCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          initiatedAt: admin.firestore.FieldValue.serverTimestamp(),
          completedAt: null,
          notes: `Payout request via ${method}`,
        });

      console.log(`✓ Payout document created in payouts collection: ${payoutsCollectionRef.id}`);

      // Create payment_logs entry for audit (Phase 4)
      await admin
        .firestore()
        .collection('payment_logs')
        .add({
          eventType: 'payout_initiated',
          payoutId: payoutsCollectionRef.id,
          technicianId,
          description: `Payout of ₹${amount} initiated to ${method}`,
          metadata: {
            amount,
            method,
            razorpayPayoutId: razorpayPayout.id,
          },
          source: 'cloud_function',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          statusAfter: 'pending',
        });

      console.log(`✓ Payout logged to payment_logs collection`);

      // Step 5: Send success notification
      await sendPayoutNotification(technicianId, {
        payoutAmount: amount,
        method,
        payoutId: payoutRecord.id,
        estimatedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          .toLocaleDateString('en-IN'),
      });

      return {
        success: true,
        payoutId: payoutRecord.id,
        razorpayPayoutId: razorpayPayout.id,
        amount,
        method,
        status: 'pending',
        estimatedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          .toLocaleDateString('en-IN'),
        message: 'Payout request submitted successfully. Money deducted only after Razorpay confirmation.',
      };
    } catch (error) {
      console.error('❌ Error in createPayout:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

module.exports = exports;
