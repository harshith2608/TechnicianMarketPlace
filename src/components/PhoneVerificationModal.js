import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COUNTRY_CODES } from '../constants/countryCodes';
import {
    resetError,
    sendPhoneOTP,
    setCountryCode,
    setOTP,
    setPhoneNumber,
    verifyPhoneOTP
} from '../redux/phoneAuthSlice';
import { validatePhoneNumber } from '../utils/phoneValidation';

export const PhoneVerificationModal = ({ visible, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const {
    phoneNumber,
    countryCode,
    otpSent,
    otp,
    isPhoneVerified,
    loading,
    error,
    success,
    verificationId,
    otpExpiryTime,
    verificationAttempts,
  } = useSelector((state) => state.phoneAuth);

  const [timeLeft, setTimeLeft] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Timer for OTP expiry
  useEffect(() => {
    if (!otpExpiryTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((otpExpiryTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [otpExpiryTime]);

  const handleSendOTP = async () => {
    const validation = validatePhoneNumber(phoneNumber, countryCode);
    if (!validation.valid) {
      dispatch(
        resetError()
      );
      return;
    }

    dispatch(
      sendPhoneOTP({
        phoneNumber,
        countryCode,
      })
    );
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      return;
    }

    if (verificationAttempts >= 3) {
      return;
    }

    dispatch(
      verifyPhoneOTP({
        confirmationResult: verificationId,
        otp,
      })
    );
  };

  const handleVerificationSuccess = () => {
    if (isPhoneVerified && onSuccess) {
      onSuccess();
    }
  };

  useEffect(() => {
    if (isPhoneVerified) {
      const timer = setTimeout(() => {
        handleVerificationSuccess();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isPhoneVerified]);

  const canResendOTP = otpExpiryTime && Date.now() > otpExpiryTime - 2 * 60 * 1000; // Can resend after 8 minutes
  const isOTPExpired = timeLeft === 0 && otpSent && !isPhoneVerified;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Verify Phone Number</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Success State */}
          {isPhoneVerified ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Phone Verified!</Text>
              <Text style={styles.successMessage}>Your phone number has been verified successfully</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {/* Phone Input Section */}
              {!otpSent ? (
                <>
                  <Text style={styles.sectionLabel}>Enter Phone Number</Text>

                  <View style={styles.phoneInputContainer}>
                    {/* Country Code Picker */}
                    <TouchableOpacity
                      style={styles.countryCodeButton}
                      onPress={() => setShowCountryPicker(!showCountryPicker)}
                    >
                      <Text style={styles.countryCodeText}>{countryCode}</Text>
                      <Text style={styles.dropdownIcon}>▼</Text>
                    </TouchableOpacity>

                    {/* Phone Input */}
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="10 digits"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phoneNumber}
                      onChangeText={(text) =>
                        dispatch(setPhoneNumber(text.replace(/\D/g, '')))
                      }
                      editable={!loading}
                    />
                  </View>

                  {/* Country Code Picker Dropdown */}
                  {showCountryPicker && (
                    <View style={styles.countryPickerDropdown}>
                      {COUNTRY_CODES.map((country) => (
                        <TouchableOpacity
                          key={country.id}
                          style={styles.countryOption}
                          onPress={() => {
                            dispatch(setCountryCode(country.code));
                            setShowCountryPicker(false);
                          }}
                        >
                          <Text style={styles.countryFlag}>{country.flag}</Text>
                          <View style={styles.countryInfo}>
                            <Text style={styles.countryName}>{country.name}</Text>
                            <Text style={styles.countryCode}>{country.code}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Error Message */}
                  {error && <Text style={styles.errorText}>{error}</Text>}

                  {/* Send OTP Button */}
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSendOTP}
                    disabled={loading || !phoneNumber}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* OTP Input Section */}
                  <Text style={styles.sectionLabel}>Enter Verification Code</Text>
                  <Text style={styles.phoneNumberDisplay}>
                    Code sent to {countryCode} {phoneNumber.replace(/(.{0,5})(.*)/, '$1••••')}
                  </Text>

                  {/* OTP Input */}
                  <TextInput
                    style={styles.otpInput}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(text) => dispatch(setOTP(text.replace(/\D/g, '')))}
                    editable={!loading && !isOTPExpired}
                  />

                  {/* Development Mode Hint */}
                  <Text style={styles.devModeHint}>
                    🔧 Testing? Enter code: <Text style={styles.devModeCode}>000000</Text>
                  </Text>

                  {/* Timer */}
                  {timeLeft > 0 ? (
                    <Text style={styles.timerText}>
                      Expires in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                    </Text>
                  ) : otpSent && !isPhoneVerified ? (
                    <Text style={styles.expiredText}>OTP Expired. Request a new one.</Text>
                  ) : null}

                  {/* Verification Attempts */}
                  {verificationAttempts > 0 && verificationAttempts < 3 && (
                    <Text style={styles.attemptsText}>
                      Attempts remaining: {3 - verificationAttempts}
                    </Text>
                  )}

                  {verificationAttempts >= 3 && (
                    <Text style={styles.attemptsExceededText}>
                      Too many attempts. Please request a new OTP.
                    </Text>
                  )}

                  {/* Error Message */}
                  {error && <Text style={styles.errorText}>{error}</Text>}

                  {/* Success Message */}
                  {success && <Text style={styles.successText}>{success}</Text>}

                  {/* Verify Button */}
                  <TouchableOpacity
                    style={[
                      styles.button,
                      (loading || otp.length !== 6 || isOTPExpired || verificationAttempts >= 3) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleVerifyOTP}
                    disabled={loading || otp.length !== 6 || isOTPExpired || verificationAttempts >= 3}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>

                  {/* Resend Button */}
                  {(canResendOTP || isOTPExpired) && (
                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={handleSendOTP}
                      disabled={loading}
                    >
                      <Text style={styles.resendButtonText}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}

                  {/* Back Button */}
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      dispatch(setPhoneNumber(''));
                      dispatch(setOTP(''));
                    }}
                  >
                    <Text style={styles.backButtonText}>Change Phone Number</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  countryCodeButton: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9f9f9',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dropdownIcon: {
    fontSize: 10,
    color: '#999',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  countryPickerDropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 250,
  },
  countryOption: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  countryCode: {
    fontSize: 12,
    color: '#999',
  },
  phoneNumberDisplay: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  devModeHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  devModeCode: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  timerText: {
    fontSize: 12,
    color: '#FFA500',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  expiredText: {
    fontSize: 12,
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  attemptsText: {
    fontSize: 12,
    color: '#FFA500',
    textAlign: 'center',
    marginBottom: 12,
  },
  attemptsExceededText: {
    fontSize: 12,
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#DC3545',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    color: '#28a745',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  successIcon: {
    fontSize: 80,
    color: '#28a745',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
