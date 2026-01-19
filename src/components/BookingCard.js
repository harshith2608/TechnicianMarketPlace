// File: src/components/BookingCard.js
/**
 * BookingCard Component
 * Shows booking details with payment status in My Bookings list
 * Part of Phase 4: Firestore Collections & Security Rules
 */

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BookingCard = ({ booking, onPress }) => {
  const {
    id,
    serviceName,
    technicianName,
    scheduledDate,
    status,
    payment,
    paymentId,
  } = booking;

  // Determine payment status color
  const getPaymentStatusColor = () => {
    if (!payment) return '#999'; // Not yet paid
    if (payment.status === 'completed') return '#4CAF50'; // Green
    if (payment.status === 'refunded') return '#FF9800'; // Orange
    if (payment.status === 'pending') return '#2196F3'; // Blue
    return '#f44336'; // Red for failed
  };

  const getPaymentStatusText = () => {
    if (!payment) return 'Payment pending';
    if (payment.status === 'completed') return `Paid ₹${payment.totalAmount}`;
    if (payment.status === 'refunded') return 'Refunded';
    if (payment.status === 'pending') return `Pending ₹${payment.totalAmount}`;
    return 'Payment failed';
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Booking Header */}
      <View style={styles.header}>
        <Text style={styles.serviceName}>{serviceName}</Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      {/* Booking Details */}
      <View style={styles.details}>
        <Text style={styles.technicianName}>With: {technicianName}</Text>
        <Text style={styles.date}>
          {new Date(scheduledDate).toLocaleDateString('en-IN')}
        </Text>
      </View>

      {/* ⭐ PAYMENT INFO (Phase 4 Integration) */}
      <View style={[styles.paymentSection, { borderTopColor: getPaymentStatusColor() }]}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment:</Text>
          <Text 
            style={[
              styles.paymentStatus,
              { color: getPaymentStatusColor() }
            ]}
          >
            {getPaymentStatusText()}
          </Text>
        </View>

        {/* Show refund amount if applicable */}
        {payment?.status === 'refunded' && (
          <Text style={styles.refundText}>
            ↺ Refund processed
          </Text>
        )}

        {/* Show commission if paid */}
        {payment?.status === 'completed' && (
          <Text style={styles.commissionText}>
            Commission: ₹{payment.commissionAmount}
          </Text>
        )}
      </View>

      {/* Tap to view details hint */}
      <Text style={styles.tapHint}>Tap to view details</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  status: {
    fontSize: 12,
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  details: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  technicianName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#999',
  },
  paymentSection: {
    borderTopWidth: 2,
    paddingTop: 8,
    marginVertical: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  refundText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
    fontStyle: 'italic',
  },
  commissionText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  tapHint: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default BookingCard;
