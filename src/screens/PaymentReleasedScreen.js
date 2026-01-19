/**
 * Payment Released Screen - Customer Success Screen
 * Shows customer that payment has been released after OTP verification
 */

import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const PaymentReleasedScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { completionId, bookingId, amount } = route.params || {};

  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [releasedAt, setReleasedAt] = useState(new Date());

  // Fetch booking details on mount
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const db = getFirestore();
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
          setBookingDetails(bookingSnap.data());
        }
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShareReceipt = async () => {
    try {
      const message = `Payment Released ✅\n\nAmount: ₹${amount?.toLocaleString('en-IN') || 'N/A'}\nService ID: ${bookingId}\n\nYour payment has been released and will appear in your account within 1-2 business days.`;

      await Share.share({
        message,
        title: 'Payment Receipt'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRateService = () => {
    navigation.navigate('RatingScreen', {
      bookingId,
      completionId
    });
  };

  const handleViewInvoice = () => {
    navigation.navigate('InvoiceScreen', {
      bookingId,
      completionId
    });
  };

  const handleBackToBookings = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'BookingsScreen' }]
    });
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#34C759" />
        <Text style={styles.loadingText}>Processing your payment...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Success Header */}
      <View style={styles.successHeader}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Payment Released!</Text>
        <Text style={styles.successSubtitle}>The technician has verified the work</Text>
      </View>

      {/* Payment Amount Box */}
      <View style={styles.amountBox}>
        <Text style={styles.amountLabel}>Amount Released</Text>
        <Text style={styles.amountValue}>
          ₹{amount?.toLocaleString('en-IN') || 'N/A'}
        </Text>
      </View>

      {/* Timeline */}
      <View style={styles.timelineBox}>
        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Service Completed</Text>
            <Text style={styles.timelineTime}>You marked work as complete</Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>OTP Verified</Text>
            <Text style={styles.timelineTime}>Technician entered the OTP</Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Payment Released</Text>
            <Text style={styles.timelineTime}>{formatDate(releasedAt)}</Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotPending]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>In Your Account</Text>
            <Text style={styles.timelineTime}>1-2 business days</Text>
          </View>
        </View>
      </View>

      {/* Booking Details */}
      {bookingDetails && (
        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>📋 Booking Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service ID:</Text>
            <Text style={styles.detailValue}>{bookingId}</Text>
          </View>

          {bookingDetails.serviceName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service:</Text>
              <Text style={styles.detailValue}>{bookingDetails.serviceName}</Text>
            </View>
          )}

          {bookingDetails.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{bookingDetails.location}</Text>
            </View>
          )}

          {bookingDetails.scheduledDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Scheduled:</Text>
              <Text style={styles.detailValue}>
                {new Date(bookingDetails.scheduledDate).toLocaleDateString('en-IN')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Important Notes */}
      <View style={styles.notesBox}>
        <Text style={styles.notesTitle}>📝 Important Information</Text>
        <Text style={styles.noteItem}>
          • Payment will be transferred to your registered bank account
        </Text>
        <Text style={styles.noteItem}>
          • Transfer typically takes 1-2 business days
        </Text>
        <Text style={styles.noteItem}>
          • You can track the payment status in your wallet
        </Text>
        <Text style={styles.noteItem}>
          • A receipt has been sent to your email
        </Text>
      </View>

      {/* What Happens Next */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 What Happens Next?</Text>
        <Text style={styles.infoText}>
          1. We'll review the booking details (instant)
        </Text>
        <Text style={styles.infoText}>
          2. Payment will be transferred to your bank account (1-2 business days)
        </Text>
        <Text style={styles.infoText}>
          3. You'll receive a notification once the payment is transferred
        </Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.ratingButton}
        onPress={handleRateService}
      >
        <Text style={styles.ratingButtonText}>⭐ Rate the Service</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.invoiceButton}
        onPress={handleViewInvoice}
      >
        <Text style={styles.invoiceButtonText}>📄 View Invoice</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShareReceipt}
      >
        <Text style={styles.shareButtonText}>📤 Share Receipt</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackToBookings}
      >
        <Text style={styles.backButtonText}>← Back to Bookings</Text>
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
          Questions? Contact our support team at support@technicianmarketplace.com
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  contentContainer: {
    paddingBottom: 40
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600'
  },
  successHeader: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center'
  },
  successIcon: {
    fontSize: 60,
    marginBottom: 12
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4
  },
  successSubtitle: {
    fontSize: 13,
    color: '#E8F5E9',
    fontWeight: '500'
  },
  amountBox: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  amountLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#34C759'
  },
  timelineBox: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 12
  },
  timelineItem: {
    flexDirection: 'row',
    marginVertical: 8
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
    backgroundColor: '#DDD'
  },
  timelineDotCompleted: {
    backgroundColor: '#34C759'
  },
  timelineDotPending: {
    backgroundColor: '#FFC107'
  },
  timelineLine: {
    marginLeft: 6,
    marginVertical: 0,
    height: 24,
    borderLeftWidth: 2,
    borderLeftColor: '#E0E0E0'
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333'
  },
  timelineTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2
  },
  detailsBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600'
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600'
  },
  notesBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 8
  },
  noteItem: {
    fontSize: 12,
    color: '#0D47A1',
    lineHeight: 18,
    marginBottom: 4
  },
  infoBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107'
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 8
  },
  infoText: {
    fontSize: 12,
    color: '#8B4513',
    lineHeight: 18,
    marginBottom: 4
  },
  ratingButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center'
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  },
  invoiceButton: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center'
  },
  invoiceButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  },
  shareButton: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center'
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  },
  backButton: {
    marginHorizontal: 16,
    marginVertical: 12,
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
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  },
  footer: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  footerText: {
    fontSize: 11,
    color: '#2E7D32',
    textAlign: 'center',
    lineHeight: 14
  }
});

export { PaymentReleasedScreen };
