import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { addDoc, collection, doc, getDocs, query, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Initiate a call
export const initiateCall = createAsyncThunk(
  'calls/initiateCall',
  async ({ conversationId, callerId, callerName, receiverId, receiverName }, { rejectWithValue }) => {
    try {
      const callRef = collection(db, 'conversations', conversationId, 'calls');
      const newCall = await addDoc(callRef, {
        callerId,
        callerName,
        receiverId,
        receiverName,
        status: 'ringing', // ringing, accepted, rejected, ended
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      return {
        id: newCall.id,
        conversationId,
        callerId,
        callerName,
        receiverId,
        receiverName,
        status: 'ringing',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Accept a call
export const acceptCall = createAsyncThunk(
  'calls/acceptCall',
  async ({ conversationId, callId }, { rejectWithValue }) => {
    try {
      const callRef = doc(db, 'conversations', conversationId, 'calls', callId);
      await updateDoc(callRef, {
        status: 'accepted',
        updatedAt: new Date(),
      });
      return { callId, status: 'accepted' };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Reject a call
export const rejectCall = createAsyncThunk(
  'calls/rejectCall',
  async ({ conversationId, callId }, { rejectWithValue }) => {
    try {
      const callRef = doc(db, 'conversations', conversationId, 'calls', callId);
      await updateDoc(callRef, {
        status: 'rejected',
        updatedAt: new Date(),
      });
      return { callId, status: 'rejected' };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// End a call
export const endCall = createAsyncThunk(
  'calls/endCall',
  async ({ conversationId, callId }, { rejectWithValue }) => {
    try {
      const callRef = doc(db, 'conversations', conversationId, 'calls', callId);
      await updateDoc(callRef, {
        status: 'ended',
        endedAt: new Date(),
      });
      return { callId, status: 'ended' };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch active calls for a conversation
export const fetchActiveCalls = createAsyncThunk(
  'calls/fetchActiveCalls',
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      const callsCollection = collection(db, 'conversations', conversationId, 'calls');
      const q = query(callsCollection);
      const snapshot = await getDocs(q);
      
      const calls = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }))
        .filter((call) => call.status !== 'ended'); // Only active calls
      
      return calls;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  activeCalls: [],
  incomingCall: null,
  currentCall: null,
  loading: false,
  error: null,
};

const callSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    setIncomingCall: (state, action) => {
      state.incomingCall = action.payload;
    },
    clearIncomingCall: (state) => {
      state.incomingCall = null;
    },
    setCurrentCall: (state, action) => {
      state.currentCall = action.payload;
    },
    clearCurrentCall: (state) => {
      state.currentCall = null;
    },
    updateActiveCalls: (state, action) => {
      state.activeCalls = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Initiate Call
    builder
      .addCase(initiateCall.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiateCall.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCall = action.payload;
        state.activeCalls.push(action.payload);
      })
      .addCase(initiateCall.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Accept Call
    builder
      .addCase(acceptCall.fulfilled, (state, action) => {
        if (state.currentCall && state.currentCall.id === action.payload.callId) {
          state.currentCall.status = 'accepted';
        }
        state.incomingCall = null;
      });

    // Reject Call
    builder
      .addCase(rejectCall.fulfilled, (state, action) => {
        state.incomingCall = null;
        state.activeCalls = state.activeCalls.filter(
          (call) => call.id !== action.payload.callId
        );
      });

    // End Call
    builder
      .addCase(endCall.fulfilled, (state, action) => {
        state.currentCall = null;
        state.incomingCall = null;
        state.activeCalls = state.activeCalls.filter(
          (call) => call.id !== action.payload.callId
        );
      });

    // Fetch Active Calls
    builder
      .addCase(fetchActiveCalls.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActiveCalls.fulfilled, (state, action) => {
        state.loading = false;
        state.activeCalls = action.payload;
      })
      .addCase(fetchActiveCalls.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setIncomingCall,
  clearIncomingCall,
  setCurrentCall,
  clearCurrentCall,
  updateActiveCalls,
} = callSlice.actions;

export default callSlice.reducer;
