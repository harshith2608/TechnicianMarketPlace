import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentPayment, selectPaymentLoading } from '../redux/paymentSlice';
import { formatCurrency } from '../utils/paymentConfig';

const { width } = Dimensions.get('window');

/**
 * PaymentConfirmationScreen - Displays payment success/failure and receipt
 */
const PaymentConfirmationScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const [status, setStatus] = useState('processing'); // processing, success, failed
  const [receipt, setReceipt] = useState(null);

  const currentPayment = useSelector(selectCurrentPayment);
  const loading = useSelector(selectPaymentLoading);

  const { payment, bookingId } = route.params || {};

  useEffect(() => {
    // Update status based on payment object
    if (payment) {
      if (payment.status === 'completed' || payment.status === 'captured') {
        setStatus('success');
      } else if (payment.status === 'failed') {
        setStatus('failed');
      }
      setReceipt(payment);
    }
  }, [payment]);

  /**
   * Go back to home after success
   */
  const handleNavigateBack = () => {
    if (status === 'success') {
      // Navigate to Home instead of Bookings to avoid navigation loop
      // (BookingsScreen → PaymentConfirmation → Bookings creates a back button loop)
      navigation.navigate('Home');
    } else {
      navigation.goBack();
    }
  };

  /**
   * Render success view
   */
  const renderSuccess = () => (
    <View style={styles.container}>
      <View style={styles.successHeader}>
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSubtitle}>Your payment has been processed</Text>
      </View>

      {receipt && (
        <ScrollView style={styles.receiptContainer} showsVerticalScrollIndicator={false}>
          {/* Receipt Card */}
          <View style={styles.receiptCard}>
            <Text style={styles.receiptTitle}>Payment Receipt</Text>

            {/* Payment Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Details</Text>
              
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Transaction ID:</Text>
                <Text style={styles.receiptValue}>{receipt.transactionId}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Order ID:</Text>
                <Text style={styles.receiptValue}>{receipt.orderId}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment Method:</Text>
                <Text style={styles.receiptValue}>
                  {receipt.paymentMethod || 'Online Payment'}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status:</Text>
                <Text style={[styles.receiptValue, styles.statusSuccess]}>
                  {receipt.status?.toUpperCase() || 'COMPLETED'}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Date & Time:</Text>
                <Text style={styles.receiptValue}>
                  {receipt.createdAt
                    ? new Date(receipt.createdAt).toLocaleString('en-IN')
                    : 'Just now'}
                </Text>
              </View>
            </View>

            {/* Amount Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amount Details</Text>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount Paid:</Text>
                <Text style={styles.receiptValue}>
                  {formatCurrency(receipt.amount)}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Commission:</Text>
                <Text style={styles.commissionText}>
                  −{formatCurrency(receipt.commission || 0)}
                </Text>
              </View>

              <View style={[styles.receiptRow, styles.totalAmountRow]}>
                <Text style={styles.receiptLabel}>Technician Receives:</Text>
                <Text style={styles.technicianAmount}>
                  {formatCurrency(receipt.technicianEarnings || 0)}
                </Text>
              </View>
            </View>

            {/* Service Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Information</Text>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Service:</Text>
                <Text style={styles.receiptValue}>{receipt.description}</Text>
              </View>

              {receipt.technicianName && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Technician:</Text>
                  <Text style={styles.receiptValue}>{receipt.technicianName}</Text>
                </View>
              )}
            </View>

            {/* Refund Policy */}
            <View style={styles.policyCard}>
              <Text style={styles.policyTitle}>Refund Policy</Text>
              <Text style={styles.policyText}>
                • Full refund within 3 hours of payment
              </Text>
              <Text style={styles.policyText}>
                • 80% refund within 1 hour before service begins
              </Text>
              <Text style={styles.policyText}>
                • No refund once service is in progress
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.downloadButton}>
            <Text style={styles.downloadButtonText}>📥 Download Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.shareButtonText}>📤 Share Receipt</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}

      {/* Continue Button */}
      <TouchableOpacity style={styles.continueButton} onPress={handleNavigateBack}>
        <Text style={styles.continueButtonText}>Back to Booking</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render failed view
   */
  const renderFailed = () => (
    <View style={styles.container}>
      <View style={styles.failedHeader}>
        <View style={styles.failmark}>
          <Text style={styles.failmarkText}>✕</Text>
        </View>
        <Text style={styles.failedTitle}>Payment Failed</Text>
        <Text style={styles.failedSubtitle}>Your payment could not be processed</Text>
      </View>

      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>What went wrong?</Text>
        <Text style={styles.errorMessage}>
          {receipt?.errorMessage || 'An error occurred while processing your payment.'}
        </Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.retryButton} onPress={handleNavigateBack}>
          <Text style={styles.retryButtonText}>← Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportButton}>
          <Text style={styles.supportButtonText}>📞 Contact Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Render processing view
   */
  const renderProcessing = () => (
    <View style={styles.container}>
      <View style={styles.processingHeader}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.processingTitle}>Processing Payment...</Text>
        <Text style={styles.processingSubtitle}>Please wait while we process your payment</Text>
      </View>

      <View style={styles.spinnerCard}>
        <Text style={styles.spinnerText}>Do not close this app or go back</Text>
        <Text style={styles.spinnerText}>This usually takes less than 30 seconds</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      {status === 'success' && renderSuccess()}
      {status === 'failed' && renderFailed()}
      {status === 'processing' && renderProcessing()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#4CAF50',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  successHeader: {
    backgroundColor: '#4CAF50',
    paddingVertical: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingTop: 40,
  },
  checkmark: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmarkText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  receiptContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    paddingBottomWidth: 1,
    paddingBottom: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6200EE',
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 4,
  },
  receiptLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  receiptValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  statusSuccess: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  commissionText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  totalAmountRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  technicianAmount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  policyCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  policyText: {
    fontSize: 12,
    color: '#388E3C',
    marginBottom: 4,
    lineHeight: 16,
  },
  downloadButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6200EE',
  },
  shareButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6200EE',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacing: {
    height: 20,
  },
  failedHeader: {
    backgroundColor: '#F44336',
    paddingVertical: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingTop: 40,
  },
  failmark: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  failmarkText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  failedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  failedSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  errorCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6200EE',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  supportButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6200EE',
  },
  processingHeader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
  },
  processingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  spinnerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  spinnerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default PaymentConfirmationScreen;
