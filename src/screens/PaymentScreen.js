import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Use mock for Expo Go simulator, real package for native builds
let RazorpayCheckout;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  // Fallback to mock if native module not available (Expo Go)
  RazorpayCheckout = require('../services/razorpayMock').default;
  console.log('⚠️ Using Razorpay mock for simulator testing');
}

import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '../redux/authSlice';
import {
    initializePayment,
    processPaymentSuccess,
    selectPaymentError,
    selectPaymentLoading
} from '../redux/paymentSlice';
import { PAYMENT_CONFIG, formatCurrency, getPaymentBreakdown } from '../utils/paymentConfig';

const { width } = Dimensions.get('window');

/**
 * PaymentScreen - Main payment form for customers
 * Displays service amount, commission breakdown, and initiates Razorpay payment
 */
const PaymentScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const loading = useSelector(selectPaymentLoading);
  const error = useSelector(selectPaymentError);
  const user = useSelector(selectUser);

  // Get booking details from route params
  const { 
    conversationId, 
    serviceId,
    serviceName, 
    servicePrice, 
    technicianName, 
    technicianId,
    customerId: routeCustomerId,
    scheduledDate,
    location,
    description,
    estimatedPrice
  } = route.params || {};
  
  // Get current user ID from Redux auth state (fallback to route param)
  const customerId = user?.id || routeCustomerId;
  
  // Initialize with service price
  const serviceTitle = serviceName;
  const [amount] = useState(servicePrice || 0);
  const [breakdown, setBreakdown] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate breakdown on mount or when amount changes
  useEffect(() => {
    if (amount !== null && amount !== undefined && !isNaN(amount)) {
      const bd = getPaymentBreakdown(parseFloat(amount));
      setBreakdown(bd);
    }
  }, [amount]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Payment Error', error, [{ text: 'OK' }]);
    }
  }, [error]);

  /**
   * Initiate Razorpay payment with fixed service price
   */
  const handlePayment = async () => {
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    if (!customerId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      // Initialize payment order (creates Razorpay order)
      const paymentResult = await dispatch(
        initializePayment({
          amount: parseFloat(amount),
          description: serviceTitle,
          conversationId,
          customerId,
          technicianId,
          currency: 'INR',
        })
      ).unwrap();

      const { orderId, tempBookingId } = paymentResult;

      // Open Razorpay checkout
      const options = {
        description: serviceTitle,
        image: 'https://your-logo-url.png', // Update with actual logo
        currency: 'INR',
        key: PAYMENT_CONFIG.RAZORPAY_KEY_ID,
        amount: parseFloat(amount) * 100, // Amount in paise
        order_id: orderId,
        name: 'Technician MarketPlace',
        prefill: {
          email: '', // Add from user context if available
          contact: '', // Add from user context if available
        },
        theme: { color: '#6200EE' },
      };

      RazorpayCheckout.open(options)
        .then(async (data) => {
          // Payment successful, now verify signature and capture
          await handlePaymentSuccess(data, orderId, tempBookingId);
        })
        .catch((error) => {
          if (error.code === 0) {
            Alert.alert('Payment Cancelled', 'You cancelled the payment');
          } else {
            Alert.alert('Payment Failed', error.description || 'Something went wrong');
          }
        });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to initialize payment');
    }
  };

  /**
   * Handle successful payment - verify signature and capture
   */
  const handlePaymentSuccess = async (data, orderId, tempBookingId) => {
    try {
      if (!customerId || !technicianId || !conversationId) {
        throw new Error('Missing user or booking information');
      }

      // Verify signature and capture payment AND create booking
      const result = await dispatch(
        processPaymentSuccess({
          tempBookingId,
          orderId,
          conversationId,
          customerId,
          technicianId,
          serviceId,
          serviceName,
          scheduledDate,
          location,
          description,
          estimatedPrice,
          razorpayPaymentId: data.razorpay_payment_id,
          razorpayOrderId: data.razorpay_order_id,
          razorpaySignature: data.razorpay_signature,
          paymentMethod: 'razorpay',
        })
      ).unwrap();

      // Navigate to confirmation screen
      navigation.navigate('PaymentConfirmation', {
        payment: result,
        bookingId: result.bookingId,
      });
    } catch (err) {
      Alert.alert('Payment Processing Failed', err.message || 'Failed to process payment');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Payment</Text>
          <Text style={styles.subtitle}>{serviceTitle}</Text>
          {technicianName && (
            <Text style={styles.technicianName}>Technician: {technicianName}</Text>
          )}
        </View>

      {/* Service Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Service Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Service:</Text>
          <Text style={styles.value}>{serviceTitle}</Text>
        </View>
        {technicianName && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Technician:</Text>
            <Text style={styles.value}>{technicianName}</Text>
          </View>
        )}
      </View>

      {/* Amount Display Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Amount</Text>
        <View style={styles.amountDisplayContainer}>
          <Text style={styles.amountLabel}>Service Price:</Text>
          <Text style={styles.amountDisplay}>{formatCurrency(amount)}</Text>
        </View>
      </View>

      {/* Payment Breakdown */}
      {breakdown && (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.breakdownHeader}
            onPress={() => setShowBreakdown(!showBreakdown)}
          >
            <Text style={styles.cardTitle}>Payment Breakdown</Text>
            <Text style={styles.expandIcon}>{showBreakdown ? '−' : '+'}</Text>
          </TouchableOpacity>

          {showBreakdown && (
            <View style={styles.breakdownDetails}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Service Amount:</Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(breakdown.bookingAmount)}
                </Text>
              </View>
              
              <View style={[styles.breakdownRow, styles.commissionRow]}>
                <Text style={styles.breakdownLabel}>
                  Commission ({PAYMENT_CONFIG.COMMISSION_RATE * 100}%):
                </Text>
                <Text style={styles.commissionValue}>
                  −{formatCurrency(breakdown.commission)}
                </Text>
              </View>
              
              <View style={[styles.breakdownRow, styles.totalRow]}>
                <Text style={styles.breakdownLabel}>Amount to Technician:</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(breakdown.technicianEarnings)}
                </Text>
              </View>

              {breakdown.commission > 0 && (
                <Text style={styles.disclaimerText}>
                  Note: Commission is {PAYMENT_CONFIG.COMMISSION_RATE * 100}% of service amount, capped at ₹{PAYMENT_CONFIG.COMMISSION_CAP}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Payment Information</Text>
        <Text style={styles.infoText}>
          • Payment is processed securely via Razorpay
        </Text>
        <Text style={styles.infoText}>
          • You can request a refund within {PAYMENT_CONFIG.REFUND_POLICY.FULL_REFUND_WINDOW_HOURS} hours
        </Text>
        <Text style={styles.infoText}>
          • Your payment is protected by our secure encryption
        </Text>
      </View>

      {/* Pay Button */}
      <TouchableOpacity
        style={[styles.payButton, loading && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.payButtonText}>Pay </Text>
            <Text style={styles.payButtonAmount}>
              {amount ? formatCurrency(parseFloat(amount)) : '₹0'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.spacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#6200EE',
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
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  technicianName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    paddingLeft: 12,
    backgroundColor: '#f9f9f9',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200EE',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 18,
    color: '#1a1a1a',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandIcon: {
    fontSize: 24,
    color: '#6200EE',
    fontWeight: 'bold',
  },
  breakdownDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  commissionRow: {
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  commissionValue: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  totalValue: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
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
    fontSize: 13,
    color: '#388E3C',
    marginBottom: 4,
    lineHeight: 18,
  },
  payButton: {
    backgroundColor: '#6200EE',
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6200EE',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  payButtonAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  amountDisplayContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  amountDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  spacing: {
    height: 20,
  },
});

export default PaymentScreen;
