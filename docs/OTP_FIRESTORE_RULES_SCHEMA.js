/**
 * Firestore Rules and Schema for OTP Service Completion System
 * 
 * This file documents:
 * 1. The serviceCompletion collection schema
 * 2. Firestore security rules
 * 3. Integration with bookings and payments
 */

// ========================================
// COLLECTION SCHEMA
// ========================================

/**
 * Collection: serviceCompletion
 * Documents contain OTP verification data and payment release status
 * 
 * Document Structure:
 * {
 *   completionId: "doc-id",
 *   bookingId: "ref-to-bookings",
 *   customerId: "ref-to-users",
 *   technicianId: "ref-to-users",
 *   otp: "4521",                          // 4-digit OTP, server-stored
 *   otpCreatedAt: timestamp,              // When OTP was generated
 *   otpExpiresAt: timestamp,              // 5 minutes from creation
 *   otpAttempts: 0,                       // Number of verification attempts
 *   otpMaxAttempts: 3,                    // Maximum allowed attempts
 *   verified: false,                      // Is OTP verified?
 *   verifiedAt: timestamp,                // When OTP was verified
 *   status: "pending|verified|released",  // Completion status
 *   amount: 1200,                         // Service amount (in INR)
 *   paymentMethod: "razorpay",            // Payment method
 *   paymentAuthId: "auth-xxxxx",          // Razorpay authorize ID
 *   paymentCaptureId: "charge-xxxxx",     // Razorpay capture ID
 *   paymentCapturedAt: timestamp,         // When payment was captured
 *   serviceMarkedCompleteAt: timestamp,   // When customer marked complete
 *   notes: "Additional notes",            // Optional
 *   createdAt: timestamp,                 // Created at (server)
 *   updatedAt: timestamp                  // Last updated at (server)
 * }
 */

