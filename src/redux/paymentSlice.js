/**
 * Redux Slice for Payment Management
 * Handles payment state, payment history, earnings, and payouts
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import paymentService from '../services/paymentService';
import { PAYMENT_CONFIG } from '../utils/paymentConfig';

/**
 * Initialize Payment
 * Create payment order with Razorpay and generate temporary booking ID
 */
export const initializePayment = createAsyncThunk(
  'payment/initialize',
  async ({ conversationId, customerId, technicianId, amount, customerEmail, customerPhone }, { rejectWithValue }) => {
    try {
      // Create order with Razorpay
      const orderData = await paymentService.createPaymentOrder({
        customerId,
        technicianId,
        amount,
        customerEmail,
        customerPhone,
      });

      // Generate a temporary booking ID for this payment
      const tempBookingId = `temp_${orderData.orderId}`;

      // Store payment record in Firestore
      const paymentRef = doc(db, 'payments', tempBookingId);
      await setDoc(paymentRef, {
        paymentId: null, // Will be set after payment success
        bookingId: null, // Will be set after booking is created post-payment
        tempBookingId,
        conversationId,
        customerId,
        technicianId,
        amount,
        commission: orderData.commission,
        technicianEarnings: orderData.technicianEarnings,
        razorpayOrderId: orderData.orderId,
        status: PAYMENT_CONFIG.PAYMENT_STATUS.PENDING,
        paymentMethod: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        tempBookingId,
        conversationId,
        orderId: orderData.orderId,
        amount,
        commission: orderData.commission,
        technicianEarnings: orderData.technicianEarnings,
        keyId: process.env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      console.error('Error initializing payment:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Process Payment Success
 * Called after successful Razorpay payment
 * Creates the actual booking and updates payment record
 */
export const processPaymentSuccess = createAsyncThunk(
  'payment/processSuccess',
  async ({ 
    tempBookingId, 
    conversationId, 
    customerId, 
    technicianId, 
    serviceId,
    serviceName,
    scheduledDate,
    location,
    description,
    estimatedPrice,
    razorpayPaymentId, 
    razorpaySignature,
    orderId, 
    paymentMethod 
  }, { rejectWithValue }) => {
    try {
      // Get the temporary payment record
      const paymentRecord = await getDoc(doc(db, 'payments', tempBookingId));
      if (!paymentRecord.exists()) {
        throw new Error('Payment record not found');
      }

      const paymentData = paymentRecord.data();
      const amount = paymentData.amount;
      
      // Capture payment with Razorpay
      const captureResult = await paymentService.capturePayment(razorpayPaymentId, amount);

      // Now create the actual booking in the conversation (payment succeeded!)
      const bookingRef = collection(db, 'conversations', conversationId, 'bookings');
      const bookingDoc = await addDoc(bookingRef, {
        serviceId,
        serviceName: serviceName || 'Service Booking',
        technicianId,
        customerId,
        scheduledDate,
        location,
        description,
        estimatedPrice: amount,
        status: 'pending', // Start as pending until technician accepts
        createdAt: serverTimestamp(),
        confirmedAt: null,
        paymentStatus: 'completed',
        paymentId: razorpayPaymentId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
        razorpayOrderId: orderId,
      });

      const bookingId = bookingDoc.id;

      // Update the payment record with the actual booking ID
      const paymentRef = doc(db, 'payments', tempBookingId);
      await updateDoc(paymentRef, {
        bookingId,
        paymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
        status: PAYMENT_CONFIG.PAYMENT_STATUS.CAPTURED,
        paymentMethod,
        capturedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update payment notes in Razorpay with the booking ID
      await paymentService.updatePaymentNotes(razorpayPaymentId, {
        bookingId,
        customerId,
        technicianId,
        commission: paymentData.commission.toString(),
        technicianEarnings: paymentData.technicianEarnings.toString(),
      });

      // Earnings will be updated when technician completes service and enters OTP
      // This ensures technician doesn't get paid if they don't show up

      return {
        bookingId,
        paymentId: razorpayPaymentId,
        transactionId: razorpayPaymentId,
        orderId: orderId || paymentData.razorpayOrderId,
        amount,
        paymentMethod,
        status: PAYMENT_CONFIG.PAYMENT_STATUS.CAPTURED,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error processing payment success:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Process Refund
 * Handle booking cancellation with time-based refund policy
 */
export const processRefund = createAsyncThunk(
  'payment/processRefund',
  async ({ bookingId, customerId, technicianId, reason }, { rejectWithValue }) => {
    try {
      // Get payment record
      const paymentRecord = await getDoc(doc(db, 'payments', bookingId));
      if (!paymentRecord.exists()) {
        throw new Error('Payment record not found');
      }

      const payment = paymentRecord.data();

      // Get booking to get service time
      const bookingRecord = await getDoc(doc(db, 'bookings', bookingId));
      if (!bookingRecord.exists()) {
        throw new Error('Booking record not found');
      }

      const booking = bookingRecord.data();

      // Calculate refund
      const refundResult = await paymentService.refundPayment({
        paymentId: payment.paymentId,
        amount: payment.amount,
        bookingTime: payment.createdAt.toDate(),
        serviceTime: booking.scheduledDate instanceof Timestamp 
          ? booking.scheduledDate.toDate() 
          : new Date(booking.scheduledDate),
        reason,
      });

      if (!refundResult.allowed && refundResult.allowed === false) {
        return rejectWithValue(refundResult.reason);
      }

      // Create refund record in Firestore
      const refundRef = doc(collection(db, 'refunds'));
      await setDoc(refundRef, {
        refundId: refundResult.refundId,
        bookingId,
        paymentId: payment.paymentId,
        customerId,
        technicianId,
        amount: payment.amount,
        breakdown: refundResult.breakdown,
        refundType: refundResult.refundType,
        status: PAYMENT_CONFIG.REFUND_STATUS.PROCESSING,
        reason,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update technician earnings if they're getting compensation
      if (refundResult.technicianCompensation > 0) {
        const techRef = doc(db, 'users', technicianId);
        const techSnap = await getDoc(techRef);
        if (techSnap.exists()) {
          const currentEarnings = techSnap.data().totalEarnings || 0;
          await updateDoc(techRef, {
            totalEarnings: currentEarnings + refundResult.technicianCompensation,
          });
        }
      }

      console.log('✅ Refund processed:', {
        bookingId,
        refundType: refundResult.refundType,
        customerRefund: refundResult.customerRefund,
        technicianCompensation: refundResult.technicianCompensation,
      });

      return {
        bookingId,
        ...refundResult,
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch Payment History
 * Get all payments for a user
 */
export const fetchPaymentHistory = createAsyncThunk(
  'payment/fetchHistory',
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      let paymentDocs;

      if (role === 'customer') {
        // Get payments where user is customer
        const q = query(
          collection(db, 'payments'),
          where('customerId', '==', userId)
        );
        paymentDocs = await getDocs(q);
      } else if (role === 'technician') {
        // Get payments where user is technician
        const q = query(
          collection(db, 'payments'),
          where('technicianId', '==', userId)
        );
        paymentDocs = await getDocs(q);
      }

      const payments = paymentDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        capturedAt: doc.data().capturedAt?.toDate(),
      }));

      return payments.sort((a, b) => (b.createdAt || new Date(0)) - (a.createdAt || new Date(0)));
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch Technician Earnings
 */
export const fetchTechnicianEarnings = createAsyncThunk(
  'payment/fetchEarnings',
  async (technicianId, { rejectWithValue }) => {
    try {
      // Get user document for total earnings
      const userRef = doc(db, 'users', technicianId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = userSnap.data();

      // Get pending payout
      const payoutQuery = query(
        collection(db, 'payouts'),
        where('technicianId', '==', technicianId),
        where('status', '==', PAYMENT_CONFIG.PAYOUT_STATUS.PENDING)
      );
      const payoutDocs = await getDocs(payoutQuery);
      const pendingPayout = payoutDocs.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      return {
        totalEarnings: userData.totalEarnings || 0,
        pendingPayout: pendingPayout,
        payoutThreshold: PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD,
        canRequestPayout: (userData.totalEarnings || 0) >= PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD,
      };
    } catch (error) {
      console.error('Error fetching earnings:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Request Payout
 */
export const requestPayout = createAsyncThunk(
  'payment/requestPayout',
  async ({ technicianId, amount, accountType, accountDetails }, { rejectWithValue }) => {
    try {
      // For now, create payout record without hitting Razorpay
      // In production, would need proper fund account setup first
      const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create payout record in Firestore
      const payoutRef = doc(collection(db, 'payouts'));
      await setDoc(payoutRef, {
        payoutId,
        technicianId,
        amount,
        accountType,
        accountDetails: {
          accountNumber: accountDetails.accountNumber || accountDetails.upiId,
          accountHolderName: accountDetails.accountHolderName || 'N/A',
        },
        status: PAYMENT_CONFIG.PAYOUT_STATUS.PROCESSING,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Deduct from technician's earnings
      const userRef = doc(db, 'users', technicianId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentEarnings = userSnap.data().totalEarnings || 0;
        const currentPending = userSnap.data().pendingPayout || 0;
        await updateDoc(userRef, {
          totalEarnings: Math.max(0, currentEarnings - amount),
          pendingPayout: Math.max(0, currentPending - amount),
          lastPayoutDate: serverTimestamp(),
        });
      }

      console.log('✅ Payout requested:', { technicianId, amount, payoutId });

      return {
        payoutId,
        technicianId,
        amount,
        accountType,
        status: PAYMENT_CONFIG.PAYOUT_STATUS.PROCESSING,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error requesting payout:', error);
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  currentPayment: null,
  paymentHistory: [],
  earnings: {
    totalEarnings: 0,
    pendingPayout: 0,
    canRequestPayout: false,
  },
  loading: false,
  error: null,
  success: null,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    resetPaymentState: (state) => {
      state.currentPayment = null;
      state.error = null;
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    // Initialize Payment
    builder
      .addCase(initializePayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializePayment.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPayment = action.payload;
        state.success = 'Payment initiated';
      })
      .addCase(initializePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Process Payment Success
    builder
      .addCase(processPaymentSuccess.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processPaymentSuccess.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPayment = null;
        state.success = 'Payment successful';
      })
      .addCase(processPaymentSuccess.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Process Refund
    builder
      .addCase(processRefund.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processRefund.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Refund processed';
      })
      .addCase(processRefund.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Payment History
    builder
      .addCase(fetchPaymentHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentHistory = action.payload;
      })
      .addCase(fetchPaymentHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Technician Earnings
    builder
      .addCase(fetchTechnicianEarnings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTechnicianEarnings.fulfilled, (state, action) => {
        state.loading = false;
        state.earnings = action.payload;
      })
      .addCase(fetchTechnicianEarnings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Request Payout
    builder
      .addCase(requestPayout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestPayout.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Payout requested successfully';
      })
      .addCase(requestPayout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSuccess, resetPaymentState } = paymentSlice.actions;

// Selectors
export const selectCurrentPayment = (state) => state.payment.currentPayment;
export const selectPaymentHistory = (state) => state.payment.paymentHistory;
export const selectEarnings = (state) => state.payment.earnings;
export const selectPaymentLoading = (state) => state.payment.loading;
export const selectPaymentError = (state) => state.payment.error;
export const selectPaymentSuccess = (state) => state.payment.success;

export default paymentSlice.reducer;
