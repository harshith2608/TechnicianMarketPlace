import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const PaymentSuccessScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { booking, technician, service } = route.params || {};

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  const handleSendMessage = () => {
    if (booking?.conversationId) {
      navigation.navigate('ChatDetail', {
        conversationId: booking.conversationId,
        otherUserName: technician?.name,
        otherUserId: booking?.technicianId,
      });
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleGoHome}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Confirmed</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.successSection}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Your booking has been confirmed
          </Text>
        </View>

        {/* Technician Card */}
        {technician && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technician Details</Text>
            <View style={styles.technicianCard}>
              {technician.profilePicture ? (
                <Image
                  source={{ uri: technician.profilePicture }}
                  style={styles.technicianImage}
                />
              ) : (
                <View style={styles.technicianImagePlaceholder}>
                  <Text style={styles.placeholderText}>👤</Text>
                </View>
              )}
              <View style={styles.technicianInfo}>
                <Text style={styles.technicianName}>{technician.name}</Text>
                <Text style={styles.technicianRole}>
                  {technician.role === 'technician' ? 'Professional Technician' : technician.role}
                </Text>
                {technician.rating && (
                  <View style={styles.ratingRow}>
                    <Text style={styles.rating}>⭐ {technician.rating.toFixed(1)}</Text>
                    <Text style={styles.ratingCount}>({technician.reviewCount || 0} reviews)</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Booking Details */}
        {booking && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            <View style={styles.detailsCard}>
              {/* Service */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>{service?.name || 'Service'}</Text>
              </View>
              <View style={styles.divider} />

              {/* Date & Time */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scheduled Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(booking.scheduledDate)}
                </Text>
              </View>
              <View style={styles.divider} />

              {/* Location */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{booking.location}</Text>
              </View>
              <View style={styles.divider} />

              {/* Description */}
              {booking.description && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Details</Text>
                    <Text style={styles.detailValue}>{booking.description}</Text>
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              {/* Price */}
              <View style={styles.priceRow}>
                <Text style={styles.detailLabel}>Total Amount</Text>
                <Text style={styles.priceValue}>₹{Math.round(booking.estimatedPrice * 1.1)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Status Info */}
        <View style={styles.section}>
          <View style={styles.statusCard}>
            <Text style={styles.statusIcon}>📞</Text>
            <Text style={styles.statusText}>
              The technician will contact you soon to confirm the appointment
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleGoHome}
          >
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewBookingButton}
            onPress={handleSendMessage}
          >
            <Text style={styles.viewBookingButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 28,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  successIcon: {
    fontSize: 60,
    color: '#28a745',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  technicianCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  technicianImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  technicianImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  placeholderText: {
    fontSize: 36,
  },
  technicianInfo: {
    flex: 1,
  },
  technicianName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  technicianRole: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9500',
    marginRight: 6,
  },
  ratingCount: {
    fontSize: 12,
    color: '#999',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingTop: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  priceValue: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  statusCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  statusIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonSection: {
    gap: 12,
  },
  homeButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  viewBookingButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  viewBookingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