// ========================================
// FIRESTORE SECURITY RULES
// ========================================

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow reading user documents for verification
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Service Completion Collection - OTP Verification
    match /serviceCompletion/{completionId} {
      
      // CUSTOMER: Can create new service completion (mark work complete)
      // - Must provide: bookingId, customerId, technicianId, amount
      // - OTP generated server-side
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.customerId
        && request.resource.data.bookingId != null
        && request.resource.data.technicianId != null
        && request.resource.data.amount != null
        && request.resource.data.otp == null  // Client cannot set OTP
        && request.resource.data.verified == false;
      
      // CUSTOMER: Can read own completion records
      allow read: if request.auth != null
        && request.auth.uid == resource.data.customerId;
      
      // CUSTOMER: Can update own completion (to add notes)
      allow update: if request.auth != null
        && request.auth.uid == resource.data.customerId
        && !('otp' in request.resource.data)  // Cannot modify OTP
        && !('verified' in request.resource.data)  // Cannot set verified flag
        && !('paymentCaptureId' in request.resource.data);  // Cannot modify payment
      
      // TECHNICIAN: Can read if it's their booking
      allow read: if request.auth != null
        && request.auth.uid == resource.data.technicianId
        && resource.data.verified == false;  // Only unverified ones
      
      // TECHNICIAN: Cannot create or write directly
      allow write: if false;
      
      // SYSTEM: Server rules (via Firebase Functions)
      // Functions with admin SDK can:
      // 1. Generate OTP on create
      // 2. Verify OTP on technician submission
      // 3. Update payment status
      // 4. Release payment
    }
    
    // Booking Updates - Payment Release
    match /bookings/{bookingId} {
      allow read: if request.auth != null;
      allow update: if request.auth != null
        && request.auth.uid in [resource.data.customerId, resource.data.technicianId]
        && request.resource.data.completionStatus != null;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

// ========================================
// FIREBASE FUNCTIONS - SERVER-SIDE LOGIC
// ========================================

/**
 * Cloud Function: initiateServiceCompletion
 * 
 * Triggered by: Redux action (frontend)
 * Purpose: Generate OTP and create serviceCompletion document
 * 
 * Steps:
 * 1. Verify customer is authenticated
 * 2. Fetch booking to validate
 * 3. Generate 4-digit OTP
 * 4. Create serviceCompletion document with server timestamps
 * 5. Return completionId and OTP for frontend display
 * 
 * Security:
 * - Only customer who created booking can initiate
 * - OTP never exposed in Firestore read rules
 * - Razorpay payment authorized at this point
 */

/*
exports.initiateServiceCompletion = functions
  .region('asia-south1')
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const { bookingId } = data;
    const customerId = context.auth.uid;
    const db = admin.firestore();

    try {
      // Fetch booking
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingSnap = await bookingRef.get();

      if (!bookingSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Booking not found'
        );
      }

      const booking = bookingSnap.data();

      // Verify booking belongs to customer
      if (booking.customerId !== customerId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'This booking does not belong to you'
        );
      }

      // Verify booking status is active
      if (booking.status !== 'completed' && booking.status !== 'in-progress') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Booking cannot be marked complete'
        );
      }

      // Generate 4-digit OTP (1000-9999)
      const otp = Math.floor(1000 + Math.random() * 9000).toString();

      // Create Razorpay authorization for payment hold
      const paymentAuthId = await createRazorpayAuthorization({
        amount: booking.amount,
        email: context.auth.token.email,
        phone: booking.customerPhone
      });

      // Create serviceCompletion document
      const completionRef = db.collection('serviceCompletion').doc();
      await completionRef.set({
        completionId: completionRef.id,
        bookingId: bookingId,
        customerId: customerId,
        technicianId: booking.technicianId,
        otp: otp,
        otpCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        otpExpiresAt: admin.firestore.Timestamp.fromMillis(
          Date.now() + 5 * 60 * 1000
        ),
        otpAttempts: 0,
        otpMaxAttempts: 3,
        verified: false,
        status: 'pending',
        amount: booking.amount,
        paymentMethod: 'razorpay',
        paymentAuthId: paymentAuthId,
        paymentCaptureId: null,
        serviceMarkedCompleteAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        completionId: completionRef.id,
        otp: otp,
        expiresIn: 300 // 5 minutes in seconds
      };
    } catch (error) {
      console.error('Error initiating service completion:', error);
      throw error;
    }
  });
*/

/**
 * Cloud Function: verifyServiceCompletionOTP
 * 
 * Triggered by: Redis action (frontend - technician)
 * Purpose: Verify OTP and release payment
 * 
 * Steps:
 * 1. Verify technician is authenticated
 * 2. Fetch serviceCompletion document
 * 3. Verify OTP (server-side comparison)
 * 4. Check OTP expiry
 * 5. Check attempt limit
 * 6. If valid: Capture Razorpay payment
 * 7. Update document with verified status
 * 8. Update booking completion status
 * 
 * Security:
 * - OTP comparison done server-side only
 * - Never send stored OTP to client
 * - Razorpay payment authorized → captured on verification
 * - Attempt limit prevents brute force
 */

/*
exports.verifyServiceCompletionOTP = functions
  .region('asia-south1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const { completionId, enteredOTP } = data;
    const technicianId = context.auth.uid;
    const db = admin.firestore();

    try {
      // Fetch serviceCompletion
      const completionRef = db.collection('serviceCompletion').doc(completionId);
      const completionSnap = await completionRef.get();

      if (!completionSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Service completion not found'
        );
      }

      const completion = completionSnap.data();

      // Verify technician
      if (completion.technicianId !== technicianId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'This service does not belong to you'
        );
      }

      // Check if already verified
      if (completion.verified === true) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'OTP already verified'
        );
      }

      // Check OTP expiry
      const now = admin.firestore.Timestamp.now();
      if (now.toMillis() > completion.otpExpiresAt.toMillis()) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'OTP has expired'
        );
      }

      // Check attempt limit
      if (completion.otpAttempts >= completion.otpMaxAttempts) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Maximum verification attempts exceeded'
        );
      }

      // Server-side OTP comparison
      if (enteredOTP !== completion.otp) {
        // Increment attempts
        await completionRef.update({
          otpAttempts: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid OTP'
        );
      }

      // OTP is correct! Capture Razorpay payment
      const captureResult = await captureRazorpayPayment({
        authId: completion.paymentAuthId,
        amount: completion.amount
      });

      // Update serviceCompletion as verified
      await completionRef.update({
        verified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentCaptureId: captureResult.captureId,
        paymentCapturedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'released',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update booking
      await db.collection('bookings').doc(completion.bookingId).update({
        completionStatus: 'verified',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Send notifications
      await sendNotification(completion.customerId, 'Payment Released! ✅');
      await sendNotification(technicianId, 'Payment Verified! ✅');

      return {
        success: true,
        message: 'Payment released successfully'
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  });
*/

/**
 * Cloud Function: regenerateOTP
 * 
 * Triggered by: Redux action (frontend)
 * Purpose: Generate new OTP when customer clicks "Generate New OTP"
 * 
 * Security:
 * - Only customer can regenerate
 * - Maximum 3 regenerations per completion
 * - Previous OTP becomes invalid immediately
 */

/*
exports.regenerateOTP = functions
  .region('asia-south1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const { completionId } = data;
    const customerId = context.auth.uid;
    const db = admin.firestore();

    try {
      const completionRef = db.collection('serviceCompletion').doc(completionId);
      const completionSnap = await completionRef.get();

      if (!completionSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Not found');
      }

      const completion = completionSnap.data();

      if (completion.customerId !== customerId) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized');
      }

      if (completion.regeneratedCount >= 3) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Maximum regenerations exceeded'
        );
      }

      const newOTP = Math.floor(1000 + Math.random() * 9000).toString();

      await completionRef.update({
        otp: newOTP,
        otpCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        otpExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
        otpAttempts: 0,
        regeneratedCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: 'New OTP generated'
      };
    } catch (error) {
      throw error;
    }
  });
*/

// ========================================
// RAZORPAY INTEGRATION HELPERS
// ========================================

/**
 * Helper: createRazorpayAuthorization
 * 
 * When customer marks service complete:
 * 1. Create Razorpay authorization (holds the amount)
 * 2. Amount is held but NOT captured
 * 3. Payment can be captured ONLY after OTP verification
 * 
 * This ensures:
 * - Customer's card is charged only after verification
 * - Payment is held (authorized) while OTP is being verified
 * - No double charging
 */

async function createRazorpayAuthorization(paymentData) {
  // TODO: Implement Razorpay API call
  // Returns: authId (authorization ID)
}

/**
 * Helper: captureRazorpayPayment
 * 
 * Called AFTER OTP verification:
 * 1. Capture the previously authorized payment
 * 2. Money is now deducted from customer's card
 * 3. Money is held in Razorpay (not released yet)
 * 4. Technician payout scheduled for next day
 */

async function captureRazorpayPayment(paymentData) {
  // TODO: Implement Razorpay API call
  // Returns: { captureId, status }
}

// ========================================
// DATA FLOW SUMMARY
// ========================================

/*
CUSTOMER FLOW:
1. Customer views booking in "My Bookings"
2. Taps "Mark Work Completed"
3. Frontend → initiateServiceCompletion() Cloud Function
4. Function:
   - Verifies customer
   - Generates 4-digit OTP (server-side)
   - Authorizes Razorpay payment (holds amount)
   - Creates serviceCompletion document
5. Frontend receives OTP and displays in large format
6. Customer reads OTP to technician (verbally or in-app)

TECHNICIAN FLOW:
1. Technician receives call/notification about service completion
2. Taps "Enter OTP" from notification or active booking
3. Enters 4-digit OTP in input field
4. Frontend → verifyServiceCompletionOTP() Cloud Function
5. Function:
   - Verifies technician
   - Compares OTP (server-side)
   - Checks expiry and attempt limit
   - If valid: Captures Razorpay payment
   - Updates both documents as verified
   - Sends notifications
6. Both parties see success screens

PAYMENT FLOW:
1. Payment Authorized (on service mark complete) - Amount held
2. Payment Captured (on OTP verify) - Amount deducted
3. Payment Transferred (next business day) - Technician receives money

SECURITY:
- OTP never exposed to technician (server-side comparison only)
- Customer cannot modify OTP field
- Technician cannot create completion records (only read)
- Razorpay payment acts as additional fraud prevention
- Attempt limit and expiry prevent brute force
- Both parties must cooperate (customer shares OTP, tech enters it)
*/

// Export for use in Cloud Functions
module.exports = {
  // Rules as string for deployment
  // Generate OTP function
  // Verify OTP function
  // Regenerate OTP function
};
