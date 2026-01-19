import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { sendOTP, updateUserPhoneNumber, verifyOTP } from '../utils/firebasePhoneAuth';
import { formatPhoneNumber } from '../utils/phoneValidation';

// Thunks
export const sendPhoneOTP = createAsyncThunk(
  'phoneAuth/sendOTP',
  async ({ phoneNumber, countryCode }, { rejectWithValue }) => {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber, countryCode);

      const result = await sendOTP(formattedPhone);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to send OTP');
      }

      return {
        verificationId: result.verificationId,
        phoneNumber: formattedPhone,
        message: result.message,
      };
    } catch (error) {
      console.error('Error in sendPhoneOTP thunk:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const verifyPhoneOTP = createAsyncThunk(
  'phoneAuth/verifyOTP',
  async ({ confirmationResult, otp }, { rejectWithValue }) => {
    try {
      if (!confirmationResult || !otp) {
        return rejectWithValue('Invalid verification data');
      }

      const result = await verifyOTP(confirmationResult, otp);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to verify OTP');
      }

      return {
        user: result.user,
        message: result.message,
      };
    } catch (error) {
      console.error('Error in verifyPhoneOTP thunk:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const updatePhoneNumber = createAsyncThunk(
  'phoneAuth/updatePhoneNumber',
  async ({ userId, phoneNumber, isVerified }, { rejectWithValue }) => {
    try {
      const result = await updateUserPhoneNumber(userId, phoneNumber, isVerified);

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to update phone number');
      }

      return {
        phoneNumber,
        isVerified,
        message: result.message,
      };
    } catch (error) {
      console.error('Error in updatePhoneNumber thunk:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const initialState = {
  phoneNumber: '',
  countryCode: '+91',
  verificationId: null,
  otpSent: false,
  otp: '',
  isPhoneVerified: false,
  loading: false,
  error: null,
  success: null,
  otpExpiryTime: null,
  verificationAttempts: 0,
};

const phoneAuthSlice = createSlice({
  name: 'phoneAuth',
  initialState,
  reducers: {
    setPhoneNumber: (state, action) => {
      state.phoneNumber = action.payload;
    },
    setCountryCode: (state, action) => {
      state.countryCode = action.payload;
    },
    setOTP: (state, action) => {
      state.otp = action.payload;
    },
    setOTPExpiryTime: (state, action) => {
      state.otpExpiryTime = action.payload;
    },
    incrementVerificationAttempts: (state) => {
      state.verificationAttempts += 1;
    },
    resetPhoneAuth: (state) => {
      return initialState;
    },
    resetError: (state) => {
      state.error = null;
    },
    resetSuccess: (state) => {
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    // Send OTP
    builder
      .addCase(sendPhoneOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(sendPhoneOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.otpSent = true;
        state.verificationId = action.payload.verificationId;
        state.phoneNumber = action.payload.phoneNumber;
        state.otp = '';
        state.verificationAttempts = 0;
        state.success = action.payload.message;
        // Set expiry time to 10 minutes from now
        state.otpExpiryTime = Date.now() + 10 * 60 * 1000;
      })
      .addCase(sendPhoneOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.otpSent = false;
      });

    // Verify OTP
    builder
      .addCase(verifyPhoneOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyPhoneOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.isPhoneVerified = true;
        state.otp = '';
        state.success = action.payload.message;
        state.verificationAttempts = 0;
      })
      .addCase(verifyPhoneOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.verificationAttempts += 1;
      });

    // Update Phone Number
    builder
      .addCase(updatePhoneNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePhoneNumber.fulfilled, (state, action) => {
        state.loading = false;
        state.phoneNumber = action.payload.phoneNumber;
        state.isPhoneVerified = action.payload.isVerified;
        state.success = action.payload.message;
      })
      .addCase(updatePhoneNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setPhoneNumber,
  setCountryCode,
  setOTP,
  setOTPExpiryTime,
  incrementVerificationAttempts,
  resetPhoneAuth,
  resetError,
  resetSuccess,
} = phoneAuthSlice.actions;

export default phoneAuthSlice.reducer;
