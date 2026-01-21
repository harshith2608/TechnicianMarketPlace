/**
 * OTP Verification Screen - Technician Side
 * Technician enters the 4-digit OTP shared by customer
 */

import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import OTPInput from '../components/OTPInput';
import { db } from '../config/firebase';
import { refreshUserData, selectUser } from '../redux/authSlice';
import { clearSuccess, regenerateOTP, selectCompletionError, selectCompletionLoading, selectCompletionSuccess, selectOTPAttempts, verifyServiceCompletionOTP } from '../redux/serviceCompletionSlice';

const MAX_ATTEMPTS = 3;

const OTPVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { bookingId, conversationId, customerId, amount } = route.params || {};
  
  // Get current user from Redux
  const user = useSelector(selectUser);
  
  // Technician always fetches from Firestore
  const loading = useSelector(selectCompletionLoading);
  const error = useSelector(selectCompletionError);
  const otpAttempts = useSelector(selectOTPAttempts);
  const success = useSelector(selectCompletionSuccess);

  const [completionId, setCompletionId] = useState(null);
  const [enteredOTP, setEnteredOTP] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchingCompletion, setFetchingCompletion] = useState(false);

  // Clear stale success state when screen loads
  useEffect(() => {
    dispatch(clearSuccess());
  }, [dispatch]);

  // OTP expiry removed - OTP is now indefinite until verified or regenerated

  // Handle successful verification
  useEffect(() => {
    if (success) {
      // Refresh technician earnings after OTP verification
      if (user?.id) {
        dispatch(refreshUserData({ userId: user.id }));
      }
      
      // Navigate to success screen after a brief delay
      setTimeout(() => {
        navigation.navigate('PaymentVerified', {
          completionId,
          bookingId,
          conversationId,
          amount
        });
      }, 1500);
    }
  }, [success, navigation, completionId, bookingId, conversationId, amount, dispatch, user?.id]);

  const handleOTPComplete = (otp) => {
    setEnteredOTP(otp);
  };

  const handleSubmit = async () => {
    if (!enteredOTP || enteredOTP.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter a 4-digit OTP');
      return;
    }

    // Check if attempts exceeded BEFORE making any API calls
    if (otpAttempts >= MAX_ATTEMPTS) {
      Alert.alert(
        'Maximum Attempts Exceeded',
        'You have exceeded the maximum OTP attempts. Please ask the customer to generate a new OTP.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Fetch completion from Firestore
      console.log('🔍 Fetching OTP from Firestore for verification...');
      
      const completionRef = collection(
        db,
        'conversations',
        conversationId,
        'bookings',
        bookingId,
        'completion'
      );
      
      const snapshot = await getDocs(completionRef);
      
      if (snapshot.empty) {
        Alert.alert('Error', 'OTP session not found. Please ask the customer to generate an OTP first.');
        setIsSubmitting(false);
        return;
      }

      const firstDoc = snapshot.docs[0];
      const completionData = firstDoc.data();
      const fetchedCompletionId = firstDoc.id;

      console.log('✅ Found completion in Firestore:', fetchedCompletionId);
      
      // Check if already attempted max times in Firestore
      if (completionData.otpAttempts >= MAX_ATTEMPTS) {
        Alert.alert(
          'Too Many Attempts',
          'This OTP session has exceeded maximum attempts. Please ask the customer to generate a new OTP.'
        );
        setIsSubmitting(false);
        return;
      }

      // Set completion ID for potential regeneration request
      setCompletionId(fetchedCompletionId);
      
      console.log('Verifying OTP with action:', { fetchedCompletionId, conversationId, bookingId });
      // Redux action will validate OTP match and handle increment of attempts
      await dispatch(
        verifyServiceCompletionOTP({
          completionId: fetchedCompletionId,
          conversationId,
          bookingId,
          enteredOTP
        })
      ).unwrap();
    } catch (err) {
      console.error('OTP verification failed:', err);
      const errorMessage = typeof err === 'string' ? err : err?.message || 'Verification failed';
      
      // Show remaining attempts if OTP was invalid
      if (errorMessage === 'Invalid OTP' || errorMessage.includes('incorrect')) {
        const remainingAttempts = MAX_ATTEMPTS - (otpAttempts + 1);
        if (remainingAttempts > 0) {
          Alert.alert(
            'Incorrect OTP',
            `The OTP you entered is incorrect.\n\nAttempts remaining: ${remainingAttempts}`,
            [{ text: 'Try Again', onPress: () => setEnteredOTP('') }]
          );
        } else {
          Alert.alert(
            'Maximum Attempts Exceeded',
            'You have used all attempts. Please ask the customer for a new OTP.'
          );
        }
      } else {
        Alert.alert('Error', errorMessage);
      }
      
      setEnteredOTP('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestNewOTP = async () => {
    Alert.alert(
      'Request New OTP',
      'Ask the customer to generate a new OTP. Do you want to continue?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Regenerate',
          onPress: async () => {
            try {
              // Pass all required parameters to regenerateOTP
              console.log('🔄 Requesting new OTP with:', { completionId, conversationId, bookingId });
              
              if (!completionId || !conversationId || !bookingId) {
                Alert.alert('Error', 'Missing required information to regenerate OTP');
                return;
              }

              await dispatch(regenerateOTP({ completionId, conversationId, bookingId })).unwrap();

              // Reset UI
              setEnteredOTP('');
              setIsExpired(false);
              const now = Date.now();
              const expiresAt = now + (5 * 60 * 1000);
              setOtpExpiresAt(expiresAt);
              setRemainingTime('05:00');

              Alert.alert('Success', 'New OTP requested. Customer should share it now.');
            } catch (err) {
              console.error('Error regenerating OTP:', err);
              const errorMessage = typeof err === 'string' ? err : err?.message || 'Failed to regenerate OTP';
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleCancelVerification = () => {
    Alert.alert(
      'Cancel Verification',
      'Are you sure you want to go back?',
      [
        { text: 'Stay', onPress: () => {} },
        { text: 'Go Back', onPress: () => navigation.goBack() }
      ]
    );
  };

  const handleGoHome = () => {
    Alert.alert(
      'Go to Home',
      'Are you sure you want to go home? You can return to this OTP verification later.',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Go Home',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          }
        }
      ]
    );
  };

  const attemptsRemaining = MAX_ATTEMPTS - otpAttempts;
  const isMaxAttemptsReached = otpAttempts >= MAX_ATTEMPTS;

  // Show loading while fetching completionId
  if (fetchingCompletion) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Finding OTP session...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Enter OTP from Customer</Text>
          <Text style={styles.headerSubtitle}>
            To verify and release payment
          </Text>
        </View>

        {/* Customer Info Box */}
        {amount && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Payment Amount</Text>
            <Text style={styles.infoValue}>₹{amount.toLocaleString('en-IN')}</Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionIcon}>👂</Text>
          <Text style={styles.instructionText}>
            Ask the customer to read the 4-digit code from their app
          </Text>
        </View>

        {/* OTP Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>4-Digit OTP:</Text>
          <OTPInput
            value={enteredOTP}
            onChangeText={setEnteredOTP}
            onComplete={handleOTPComplete}
            maxAttempts={MAX_ATTEMPTS}
            editable={!(loading || isMaxAttemptsReached)}
          />
        </View>

        {/* Warning Banner for Limited Attempts */}
        {attemptsRemaining > 0 && attemptsRemaining <= 2 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Only {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining
            </Text>
          </View>
        )}

        {/* Attempts Counter */}
        <View style={[
          styles.attemptsBox,
          isMaxAttemptsReached && styles.attemptsBoxError
        ]}>
          <Text style={[
            styles.attemptsText,
            isMaxAttemptsReached && styles.attemptsTextError
          ]}>
            Attempts: {otpAttempts}/{MAX_ATTEMPTS}
            {attemptsRemaining > 0 && ` (${attemptsRemaining} remaining)`}
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>❌ Verification Failed</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            {isMaxAttemptsReached && (
              <Text style={styles.errorHint}>
                Maximum attempts exceeded. Ask customer for a new OTP.
              </Text>
            )}
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Verifying OTP...</Text>
          </View>
        )}

        {/* Success State */}
        {success && (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>OTP Verified!</Text>
            <Text style={styles.successSubtext}>Payment is being released...</Text>
          </View>
        )}

        {/* Important Notes */}
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>📝 Tips:</Text>
          <Text style={styles.noteItem}>• You have {MAX_ATTEMPTS} attempts</Text>
          <Text style={styles.noteItem}>• Generate new OTP if needed to reset attempts</Text>
          <Text style={styles.noteItem}>• Payment will be credited after verification</Text>
        </View>

        {/* Buttons */}
        {!success && (
          <>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!enteredOTP || enteredOTP.length !== 4 || isSubmitting) && styles.buttonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!enteredOTP || enteredOTP.length !== 4 || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>✓ Submit OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelVerification}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>← Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleGoHome}
              disabled={isSubmitting}
            >
              <Text style={styles.homeButtonText}>🏠 Go to Home</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Keep the customer on the line until OTP is verified
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  contentContainer: {
    paddingBottom: 40
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#E3F2FD',
    fontWeight: '500'
  },
  infoBox: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759'
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4
  },
  infoValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#34C759'
  },
  instructionBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  instructionIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  instructionText: {
    fontSize: 14,
    color: '#0D47A1',
    fontWeight: '600',
    textAlign: 'center'
  },
  inputContainer: {
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  timerBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107'
  },
  timerExpired: {
    backgroundColor: '#F8D7DA',
    borderLeftColor: '#DC3545'
  },
  timerLabel: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 4
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF9800'
  },
  timerValueExpired: {
    color: '#DC3545'
  },
  expiredMessage: {
    fontSize: 12,
    color: '#DC3545',
    marginTop: 8,
    fontWeight: '600'
  },
  attemptsBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  attemptsBoxError: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30'
  },
  attemptsText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center'
  },
  attemptsTextError: {
    color: '#C62828'
  },
  warningBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center'
  },
  errorBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFE8E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30'
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 4
  },
  errorMessage: {
    fontSize: 12,
    color: '#C62828',
    lineHeight: 16,
    marginBottom: 4
  },
  errorHint: {
    fontSize: 11,
    color: '#B71C1C',
    fontStyle: 'italic',
    marginTop: 4
  },
  loadingBox: {
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 12
  },
  successBox: {
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759'
  },
  successIcon: {
    fontSize: 50,
    marginBottom: 12
  },
  successText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4
  },
  successSubtext: {
    fontSize: 13,
    color: '#388E3C'
  },
  notesBox: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8
  },
  noteItem: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4
  },
  requestButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF'
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF'
  },
  submitButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center'
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF'
  },
  cancelButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  homeButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center'
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  footer: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  footerText: {
    fontSize: 12,
    color: '#8B4513',
    textAlign: 'center',
    fontWeight: '600'
  }
});

export { OTPVerificationScreen };
