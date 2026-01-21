import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Helper function to serialize Firestore timestamps for Redux
const serializeFirestoreData = (data) => {
  if (!data) return null;
  return {
    ...data,
    acceptedAt: data.acceptedAt ? (typeof data.acceptedAt === 'object' && data.acceptedAt.toDate ? data.acceptedAt.toDate().toISOString() : data.acceptedAt) : null,
  };
};

// Helper function to serialize all user data timestamps
const serializeUserData = (userData) => {
  if (!userData) return null;
  return {
    ...userData,
    createdAt: userData.createdAt ? 
      (typeof userData.createdAt === 'object' && userData.createdAt.toDate 
        ? userData.createdAt.toDate().toISOString() 
        : userData.createdAt) 
      : null,
    phoneVerifiedAt: userData.phoneVerifiedAt ?
      (typeof userData.phoneVerifiedAt === 'object' && userData.phoneVerifiedAt.toDate
        ? userData.phoneVerifiedAt.toDate().toISOString()
        : userData.phoneVerifiedAt)
      : null,
    lastPayoutDate: userData.lastPayoutDate ?
      (typeof userData.lastPayoutDate === 'object' && userData.lastPayoutDate.toDate
        ? userData.lastPayoutDate.toDate().toISOString()
        : userData.lastPayoutDate)
      : null,
    legalAcceptance: userData.legalAcceptance ? serializeFirestoreData(userData.legalAcceptance) : null,
  };
};

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ name, email, password, role = 'customer', phoneNumber = null }, { rejectWithValue }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        email,
        role,
        phoneNumber: phoneNumber || null,
        isPhoneVerified: phoneNumber ? true : false,
        phoneVerifiedAt: phoneNumber ? new Date() : null,
        createdAt: new Date(),
        legalAcceptance: {
          accepted: false,
          acceptedAt: null,
          version: '1.0',
        },
      });
      
      return {
        id: userCredential.user.uid,
        email,
        name,
        role,
        phoneNumber,
        isPhoneVerified: phoneNumber ? true : false,
        legalAcceptance: {
          accepted: false,
          acceptedAt: null,
          version: '1.0',
        },
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return serializeUserData({
          id: userCredential.user.uid,
          email: userCredential.user.email,
          ...userData,
        });
      } else {
        // Create a profile with just the email prefix as name for first login
        const nameFromEmail = email.split('@')[0];
        const legalAcceptanceData = { accepted: false, acceptedAt: null, version: '1.0' };
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: nameFromEmail,
          email,
          role: 'customer',
          createdAt: new Date(),
          legalAcceptance: legalAcceptanceData,
        });
        
        return serializeUserData({
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: nameFromEmail,
          role: 'customer',
          legalAcceptance: legalAcceptanceData,
        });
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loginWithPhone = createAsyncThunk(
  'auth/loginWithPhone',
  async ({ phoneNumber, userCredential }, { rejectWithValue }) => {
    try {
      // userCredential is the result from Firebase phone auth signInWithPhoneNumber
      if (!userCredential || !userCredential.user) {
        return rejectWithValue('Phone authentication failed');
      }

      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        return serializeUserData({
          id: uid,
          email: userData.email || '',
          phoneNumber: userData.phoneNumber || phoneNumber,
          isPhoneVerified: true,
          ...userData,
        });
      } else {
        // User doesn't exist - phone not registered
        return rejectWithValue('Phone number not registered. Please register first.');
      }
    } catch (error) {
      console.error('Phone login error:', error);
      return rejectWithValue(error.message || 'Phone login failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth);
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ userId, name, role }, { rejectWithValue }) => {
    try {
      const updateData = {};
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      
      await setDoc(doc(db, 'users', userId), updateData, { merge: true });
      
      return updateData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const acceptLegalTerms = createAsyncThunk(
  'auth/acceptLegalTerms',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const acceptanceData = {
        legalAcceptance: {
          accepted: true,
          acceptedAt: new Date(),
          version: '1.0',
          acceptedTerms: ['terms_of_service', 'warranty_policy', 'cancellation_policy', 'privacy_policy', 'platform_disclaimer'],
        },
      };

      await setDoc(doc(db, 'users', userId), acceptanceData, { merge: true });

      // Return with serializable timestamp for Redux
      return {
        accepted: true,
        acceptedAt: Date.now(),
        version: '1.0',
        acceptedTerms: ['terms_of_service', 'warranty_policy', 'cancellation_policy', 'privacy_policy', 'platform_disclaimer'],
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Refresh user data from Firestore
 * Used to update earnings and other fields after transactions
 */
export const refreshUserData = createAsyncThunk(
  'auth/refreshUserData',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        return serializeUserData({
          id: userId,
          ...userData,
        });
      } else {
        return rejectWithValue('User not found');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  user: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Login with Phone
    builder
      .addCase(loginWithPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithPhone.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginWithPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          if (action.payload.name) state.user.name = action.payload.name;
          if (action.payload.role) state.user.role = action.payload.role;
        }
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Accept Legal Terms
    builder
      .addCase(acceptLegalTerms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(acceptLegalTerms.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.legalAcceptance = action.payload;
        }
        state.error = null;
      })
      .addCase(acceptLegalTerms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Refresh User Data
    builder
      .addCase(refreshUserData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshUserData.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user && action.payload) {
          // Merge refreshed data into existing user state
          state.user = { ...state.user, ...action.payload };
        }
        state.error = null;
      })
      .addCase(refreshUserData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;
