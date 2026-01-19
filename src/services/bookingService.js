// File: src/services/bookingService.js
/**
 * Booking Service
 * Queries for fetching bookings with payment information
 * Part of Phase 4: Firestore Collections & Security Rules
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';

/**
 * Fetch all bookings for a customer with payment information
 * 
 * Flow:
 * 1. Get all conversations where user is participant
 * 2. For each conversation, fetch nested bookings
 * 3. For each booking, fetch payment from payments collection
 * 4. Return combined data
 */
export const fetchMyBookings = async (customerId) => {
  try {
    console.log('📚 Fetching bookings for customer:', customerId);

    // Step 1: Get all conversations where user is a participant
    const conversationsRef = collection(db, 'conversations');
    const conversationsQuery = query(
      conversationsRef,
      where('participants', 'array-contains', customerId)
    );
    
    const conversationSnapshots = await getDocs(conversationsQuery);
    console.log(`✓ Found ${conversationSnapshots.docs.length} conversations`);

    // Step 2: For each conversation, fetch nested bookings
    const allBookings = [];
    
    for (const conversationDoc of conversationSnapshots.docs) {
      const conversationId = conversationDoc.id;
      const conversationData = conversationDoc.data();
      
      // Get nested bookings subcollection
      const bookingsRef = collection(
        db, 
        `conversations/${conversationId}/bookings`
      );
      
      const bookingsQuery = query(
        bookingsRef,
        orderBy('scheduledDate', 'desc')
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      // Add conversation context to each booking
      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();
        allBookings.push({
          id: bookingDoc.id,
          conversationId,
          ...booking,
        });
      }
    }

    console.log(`✓ Found ${allBookings.length} bookings across conversations`);

    // Step 3: Fetch payment info for each booking
    const bookingsWithPayments = await Promise.all(
      allBookings.map(async (booking) => {
        try {
          const paymentQuery = query(
            collection(db, 'payments'),
            where('bookingId', '==', booking.id),
            where('customerId', '==', customerId)  // Security: only own payments
          );
          
          const paymentSnapshot = await getDocs(paymentQuery);
          
          return {
            ...booking,
            payment: paymentSnapshot.docs.length > 0 
              ? paymentSnapshot.docs[0].data()
              : null,
            paymentId: paymentSnapshot.docs.length > 0
              ? paymentSnapshot.docs[0].id
              : null,
          };
        } catch (error) {
          console.warn(`Could not fetch payment for booking ${booking.id}:`, error);
          return {
            ...booking,
            payment: null,
            paymentId: null,
          };
        }
      })
    );

    return bookingsWithPayments;
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    throw error;
  }
};

/**
 * Fetch single booking with full payment details and refund info
 * 
 * @param {string} conversationId - ID of the conversation
 * @param {string} bookingId - ID of the booking
 * @param {string} customerId - Current user ID (for security)
 * @returns {object} Booking with payment and refund details
 */
export const fetchBookingWithPayment = async (conversationId, bookingId, customerId) => {
  try {
    console.log('📖 Fetching booking with payment details');

    // Step 1: Get booking from nested collection
    const bookingRef = doc(
      db,
      `conversations/${conversationId}/bookings/${bookingId}`
    );
    
    const bookingSnapshot = await getDoc(bookingRef);
    
    if (!bookingSnapshot.exists()) {
      throw new Error('Booking not found');
    }

    const booking = bookingSnapshot.data();
    console.log('✓ Booking found');

    // Step 2: Get payment info from payments collection
    const paymentsRef = collection(db, 'payments');
    const paymentQuery = query(
      paymentsRef,
      where('bookingId', '==', bookingId),
      where('customerId', '==', customerId)  // Security: only own payments
    );

    const paymentSnapshot = await getDocs(paymentQuery);
    const payment = paymentSnapshot.docs.length > 0 
      ? paymentSnapshot.docs[0].data()
      : null;

    if (payment) {
      console.log('✓ Payment found:', payment.status);
    }

    // Step 3: If refunded, get refund details from payment_logs
    let refund = null;
    if (payment && payment.status === 'refunded') {
      try {
        const refundQuery = query(
          collection(db, 'payment_logs'),
          where('paymentId', '==', paymentSnapshot.docs[0].id),
          where('eventType', '==', 'payment_refunded')
        );
        
        const refundSnapshot = await getDocs(refundQuery);
        refund = refundSnapshot.docs.length > 0
          ? refundSnapshot.docs[0].data()
          : null;

        if (refund) {
          console.log('✓ Refund info found');
        }
      } catch (error) {
        console.warn('Could not fetch refund details:', error);
      }
    }

    return {
      id: bookingId,
      conversationId,
      ...booking,
      payment,
      refund,
    };
  } catch (error) {
    console.error('❌ Error fetching booking with payment:', error);
    throw error;
  }
};

