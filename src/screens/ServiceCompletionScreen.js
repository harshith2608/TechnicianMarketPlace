/**
 * Service Completion Screen - Customer Side
 * Shows booking details with "Work Completed" button
 * Generates OTP when clicked
 */

import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
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
import { db } from '../config/firebase';
import { initiateServiceCompletion, selectCompletionError, selectCompletionLoading } from '../redux/serviceCompletionSlice';

const ServiceCompletionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.auth.user);
  
  const { booking } = route.params || {};
  const loading = useSelector(selectCompletionLoading);
  const error = useSelector(selectCompletionError);
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [enhancedBooking, setEnhancedBooking] = useState(booking);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch missing details from Firestore if needed
  useEffect(() => {
    const fetchMissingDetails = async () => {
      if (!booking) return;
      
      
      setLoadingDetails(true);
      let enhanced = { ...booking };

      // Fetch technician name if not available
      if (!enhanced.technicianName && enhanced.technicianId) {
        try {
          const techRef = doc(db, 'users', enhanced.technicianId);
          const techDoc = await getDoc(techRef);
          if (techDoc.exists()) {
            enhanced.technicianName = techDoc.data().name || 'N/A';
          }
        } catch (err) {
          console.warn('Could not fetch technician name:', err.code);
          // Gracefully continue without technician name
        }
      }

      // Fetch service name if not available
      if (!enhanced.serviceName && enhanced.serviceId) {
        try {
          const serviceRef = doc(db, 'services', enhanced.serviceId);
          const serviceDoc = await getDoc(serviceRef);
          if (serviceDoc.exists()) {
            enhanced.serviceName = serviceDoc.data().title || 'N/A';
          } else {
            console.warn('Service document does not exist:', enhanced.serviceId);
          }
        } catch (err) {
          console.warn('Could not fetch service name:', err.code, err.message);
          // Gracefully continue without service name
        }
      } else if (!enhanced.serviceId) {
      }

      setEnhancedBooking(enhanced);
      setLoadingDetails(false);
    };

    fetchMissingDetails();
  }, [booking]);

  if (!booking) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const handleWorkCompleted = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);

    try {
      if (user?.role === 'technician') {
        // Technician just goes to OTP verification
        // They will enter the OTP that customer shows them
        navigation.navigate('OTPVerification', {
          bookingId: booking.id,
          conversationId: booking.conversationId,
          customerId: booking.customerId,
          amount: booking.estimatedPrice || booking.amount
        });
      } else {
        // CUSTOMER initiates completion (generates OTP)
        const params = {
          bookingId: booking.id,
          conversationId: booking.conversationId,
          customerId: booking.customerId,
          technicianId: booking.technicianId
        };

        // Only add payment info if it exists
        if (booking.paymentId) {
          params.paymentId = booking.paymentId;
        }
        if (booking.razorpaySignature) {
          params.razorpaySignature = booking.razorpaySignature;
        }
        if (booking.razorpayOrderId) {
          params.razorpayOrderId = booking.razorpayOrderId;
        }

        const result = await dispatch(
          initiateServiceCompletion(params)
        ).unwrap();

        // Navigate to OTPDisplay (data is in Redux)
        navigation.navigate('OTPDisplay', {
          bookingId: booking.id,
          conversationId: booking.conversationId
        });
      }
    } catch (err) {
      Alert.alert('Error', err || 'Failed to mark service as complete');
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Details</Text>
      </View>

      {/* Booking Information Card */}
      <View style={styles.card}>
        <View style={styles.section}>
          <Text style={styles.label}>Technician</Text>
          <Text style={styles.value}>{enhancedBooking?.technicianName || booking?.technicianName || 'N/A'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{enhancedBooking?.serviceName || booking?.serviceName || booking?.service?.name || booking?.description || 'N/A'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{booking?.location || 'N/A'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>Amount</Text>
          <Text style={[styles.value, styles.amount]}>
            ₹{booking?.amount ? parseInt(booking.amount).toLocaleString() : booking?.estimatedPrice ? parseInt(booking.estimatedPrice).toLocaleString() : '0'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>Booking Date</Text>
          <Text style={styles.value}>
            {booking?.scheduledDate
              ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : booking?.createdAt
              ? new Date(booking.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Information Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 How It Works</Text>
        <Text style={styles.infoText}>
          1. Click "Work Completed" below{'\n'}
          2. A 4-digit OTP will be generated{'\n'}
          3. Share the OTP with the technician{'\n'}
          4. Tech enters OTP to verify completion{'\n'}
          5. Payment is automatically released
        </Text>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Main CTA Button */}
      <TouchableOpacity
        style={[styles.button, styles.completeButton]}
        onPress={handleWorkCompleted}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="large" />
        ) : (
          <Text style={styles.buttonText}>✅ Mark Work Completed</Text>
        )}
      </TouchableOpacity>

      {/* Go to Home Button */}
      <TouchableOpacity
        style={[styles.button, styles.homeButton]}
        onPress={handleGoHome}
      >
        <Text style={styles.homeButtonText}>🏠 Go to Home</Text>
      </TouchableOpacity>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <View style={styles.overlay}>
          <View style={styles.confirmationDialog}>
            <Text style={styles.confirmTitle}>Confirm Service Completion?</Text>
            <Text style={styles.confirmMessage}>
              Once you click confirm, an OTP will be generated for the technician to verify completion and receive payment.
            </Text>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.okButton]}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.confirmButtonTextOk}>Confirm & Generate OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000'
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  section: {
    paddingVertical: 12
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  amount: {
    fontSize: 18,
    color: '#007AFF'
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0'
  },
  infoBox: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20
  },
  errorBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFE8E8',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30'
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600'
  },
  button: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  completeButton: {
    backgroundColor: '#34C759',
    marginTop: 20
  },
  homeButton: {
    backgroundColor: '#007AFF',
    marginTop: 12
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF'
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  confirmationDialog: {
    marginHorizontal: 30,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12
  },
  confirmMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F0F0F0'
  },
  okButton: {
    backgroundColor: '#34C759'
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333'
  },
  confirmButtonTextOk: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  }
});

export { ServiceCompletionScreen };
