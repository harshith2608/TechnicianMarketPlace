import { signInWithPhoneNumber } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Development mode flag - set to true for testing without real Firebase Phone Auth
const DEVELOPMENT_MODE = true; // Set to false for production

// Store for development mode verification (not in Redux)
let devModeStore = {
  phoneNumber: null,
  verificationId: null,
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber) => {
  try {
    // Validate phone number format
    if (!phoneNumber || phoneNumber.length < 10) {
      return {
        success: false,
        error: 'Invalid phone number',
      };
    }

    // Development mode: simulate OTP send
    if (DEVELOPMENT_MODE) {
      // Store in dev mode store (not in Redux to avoid serialization error)
      const mockVerificationId = `mock-${Date.now()}`;
      devModeStore.phoneNumber = phoneNumber;
      devModeStore.verificationId = mockVerificationId;
      
      return {
        success: true,
        verificationId: mockVerificationId,
        message: `OTP sent to ${phoneNumber} (Development Mode - Use 000000)`,
        isDevelopment: true,
      };
    }

    // Production mode: use Firebase Phone Auth
    // For React Native/Expo with Firebase, we use signInWithPhoneNumber
    // This will send an SMS with verification code
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);

    return {
      success: true,
      verificationId: confirmationResult,
      message: 'OTP sent successfully',
      isDevelopment: false,
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Handle specific errors
    let errorMessage = 'Failed to send OTP';
    if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number format. Please check and try again.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many requests. Try again later.';
    } else if (error.code === 'auth/invalid-app-credential' || error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Firebase Phone Authentication is not properly configured.';
    } else if (error.code === 'auth/argument-error') {
      errorMessage = 'Invalid phone number format. Use format like +919876543210';
    } else if (error.message && error.message.includes('UNSUPPORTED_OPERATION')) {
      errorMessage = 'Phone verification requires native phone capability. Make sure you are testing on a real device or simulator.';
    }

    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
      fullError: error.message,
    };
  }
};

// Verify OTP code
export const verifyOTP = async (confirmationResult, otp) => {
  try {
    if (!confirmationResult || !otp) {
      return {
        success: false,
        error: 'Invalid verification data',
      };
    }
    
    // Development mode: check test code
    if (DEVELOPMENT_MODE && confirmationResult === devModeStore.verificationId) {
      if (otp === '000000') {
        return {
          success: true,
          user: {
            uid: `test-user-${Date.now()}`,
            phoneNumber: devModeStore.phoneNumber,
          },
          message: 'Phone verified successfully',
        };
      } else {
        throw new Error('Invalid OTP code');
      }
    }

    // Production mode: use Firebase confirmation
    const userCredential = await confirmationResult.confirm(otp);

    return {
      success: true,
      user: userCredential.user,
      message: 'Phone verified successfully',
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);

    let errorMessage = 'Failed to verify OTP';
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid OTP code';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'OTP has expired. Please request a new one';
    }

    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
    };
  }
};

// Update user's phone number in Firestore
export const updateUserPhoneNumber = async (userId, phoneNumber, isVerified = true) => {
  try {
    // In development mode, skip Firestore update (no real auth)
    if (DEVELOPMENT_MODE) {
      return {
        success: true,
        message: 'Phone number updated successfully (Development Mode)',
      };
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      phoneNumber,
      isPhoneVerified: isVerified,
      phoneVerifiedAt: isVerified ? serverTimestamp() : null,
    });

    return {
      success: true,
      message: 'Phone number updated successfully',
    };
  } catch (error) {
    console.error('Error updating user phone number:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Check if phone is already registered
export const isPhoneRegistered = async (phoneNumber) => {
  try {
    const user = await auth.currentUser;
    if (user?.phoneNumber === phoneNumber) {
      return { registered: true, message: 'This is your current phone' };
    }
    return { registered: false };
  } catch (error) {
    console.error('Error checking phone:', error);
    return { registered: false, error: error.message };
  }
};
