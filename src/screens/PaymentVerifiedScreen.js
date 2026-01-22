/**
 * Payment Verified Screen - Technician Success Screen
 * Shows technician that OTP was verified and payment is being released
 */

import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PaymentVerifiedScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { completionId, bookingId, conversationId, amount } = route.params || {};

  const [bookingDetails, setBookingDetails] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifiedAt] = useState(new Date());

  // Fetch booking and user details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const db = getFirestore();

        // Fetch booking from nested path if conversationId provided
        if (conversationId && bookingId) {
          const bookingRef = doc(db, 'conversations', conversationId, 'bookings', bookingId);
          const bookingSnap = await getDoc(bookingRef);
          if (bookingSnap.exists()) {
            setBookingDetails(bookingSnap.data());

            // Fetch customer details if customerId exists
            if (bookingSnap.data().customerId) {
              try {
                const userRef = doc(db, 'users', bookingSnap.data().customerId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  setUserDetails(userSnap.data());
                }
              } catch (userError) {
                // User fetch failed (possibly permissions), but booking details are still available
                console.log('Could not fetch user details, continuing with booking data');
              }
            }
          }
        } else if (bookingId) {
          // Fallback to top-level booking (for backward compatibility)
          const bookingRef = doc(db, 'bookings', bookingId);
          const bookingSnap = await getDoc(bookingRef);
          if (bookingSnap.exists()) {
            setBookingDetails(bookingSnap.data());

            // Fetch customer details if customerId exists
            if (bookingSnap.data().customerId) {
              try {
                const userRef = doc(db, 'users', bookingSnap.data().customerId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  setUserDetails(userSnap.data());
                }
              } catch (userError) {
                // User fetch failed, but booking details are still available
                console.log('Could not fetch user details, continuing with booking data');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchDetails();
    }
  }, [bookingId, conversationId]);

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
      const message = `Payment Verified ✅\n\nAmount: ₹${amount?.toLocaleString('en-IN') || 'N/A'}\nService ID: ${bookingId}\n\nOTP verification completed. Payment will be transferred to your bank account within 1-2 business days.`;

      await Share.share({
        message,
        title: 'Payment Verification Receipt'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewInvoice = () => {
    navigation.navigate('InvoiceScreen', {
      bookingId,
      completionId,
      userRole: 'technician'
    });
  };

  const handleContactCustomer = () => {
    if (userDetails?.phone) {
      Linking.openURL(`tel:${userDetails.phone}`);
    }
  };

  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }]
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#34C759" />
        <Text style={styles.loadingText}>Verifying payment...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.contentContainer}>
      {/* Success Header */}
      <View style={styles.successHeader}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Verified!</Text>
        <Text style={styles.successSubtitle}>OTP verification successful</Text>
      </View>

      {/* Payment Amount Box */}
      <View style={styles.amountBox}>
        <Text style={styles.amountLabel}>Amount Verified</Text>
        <Text style={styles.amountValue}>
          ₹{amount?.toLocaleString('en-IN') || 'N/A'}
        </Text>
      </View>

      {/* Timeline */}
      <View style={styles.timelineBox}>
        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Service Marked Complete</Text>
            <Text style={styles.timelineTime}>Customer marked work complete</Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>OTP Verified</Text>
            <Text style={styles.timelineTime}>{formatDate(verifiedAt)}</Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotPending]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Payment Processing</Text>
            <Text style={styles.timelineTime}>Being transferred to your account</Text>
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

      {/* Payment Details */}
      <View style={styles.paymentBox}>
        <Text style={styles.paymentTitle}>💳 Payment Information</Text>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Service ID:</Text>
          <Text style={styles.paymentValue}>{bookingId}</Text>
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Amount:</Text>
          <Text style={styles.paymentValueHighlight}>
            ₹{amount?.toLocaleString('en-IN') || 'N/A'}
          </Text>
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Verified At:</Text>
          <Text style={styles.paymentValue}>{formatDate(verifiedAt)}</Text>
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Status:</Text>
          <Text style={[styles.paymentValue, styles.statusSuccess]}>✅ Verified</Text>
        </View>
      </View>

      {/* Booking Details */}
      {bookingDetails && (
        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>📋 Booking Details</Text>

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

      {/* What Happens Next */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 What Happens Next?</Text>
        <Text style={styles.infoText}>
          1. Payment is being processed (instant)
        </Text>
        <Text style={styles.infoText}>
          2. Funds will transfer to your bank account (1-2 business days)
        </Text>
        <Text style={styles.infoText}>
          3. You'll receive a notification once transferred
        </Text>
      </View>

      {/* Important Notes */}
      <View style={styles.notesBox}>
        <Text style={styles.notesTitle}>📝 Important Information</Text>
        <Text style={styles.noteItem}>
          • Payment will be transferred to your registered bank account
        </Text>
        <Text style={styles.noteItem}>
          • Standard transfer time is 1-2 business days
        </Text>
        <Text style={styles.noteItem}>
          • You can track payment status in your earnings dashboard
        </Text>
        <Text style={styles.noteItem}>
          • A receipt has been sent to your email
        </Text>
      </View>

      {/* Bank Account Info */}
      <View style={styles.bankBox}>
        <Text style={styles.bankTitle}>🏦 Payment Goes To</Text>
        <Text style={styles.bankInfo}>
          Your registered bank account associated with your technician profile
        </Text>
        <TouchableOpacity style={styles.bankLink}>
          <Text style={styles.bankLinkText}>Manage Bank Details →</Text>
        </TouchableOpacity>
      </View>

      {/* Buttons */}
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

      {userDetails?.phone && (
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactCustomer}
        >
          <Text style={styles.contactButtonText}>📞 Contact Customer</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.homeButton}
        onPress={handleBackToHome}
      >
        <Text style={styles.homeButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Need Help?</Text>
        <Text style={styles.footerText}>
          Contact support@fixbolt.com or call our helpline for payment-related queries.
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
  paymentBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759'
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9'
  },
  paymentLabel: {
    fontSize: 12,
    color: '#388E3C',
    fontWeight: '600'
  },
  paymentValue: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600'
  },
  paymentValueHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34C759'
  },
  statusSuccess: {
    color: '#34C759'
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
  bankBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#009688'
  },
  bankTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00695C',
    marginBottom: 6
  },
  bankInfo: {
    fontSize: 12,
    color: '#004D40',
    lineHeight: 16,
    marginBottom: 8
  },
  bankLink: {
    paddingVertical: 6
  },
  bankLinkText: {
    fontSize: 12,
    color: '#00796B',
    fontWeight: '700'
  },
  invoiceButton: {
    marginHorizontal: 16,
    marginVertical: 8,
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
  contactButton: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center'
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  },
  homeButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  footer: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#E1F5FE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#01579B',
    marginBottom: 4
  },
  footerText: {
    fontSize: 11,
    color: '#0277BD',
    textAlign: 'center',
    lineHeight: 14
  }
});

export { PaymentVerifiedScreen };
