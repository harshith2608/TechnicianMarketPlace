// File: src/screens/BookingDetailsScreen.js
/**
 * BookingDetailsScreen Component
 * Shows full booking details with payment information and refund options
 * Part of Phase 4: Firestore Collections & Security Rules
 */

import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { fetchBookingWithPayment, processRefundRequest } from '../services/bookingService';

const BookingDetailsScreen = ({ route, navigation }) => {
  const { conversationId, bookingId, customerId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    loadBookingDetails();
  }, []);

  const loadBookingDetails = async () => {
    try {
      const data = await fetchBookingWithPayment(
        conversationId,
        bookingId,
        customerId
      );
      setBooking(data);
    } catch (error) {
      Alert.alert('Error', 'Could not load booking details');
      console.error('Error loading booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRefund = async () => {
    Alert.alert(
      'Request Refund?',
      'Are you sure you want to request a refund for this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              setRefunding(true);
              const result = await processRefundRequest(booking.paymentId, {
                reason: 'Customer initiated refund',
                bookingId,
                conversationId: booking.conversationId,
              });
              
              Alert.alert(
                'Refund Requested',
                `Refund of ₹${result.refundAmount} has been initiated. Status will update within 3-5 days.`
              );
              
              // Reload booking details
              loadBookingDetails();
            } catch (error) {
              Alert.alert('Error', error.message || 'Could not process refund');
              console.error('Refund error:', error);
            } finally {
              setRefunding(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { payment } = booking;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Booking Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Details</Text>
        
        <DetailRow label="Service" value={booking.serviceName} />
        <DetailRow label="Technician" value={booking.technicianName} />
        <DetailRow 
          label="Date" 
          value={new Date(booking.scheduledDate).toLocaleDateString('en-IN')} 
        />
        <DetailRow label="Status" value={booking.status} />
        {booking.description && (
          <DetailRow label="Description" value={booking.description} />
        )}
      </View>

      {/* Payment Details Section */}
      {payment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <DetailRow 
            label="Service Amount" 
            value={`₹${payment.serviceAmount}`} 
          />
          <DetailRow 
            label="Commission" 
            value={`₹${payment.commissionAmount}`} 
          />
          <DetailRow 
            label="Total Paid" 
            value={`₹${payment.totalAmount}`}
            bold={true}
          />
          
          <View style={styles.statusRow}>
            <Text style={styles.label}>Payment Status</Text>
            <Text style={[
              styles.statusBadge,
              { backgroundColor: getStatusBgColor(payment.status) }
            ]}>
              {payment.status.toUpperCase()}
            </Text>
          </View>

          {/* Payment Method */}
          <DetailRow 
            label="Payment Method" 
            value={payment.paymentMethod ? payment.paymentMethod.toUpperCase() : 'Card'} 
          />

          {/* Refund Info Box */}
          {payment.status === 'refunded' && booking.refund && (
            <View style={styles.refundBox}>
              <Text style={styles.refundTitle}>✓ Refund Processed</Text>
              <DetailRow 
                label="Refund Amount" 
                value={`₹${booking.refund.metadata?.refundAmount || payment.serviceAmount}`} 
              />
              <Text style={styles.refundNote}>
                Refund will reach your account within 3-5 business days
              </Text>
            </View>
          )}

          {/* Request Refund Button */}
          {payment.status === 'completed' && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#f44336' }]}
              onPress={handleRequestRefund}
              disabled={refunding}
            >
              <Text style={styles.buttonText}>
                {refunding ? 'Processing Refund...' : 'Request Refund'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Pending Payment Notice */}
          {payment.status === 'pending' && (
            <View style={styles.pendingBox}>
              <Text style={styles.pendingTitle}>⏳ Payment Pending</Text>
              <Text style={styles.pendingText}>
                Please complete the payment to finalize this booking
              </Text>
            </View>
          )}

          {/* Failed Payment Notice */}
          {payment.status === 'failed' && (
            <View style={styles.failedBox}>
              <Text style={styles.failedTitle}>❌ Payment Failed</Text>
              <Text style={styles.failedText}>
                Please try again or contact support if the issue persists
              </Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#2196F3' }]}
                onPress={() => {/* Handle retry */}}
              >
                <Text style={styles.buttonText}>Retry Payment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* No Payment Yet */}
      {!payment && (
        <View style={styles.section}>
          <Text style={styles.noPaymentText}>
            No payment recorded for this booking yet.
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {/* Handle make payment */}}
          >
            <Text style={styles.buttonText}>Make Payment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Additional Info Section */}
      {booking.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{booking.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
};

// Helper Components
const DetailRow = ({ label, value, bold = false }) => (
  <View style={styles.detailRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, bold && styles.boldValue]}>{value}</Text>
  </View>
);

const getStatusBgColor = (status) => {
  switch(status) {
    case 'completed': return '#4CAF50';
    case 'pending': return '#2196F3';
    case 'refunded': return '#FF9800';
    case 'failed': return '#f44336';
    default: return '#999';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  boldValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2196F3',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusBadge: {
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  refundBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 6,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  refundTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 8,
  },
  refundNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  pendingBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 6,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  pendingText: {
    fontSize: 12,
    color: '#666',
  },
  failedBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 6,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  failedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 4,
  },
  failedText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noPaymentText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default BookingDetailsScreen;
