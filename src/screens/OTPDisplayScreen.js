/**
 * OTP Display Screen - Customer Side
 * Shows the 4-digit OTP to share with technician
 */

import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import OTPDisplay from '../components/OTPDisplay';
import { regenerateOTP, selectCompletionError, selectCompletionLoading, selectCurrentCompletion, selectRegeneratedCount } from '../redux/serviceCompletionSlice';

const OTPDisplayScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  // Get completion data from Redux (set when customer initiated)
  const currentCompletion = useSelector(selectCurrentCompletion);
  const loading = useSelector(selectCompletionLoading);
  const error = useSelector(selectCompletionError);
  const regeneratedCount = useSelector(selectRegeneratedCount);

  // Fallback to initial props if Redux is empty (shouldn't happen in normal flow)
  const completionId = currentCompletion?.completionId;
  const displayedOtp = currentCompletion?.otp;
  const bookingId = currentCompletion?.bookingId;
  const conversationId = currentCompletion?.conversationId;

  // Log screen mount once
  useEffect(() => {
  }, []);

  // Log OTP updates
  useEffect(() => {
    if (displayedOtp) {
    }
  }, [displayedOtp]);

  const handleRegenerateOTP = async () => {
    Alert.alert(
      'Generate New OTP?',
      'The previous OTP will be invalidated.',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              await dispatch(
                regenerateOTP({ completionId, conversationId, bookingId })
              ).unwrap();
            Alert.alert('Success', 'New OTP generated!');
            } catch (err) {
              Alert.alert('Error', err || 'Failed to regenerate OTP');
            }
          }
        }
      ]
    );
  };

  const handleBackToBooking = () => {
    navigation.goBack();
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  if (!displayedOtp) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>OTP not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✅ Service Marked Complete!</Text>
      </View>

      {/* Success Message */}
      <View style={styles.successBox}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successText}>
          Great! Your service has been marked as complete.
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>📲 Share this OTP with the Technician</Text>
        <Text style={styles.instructionText}>
          Ask the technician to enter this 4-digit code in their app to verify completion
          and receive payment.
        </Text>
      </View>

      {/* OTP Display - Large and Prominent */}
      <View style={styles.otpContainer}>
        <Text style={styles.otpLabel}>Your OTP:</Text>
        <OTPDisplay otp={displayedOtp} size="large" />
        <Text style={styles.otpInstruction}>Read these numbers to the technician</Text>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Info about Regeneration */}
      {regeneratedCount > 0 && (
        <View style={styles.regeneratedBox}>
          <Text style={styles.regeneratedText}>
            🔄 OTP regenerated {regeneratedCount} time{regeneratedCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Important Notes */}
      <View style={styles.notesBox}>
        <Text style={styles.notesTitle}>📝 Important Notes:</Text>
        <Text style={styles.noteItem}>• Keep this screen open</Text>
        <Text style={styles.noteItem}>• The technician must enter the OTP within 5 minutes</Text>
        <Text style={styles.noteItem}>• You can generate a new OTP if needed</Text>
        <Text style={styles.noteItem}>• Payment will be released after verification</Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.regenerateButton}
        onPress={handleRegenerateOTP}
        disabled={loading || regeneratedCount >= 3}
      >
        {loading ? (
          <ActivityIndicator color="#007AFF" size="small" />
        ) : (
          <Text style={styles.regenerateButtonText}>
            🔄 Generate New OTP ({regeneratedCount}/3)
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackToBooking}
      >
        <Text style={styles.backButtonText}>← Back to Booking</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.homeButton}
        onPress={handleGoHome}
      >
        <Text style={styles.homeButtonText}>🏠 Go to Home</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Payment will be credited to your account once the technician verifies the OTP.
        </Text>
      </View>
    </ScrollView>
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
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF'
  },
  successBox: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759'
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 8
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center'
  },
  instructionBox: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 6
  },
  instructionText: {
    fontSize: 13,
    color: '#0D47A1',
    lineHeight: 18
  },
  otpContainer: {
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12
  },
  otpInstruction: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic'
  },
  timerBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 16,
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
  errorBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFE8E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30'
  },
  errorBoxText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600'
  },
  regeneratedBox: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  regeneratedText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center'
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
  regenerateButton: {
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
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF'
  },
  backButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
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
  footer: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  footerText: {
    fontSize: 12,
    color: '#0D47A1',
    textAlign: 'center',
    lineHeight: 16
  }
});

export { OTPDisplayScreen };
