import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    addDoc,
    collection,
    doc,
    getDocs,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Create Booking
export const createBooking = createAsyncThunk(
  'booking/createBooking',
  async ({ conversationId, serviceId, serviceName, technicianId, customerId, scheduledDate, location, description, estimatedPrice }, { rejectWithValue }) => {
    try {
      const bookingRef = collection(db, 'conversations', conversationId, 'bookings');
      const docRef = await addDoc(bookingRef, {
        serviceId,
        serviceName: serviceName || 'Service Booking', // Store service name directly
        technicianId,
        customerId,
        scheduledDate,
        location,
        description,
        estimatedPrice,
        status: 'pending', // pending, confirmed, completed, cancelled
        createdAt: serverTimestamp(),
        confirmedAt: null,
        paymentStatus: 'pending', // pending, completed, failed
      });
      
      return {
        id: docRef.id,
        conversationId,
        serviceId,
        serviceName: serviceName || 'Service Booking',
        technicianId,
        customerId,
        scheduledDate,
        location,
        description,
        estimatedPrice,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Fetch Bookings for Conversation
export const fetchConversationBookings = createAsyncThunk(
  'booking/fetchConversationBookings',
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      const bookingsRef = collection(db, 'conversations', conversationId, 'bookings');
      const snapshot = await getDocs(bookingsRef);
      
      const bookings = [];
      snapshot.forEach((doc) => {
        bookings.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return bookings;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Update Booking Status
export const updateBookingStatus = createAsyncThunk(
  'booking/updateBookingStatus',
  async ({ conversationId, bookingId, status }, { rejectWithValue }) => {
    try {
      const bookingRef = doc(db, 'conversations', conversationId, 'bookings', bookingId);
      const updateData = { status };
      
      if (status === 'confirmed') {
        updateData.confirmedAt = serverTimestamp();
      }
      
      await updateDoc(bookingRef, updateData);
      
      return { id: bookingId, status };
    } catch (error) {
      console.error('Error updating booking status:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Update Payment Status
export const updatePaymentStatus = createAsyncThunk(
  'booking/updatePaymentStatus',
  async ({ conversationId, bookingId, paymentStatus }, { rejectWithValue }) => {
    try {
      const bookingRef = doc(db, 'conversations', conversationId, 'bookings', bookingId);
      await updateDoc(bookingRef, { paymentStatus });
      
      return { id: bookingId, paymentStatus };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  activeBooking: null,
  bookings: [],
  loading: false,
  error: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setActiveBooking: (state, action) => {
      state.activeBooking = action.payload;
    },
    clearActiveBooking: (state) => {
      state.activeBooking = null;
    },
  },
  extraReducers: (builder) => {
    // Create Booking
    builder
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.activeBooking = action.payload;
        state.bookings.push(action.payload);
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Bookings
    builder
      .addCase(fetchConversationBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversationBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchConversationBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Booking Status
    builder
      .addCase(updateBookingStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.bookings.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.bookings[index].status = action.payload.status;
        }
        if (state.activeBooking?.id === action.payload.id) {
          state.activeBooking.status = action.payload.status;
        }
      })
      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Payment Status
    builder
      .addCase(updatePaymentStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePaymentStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.bookings.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.bookings[index].paymentStatus = action.payload.paymentStatus;
        }
        if (state.activeBooking?.id === action.payload.id) {
          state.activeBooking.paymentStatus = action.payload.paymentStatus;
        }
      })
      .addCase(updatePaymentStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setActiveBooking, clearActiveBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
