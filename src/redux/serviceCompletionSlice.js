/**
 * Redux Slice for Service Completion & OTP Verification
 * Manages state for marking services complete and verifying payment via OTP
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { generateOTP, validateOTP } from '../utils/otpService';

/**
 * Initiate service completion - Generate OTP and create completion record
 */
export const initiateServiceCompletion = createAsyncThunk(
  'serviceCompletion/initiate',
  async ({ bookingId, conversationId, paymentId, razorpaySignature, customerId, technicianId }, { rejectWithValue }) => {
    try {
      // Generate 4-digit OTP
      const otp = generateOTP();

      // Store completion record under booking's completion subcollection
      // This path: conversations/{conversationId}/bookings/{bookingId}/completion/{completionId}
      const completionRef = doc(
        collection(
          db,
          'conversations',
          conversationId,
          'bookings',
          bookingId,
          'completion'
        )
      );
      const completionId = completionRef.id;

      // Build completion data - exclude undefined fields
      const completionData = {
        completionId,
        bookingId,
        customerId,
        technicianId,
        otp,
        otpCreatedAt: serverTimestamp(),
        otpAttempts: 0,
        otpVerified: false,
        otpVerifiedAt: null,
        status: 'pending_otp',
        paymentReleaseStatus: 'pending',
        createdAt: serverTimestamp()
      };

      // Only add payment info if it exists
      if (paymentId) {
        completionData.paymentId = paymentId;
      }
      if (razorpaySignature) {
        completionData.razorpaySignature = razorpaySignature;
      }

      await setDoc(completionRef, completionData);

      return {
        completionId,
        otp,
        bookingId,
        conversationId,
        paymentId: paymentId || null,
        customerId,
        technicianId
      };
    } catch (error) {
      console.error('Error initiating service completion:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Verify OTP and release payment
 */
export const verifyServiceCompletionOTP = createAsyncThunk(
  'serviceCompletion/verify',
  async ({ completionId, conversationId, bookingId, enteredOTP }, { rejectWithValue }) => {
    try {
      // Get completion document from nested path
      const completionRef = doc(
        db,
        'conversations',
        conversationId,
        'bookings',
        bookingId,
        'completion',
        completionId
      );
      const completionSnap = await getDoc(completionRef);

      if (!completionSnap.exists()) {
        return rejectWithValue('Service completion not found');
      }

      const completion = completionSnap.data();

      // Check if already verified
      if (completion.status === 'verified') {
        return rejectWithValue('Service already verified');
      }

      // Check attempts
      if (completion.otpAttempts >= 3) {
        return rejectWithValue('Maximum OTP attempts exceeded');
      }

      // Verify OTP - ensure both are strings and trimmed
      const cleanedEnteredOTP = String(enteredOTP).trim();
      const cleanedStoredOTP = String(completion.otp).trim();
      if (!validateOTP(cleanedEnteredOTP, cleanedStoredOTP)) {
        // Increment attempts
        await updateDoc(completionRef, {
          otpAttempts: completion.otpAttempts + 1
        });
        return rejectWithValue('Invalid OTP');
      }

      // OTP verified! Update status in completion record
      await updateDoc(completionRef, {
        otpVerified: true,
        otpVerifiedAt: serverTimestamp(),
        status: 'verified',
        paymentReleaseStatus: 'released'
      });

      // Also update the booking status to 'completed'
      const bookingRef = doc(
        db,
        'conversations',
        conversationId,
        'bookings',
        bookingId
      );
      await updateDoc(bookingRef, {
        status: 'completed'
      });

      // Now capture the payment and update technician earnings
      // The completion document should have paymentId and razorpaySignature stored
      if (completion.paymentId && completion.paymentId.startsWith('pay_')) {
        // Only attempt capture if paymentId looks like a real Razorpay ID
        try {
          const capturePayment = httpsCallable(functions, 'capturePayment');
          const captureResult = await capturePayment({
            orderId: completion.paymentId,
            razorpayPaymentId: completion.paymentId,
            razorpaySignature: completion.razorpaySignature || completion.paymentId
          });
          console.log('✓ Payment captured successfully:', captureResult.data);
        } catch (paymentError) {
          console.warn('Warning: Could not capture payment immediately:', paymentError);
          // Don't fail the OTP verification if payment capture fails
          // The payment can be captured later through a retry mechanism
        }
      } else if (completion.paymentId) {
        console.log('ℹ️ Skipping payment capture (test booking - earnings already updated)');
      }

      return {
        completionId,
        bookingId: completion.bookingId,
        paymentId: completion.paymentId,
        customerId: completion.customerId,
        technicianId: completion.technicianId,
        verified: true
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Generate new OTP (for expired OTP or resend)
 */
export const regenerateOTP = createAsyncThunk(
  'serviceCompletion/regenerate',
  async ({ completionId, conversationId, bookingId }, { rejectWithValue }) => {
    try {
      // Validate required parameters
      if (!completionId || !conversationId || !bookingId) {
        return rejectWithValue('Missing completionId, conversationId, or bookingId');
      }

      // Generate new OTP
      const newOTP = generateOTP();

      // Update completion document
      const completionRef = doc(
        db,
        'conversations',
        conversationId,
        'bookings',
        bookingId,
        'completion',
        completionId
      );
      
      await updateDoc(completionRef, {
        otp: newOTP,
        otpCreatedAt: serverTimestamp(),
        otpAttempts: 0,
        status: 'pending_otp'
      });

      return {
        completionId,
        otp: newOTP,
        regeneratedAt: Date.now()
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Cancel service completion
 */
export const cancelServiceCompletion = createAsyncThunk(
  'serviceCompletion/cancel',
  async ({ completionId, conversationId, bookingId }, { rejectWithValue }) => {
    try {
      const completionRef = doc(
        db,
        'conversations',
        conversationId,
        'bookings',
        bookingId,
        'completion',
        completionId
      );
      await updateDoc(completionRef, {
        status: 'cancelled',
        paymentReleaseStatus: 'cancelled'
      });

      return { completionId };
    } catch (error) {
      console.error('Error cancelling service completion:', error);
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Current active OTP session - shared between customer and technician
  currentCompletion: null, // { completionId, otp, bookingId, conversationId, customerId, technicianId }
  
  // Legacy fields - kept for backward compatibility
  completionId: null,
  otp: null,
  bookingId: null,
  paymentId: null,
  customerId: null,
  technicianId: null,
  status: 'idle', // idle, pending, completed, verified, expired, cancelled
  otpExpiresAt: null,
  otpAttempts: 0,
  loading: false,
  error: null,
  success: false,
  regeneratedCount: 0
};

const serviceCompletionSlice = createSlice({
  name: 'serviceCompletion',
  initialState,
  reducers: {
    resetServiceCompletion: (state) => {
      return initialState;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
    // Set current completion from Firestore data
    setCurrentCompletion: (state, action) => {
      state.currentCompletion = action.payload;
      // Also update legacy fields for backward compatibility
      if (action.payload) {
        state.completionId = action.payload.completionId;
        state.otp = action.payload.otp;
        state.bookingId = action.payload.bookingId;
        state.customerId = action.payload.customerId;
        state.technicianId = action.payload.technicianId;
      }
    },
    // Clear current completion on success
    clearCurrentCompletion: (state) => {
      state.currentCompletion = null;
      state.completionId = null;
      state.otp = null;
      state.success = false;
    }
  },
  extraReducers: (builder) => {
    // Initiate Service Completion
    builder
      .addCase(initiateServiceCompletion.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.status = 'pending';
      })
      .addCase(initiateServiceCompletion.fulfilled, (state, action) => {
        state.loading = false;
        state.completionId = action.payload.completionId;
        state.otp = action.payload.otp;
        state.bookingId = action.payload.bookingId;
        state.paymentId = action.payload.paymentId;
        state.customerId = action.payload.customerId;
        state.technicianId = action.payload.technicianId;
        state.status = 'completed';
        state.success = false; // Don't set success here - only on actual verification
        state.regeneratedCount = 0;
        
        // Store in currentCompletion for cross-session access
        state.currentCompletion = {
          completionId: action.payload.completionId,
          otp: action.payload.otp,
          bookingId: action.payload.bookingId,
          conversationId: action.payload.conversationId,
          customerId: action.payload.customerId,
          technicianId: action.payload.technicianId
        };
      })
      .addCase(initiateServiceCompletion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to initiate service completion';
        state.status = 'idle';
      });

    // Verify OTP
    builder
      .addCase(verifyServiceCompletionOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyServiceCompletionOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.status = 'verified';
        state.success = true;
        state.error = null;
        // Clear currentCompletion after successful verification
        state.currentCompletion = null;
      })
      .addCase(verifyServiceCompletionOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to verify OTP';
        state.otpAttempts += 1;
      });

    // Regenerate OTP
    builder
      .addCase(regenerateOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(regenerateOTP.fulfilled, (state, action) => {
        state.loading = false;
        // Update BOTH state.otp AND currentCompletion.otp
        state.otp = action.payload.otp;
        if (state.currentCompletion) {
          state.currentCompletion.otp = action.payload.otp;
        }
        state.regeneratedCount += 1;
        state.otpAttempts = 0;
        state.status = 'completed';
        state.success = false; // Don't set success - just regenerating OTP
      })
      .addCase(regenerateOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to regenerate OTP';
      });

    // Cancel Service Completion
    builder
      .addCase(cancelServiceCompletion.pending, (state) => {
        state.loading = true;
      })
      .addCase(cancelServiceCompletion.fulfilled, (state) => {
        state.loading = false;
        state.status = 'cancelled';
      })
      .addCase(cancelServiceCompletion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to cancel service completion';
      });
  }
});

export const { resetServiceCompletion, clearError, clearSuccess, setCurrentCompletion, clearCurrentCompletion } = serviceCompletionSlice.actions;

// Selectors
export const selectServiceCompletion = (state) => state.serviceCompletion;
export const selectCurrentCompletion = (state) => state.serviceCompletion.currentCompletion;
export const selectCompletionId = (state) => state.serviceCompletion.completionId;
export const selectOTP = (state) => state.serviceCompletion.otp;
export const selectCompletionStatus = (state) => state.serviceCompletion.status;
export const selectCompletionLoading = (state) => state.serviceCompletion.loading;
export const selectCompletionError = (state) => state.serviceCompletion.error;
export const selectCompletionSuccess = (state) => state.serviceCompletion.success;
export const selectOTPAttempts = (state) => state.serviceCompletion.otpAttempts;
export const selectRegeneratedCount = (state) => state.serviceCompletion.regeneratedCount;

export default serviceCompletionSlice.reducer;