/**
 * Request refund for a payment
 * Calls Cloud Function: processRefund
 * 
 * @param {string} paymentId - ID of the payment to refund
 * @param {object} refundData - Refund request details
 * @returns {object} Refund result with amount and ID
 */
export const processRefundRequest = async (paymentId, refundData) => {
  try {
    console.log('🔄 Processing refund request for payment:', paymentId);

    const processRefund = httpsCallable(functions, 'processRefund');
    
    const result = await processRefund({
      paymentId,
      reason: refundData.reason || 'Customer requested',
      bookingId: refundData.bookingId,
    });

    console.log('✓ Refund processed:', result.data);

    return result.data;
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    throw new Error(error.message || 'Failed to process refund');
  }
};

/**
 * Get payment status for a booking
 * 
 * @param {string} bookingId - ID of the booking
 * @param {string} customerId - Current user ID
 * @returns {object|null} Payment object or null if not found
 */
export const getBookingPaymentStatus = async (bookingId, customerId) => {
  try {
    const paymentQuery = query(
      collection(db, 'payments'),
      where('bookingId', '==', bookingId),
      where('customerId', '==', customerId)
    );

    const paymentSnapshot = await getDocs(paymentQuery);
    
    return paymentSnapshot.docs.length > 0 
      ? paymentSnapshot.docs[0].data()
      : null;
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return null;
  }
};

/**
 * Get all refunds for a customer
 * 
 * @param {string} customerId - Current user ID
 * @returns {array} Array of refund records
 */
export const getCustomerRefunds = async (customerId) => {
  try {
    console.log('💰 Fetching refunds for customer');

    const refundsQuery = query(
      collection(db, 'payment_logs'),
      where('eventType', '==', 'payment_refunded'),
      where('customerId', '==', customerId),
      orderBy('timestamp', 'desc')
    );

    const refundsSnapshot = await getDocs(refundsQuery);
    
    return refundsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return [];
  }
};

/**
 * Get technician's payment history (for technician app)
 * 
 * @param {string} technicianId - Technician user ID
 * @returns {array} Array of payment records
 */
export const getTechnicianPayments = async (technicianId) => {
  try {
    console.log('💵 Fetching payments for technician');

    const paymentsQuery = query(
      collection(db, 'payments'),
      where('technicianId', '==', technicianId),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc')
    );

    const paymentsSnapshot = await getDocs(paymentsQuery);
    
    return paymentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching technician payments:', error);
    return [];
  }
};

/**
 * Calculate technician earnings from payments
 * 
 * @param {array} payments - Array of payment objects
 * @returns {object} Earnings breakdown
 */
export const calculateEarnings = (payments) => {
  const totalServiceAmount = payments.reduce((sum, p) => sum + (p.serviceAmount || 0), 0);
  const totalCommission = payments.reduce((sum, p) => sum + (p.commissionAmount || 0), 0);
  const technicianEarnings = totalServiceAmount - totalCommission;

  return {
    totalServiceAmount,
    totalCommission,
    technicianEarnings,
    paymentCount: payments.length,
    averagePerPayment: payments.length > 0 ? technicianEarnings / payments.length : 0,
  };
};

export default {
  fetchMyBookings,
  fetchBookingWithPayment,
  processRefundRequest,
  getBookingPaymentStatus,
  getCustomerRefunds,
  getTechnicianPayments,
  calculateEarnings,
};
