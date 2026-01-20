import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  requestPayout,
  selectPaymentLoading,
  selectPaymentSuccess,
} from '../redux/paymentSlice';
import { PAYMENT_CONFIG } from '../utils/paymentConfig';

/**
 * PayoutSettingsScreen - Bank account and payout configuration
 */
const PayoutSettingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: '',
  });
  const [payoutMethod, setPayoutMethod] = useState('bank'); // bank or upi
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
  const [errors, setErrors] = useState({});
  const [savedDetails, setSavedDetails] = useState(null);

  const loading = useSelector(selectPaymentLoading);
  const success = useSelector(selectPaymentSuccess);

  useEffect(() => {
    // Show success message
    if (success) {
      Alert.alert('Success', 'Payout settings updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [success]);

  /**
   * Validate bank details
   */
  const validateBankDetails = () => {
    const newErrors = {};

    if (!bankDetails.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!bankDetails.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (bankDetails.accountNumber.length < 9 || bankDetails.accountNumber.length > 18) {
      newErrors.accountNumber = 'Account number should be 9-18 digits';
    }

    if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }

    if (!bankDetails.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC code format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Validate UPI ID
   */
  const validateUPI = () => {
    const newErrors = {};

    if (!bankDetails.upiId.trim()) {
      newErrors.upiId = 'UPI ID is required';
    } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/.test(bankDetails.upiId)) {
      newErrors.upiId = 'Invalid UPI ID format (e.g., name@bank)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Save payout settings
   */
  const handleSaveSettings = async () => {
    const isValid = payoutMethod === 'bank' ? validateBankDetails() : validateUPI();

    if (!isValid) return;

    try {
      const payoutData = {
        method: payoutMethod,
        ...(payoutMethod === 'bank'
          ? {
              accountNumber: bankDetails.accountNumber,
              ifscCode: bankDetails.ifscCode,
              accountHolderName: bankDetails.accountHolderName,
            }
          : {
              upiId: bankDetails.upiId,
            }),
        autoPayoutEnabled,
      };

      // In real implementation, this would save to Firestore
      setSavedDetails(payoutData);

      Alert.alert('Success', 'Payout settings saved successfully');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save payout settings');
    }
  };

  /**
   * Request immediate payout
   */
  const handleRequestPayout = async () => {
    if (!savedDetails) {
      Alert.alert('Setup Required', 'Please save your payout details first');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Unable to identify technician');
      return;
    }

    // Get available balance to payout
    const availableBalance = user?.totalEarnings || 0;

    if (availableBalance < PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD) {
      Alert.alert(
        'Insufficient Balance',
        `Minimum payout amount is ₹${PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD}. Your current balance is ₹${availableBalance.toFixed(2)}`
      );
      return;
    }

    Alert.alert(
      'Request Payout',
      `Are you sure you want to request a payout of ₹${availableBalance.toFixed(2)}?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await dispatch(requestPayout({
                technicianId: user.id,
                amount: availableBalance,
                accountType: payoutMethod,
                accountDetails: payoutMethod === 'bank'
                  ? {
                      accountNumber: savedDetails.accountNumber,
                      ifscCode: savedDetails.ifscCode,
                      accountHolderName: savedDetails.accountHolderName,
                    }
                  : {
                      upiId: savedDetails.upiId,
                    },
              })).unwrap();
              Alert.alert('Success', 'Payout request submitted successfully');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to request payout');
            }
          },
        },
      ]
    );
  };

  /**
   * Render bank details form
   */
  const renderBankForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.formTitle}>Bank Account Details</Text>

      {/* Account Holder Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Account Holder Name</Text>
        <TextInput
          style={[styles.input, errors.accountHolderName && styles.inputError]}
          placeholder="Enter your name"
          value={bankDetails.accountHolderName}
          onChangeText={(text) => {
            setBankDetails({ ...bankDetails, accountHolderName: text });
            setErrors({ ...errors, accountHolderName: null });
          }}
          editable={!loading}
          placeholderTextColor="#999"
        />
        {errors.accountHolderName && (
          <Text style={styles.errorText}>{errors.accountHolderName}</Text>
        )}
      </View>

      {/* Account Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Account Number</Text>
        <TextInput
          style={[styles.input, errors.accountNumber && styles.inputError]}
          placeholder="Enter your account number"
          keyboardType="numeric"
          value={bankDetails.accountNumber}
          onChangeText={(text) => {
            setBankDetails({ ...bankDetails, accountNumber: text });
            setErrors({ ...errors, accountNumber: null });
          }}
          editable={!loading}
          placeholderTextColor="#999"
        />
        {errors.accountNumber && (
          <Text style={styles.errorText}>{errors.accountNumber}</Text>
        )}
      </View>

      {/* Confirm Account Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm Account Number</Text>
        <TextInput
          style={[styles.input, errors.confirmAccountNumber && styles.inputError]}
          placeholder="Re-enter your account number"
          keyboardType="numeric"
          value={bankDetails.confirmAccountNumber}
          onChangeText={(text) => {
            setBankDetails({ ...bankDetails, confirmAccountNumber: text });
            setErrors({ ...errors, confirmAccountNumber: null });
          }}
          editable={!loading}
          placeholderTextColor="#999"
        />
        {errors.confirmAccountNumber && (
          <Text style={styles.errorText}>{errors.confirmAccountNumber}</Text>
        )}
      </View>

      {/* IFSC Code */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>IFSC Code</Text>
        <TextInput
          style={[styles.input, errors.ifscCode && styles.inputError]}
          placeholder="e.g., SBIN0001234"
          value={bankDetails.ifscCode}
          onChangeText={(text) => {
            setBankDetails({ ...bankDetails, ifscCode: text.toUpperCase() });
            setErrors({ ...errors, ifscCode: null });
          }}
          editable={!loading}
          placeholderTextColor="#999"
        />
        {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
      </View>

      <Text style={styles.helperText}>
        Find your IFSC code on your bank's website or checkbook
      </Text>
    </View>
  );

  /**
   * Render UPI form
   */
  const renderUPIForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.formTitle}>UPI Details</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>UPI ID</Text>
        <TextInput
          style={[styles.input, errors.upiId && styles.inputError]}
          placeholder="e.g., name@okhdfcbank"
          value={bankDetails.upiId}
          onChangeText={(text) => {
            setBankDetails({ ...bankDetails, upiId: text });
            setErrors({ ...errors, upiId: null });
          }}
          editable={!loading}
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
        {errors.upiId && <Text style={styles.errorText}>{errors.upiId}</Text>}
      </View>

      <Text style={styles.helperText}>
        You can find your UPI ID in your bank's app or by asking customer support
      </Text>

      <View style={styles.upiHints}>
        <Text style={styles.hintsTitle}>Common UPI Providers:</Text>
        <Text style={styles.hint}>• @okhdfcbank (HDFC Bank)</Text>
        <Text style={styles.hint}>• @okaxis (Axis Bank)</Text>
        <Text style={styles.hint}>• @okicici (ICICI Bank)</Text>
        <Text style={styles.hint}>• @oksbi (SBI)</Text>
        <Text style={styles.hint}>• @oksamsungsahibank (Samsung Pay)</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Payout Settings</Text>
          <Text style={styles.subtitle}>Configure where and how to receive your earnings</Text>
      </View>

      {/* Earnings Overview */}
      <View style={styles.earningsCard}>
        <View style={styles.earningRow}>
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>Total Earnings</Text>
            <Text style={styles.earningAmount}>₹{(user?.totalEarnings || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.earningDivider} />
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>Available for Withdrawal</Text>
            <Text style={styles.earningAmount}>₹{Math.max(0, (user?.totalEarnings || 0)).toFixed(2)}</Text>
            {(user?.totalEarnings || 0) < PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD && (
              <Text style={styles.earningNote}>
                Min: ₹{PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD}
              </Text>
            )}
          </View>
        </View>
        {user?.lastPayoutDate && (
          <View style={styles.lastPayoutInfo}>
            <Text style={styles.lastPayoutLabel}>
              Last Payout: {new Date(user.lastPayoutDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Payout Method Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payout Method</Text>

        <View style={styles.methodButtonContainer}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              payoutMethod === 'bank' && styles.methodButtonActive,
            ]}
            onPress={() => {
              setPayoutMethod('bank');
              setErrors({});
            }}
          >
            <Text
              style={[
                styles.methodButtonText,
                payoutMethod === 'bank' && styles.methodButtonTextActive,
              ]}
            >
              🏦 Bank Transfer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              payoutMethod === 'upi' && styles.methodButtonActive,
            ]}
            onPress={() => {
              setPayoutMethod('upi');
              setErrors({});
            }}
          >
            <Text
              style={[
                styles.methodButtonText,
                payoutMethod === 'upi' && styles.methodButtonTextActive,
              ]}
            >
              📱 UPI
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Form */}
      <View style={styles.card}>
        {payoutMethod === 'bank' ? renderBankForm() : renderUPIForm()}
      </View>

      {/* Auto Payout Option */}
      <View style={styles.card}>
        <View style={styles.autoPayoutHeader}>
          <View>
            <Text style={styles.autoPayoutTitle}>Automatic Payouts</Text>
            <Text style={styles.autoPayoutDesc}>
              Automatically process payout when balance reaches ₹{PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD}
            </Text>
          </View>
          <Switch
            value={autoPayoutEnabled}
            onValueChange={setAutoPayoutEnabled}
            disabled={loading}
          />
        </View>

        {autoPayoutEnabled && (
          <View style={styles.autoPayoutInfo}>
            <Text style={styles.infoText}>
              ✓ Payouts will be processed {PAYMENT_CONFIG.PAYOUT_FREQUENCY}ly automatically
            </Text>
          </View>
        )}
      </View>

      {/* Security Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🔒 Your Information is Secure</Text>
        <Text style={styles.infoText}>
          • Bank details are encrypted and stored securely
        </Text>
        <Text style={styles.infoText}>
          • We never share your information with third parties
        </Text>
        <Text style={styles.infoText}>
          • Only used for processing your payouts
        </Text>
      </View>

      {/* Saved Details */}
      {savedDetails && (
        <View style={styles.savedCard}>
          <Text style={styles.savedTitle}>✓ Payout Details Saved</Text>
          {savedDetails.method === 'bank' ? (
            <>
              <Text style={styles.savedText}>
                Account: {savedDetails.accountNumber.slice(-4).padStart(savedDetails.accountNumber.length, '*')}
              </Text>
              <Text style={styles.savedText}>
                Holder: {savedDetails.accountHolderName}
              </Text>
            </>
          ) : (
            <Text style={styles.savedText}>UPI: {savedDetails.upiId}</Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSaveSettings}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Save Payout Details</Text>
          )}
        </TouchableOpacity>

        {savedDetails && (
          <TouchableOpacity
            style={[styles.payoutButton, loading && styles.buttonDisabled]}
            onPress={handleRequestPayout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payoutButtonText}>💸 Request Payout Now</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* FAQ */}
      <View style={styles.faqCard}>
        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How long does payout take?</Text>
          <Text style={styles.faqAnswer}>
            Bank transfers typically take 1-2 business days. UPI transfers are usually instant.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I change my payout method?</Text>
          <Text style={styles.faqAnswer}>
            Yes, you can update your payout details anytime from this screen.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>What is the minimum payout amount?</Text>
          <Text style={styles.faqAnswer}>
            Minimum payout is ₹{PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD}. Payouts are processed {PAYMENT_CONFIG.PAYOUT_FREQUENCY}ly.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Are there any payout charges?</Text>
          <Text style={styles.faqAnswer}>
            No, we don't charge any fees for processing payouts to your account.
          </Text>
        </View>
      </View>

      <View style={styles.spacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6200EE',
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  methodButtonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  methodButtonActive: {
    borderColor: '#6200EE',
    backgroundColor: '#F3E5F5',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  methodButtonTextActive: {
    color: '#6200EE',
  },
  formSection: {
    marginTop: 8,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6200EE',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  upiHints: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  hintsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  autoPayoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoPayoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  autoPayoutDesc: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  autoPayoutInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#388E3C',
    marginBottom: 4,
    lineHeight: 16,
  },
  savedCard: {
    backgroundColor: '#C8E6C9',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  savedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  savedText: {
    fontSize: 12,
    color: '#388E3C',
    marginBottom: 4,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#6200EE',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payoutButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  faqCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  faqItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  spacing: {
    height: 20,
  },
  earningsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  earningItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  earningLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  earningNote: {
    fontSize: 10,
    color: '#ff9800',
    marginTop: 4,
  },
  lastPayoutInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  lastPayoutLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default PayoutSettingsScreen;
