import { useFocusEffect } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { db } from '../config/firebase';
import { processRefundRequest } from '../services/bookingService';

export const BookingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.auth.user);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
  const [showMenu, setShowMenu] = useState(false);
  const unsubscribersRef = useRef([]);

  useEffect(() => {
    fetchBookings();
    
    // Cleanup on unmount
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribersRef.current = [];
    };
  }, [user?.id]);

  // Refresh bookings when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('📱 BookingsScreen focused - refreshing data');
      setRefreshing(true);
      fetchBookings();
    }, [fetchBookings])
  );

  const fetchBookings = useCallback(async () => {
    try {
      // Don't fetch if user is not loaded yet
      if (!user?.id) {
        setLoading(false);
        return;
      }

      if (!refreshing) setLoading(true);

      // Clear old unsubscribers
      unsubscribersRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') unsubscribe();
      });
      unsubscribersRef.current = [];

      // Get all conversations for the user
      const conversationsRef = collection(db, 'conversations');
      const conversationsQuery = query(
        conversationsRef,
        where('participants', 'array-contains', user.id)
      );
      const conversationsSnapshot = await getDocs(conversationsQuery);

      let conversationsProcessed = 0;

      // For each conversation, set up real-time listener for bookings
      for (const convDoc of conversationsSnapshot.docs) {
        try {
          const bookingsRef = collection(db, 'conversations', convDoc.id, 'bookings');
          
          // Set up real-time listener for this conversation's bookings
          const unsubscribe = onSnapshot(
            bookingsRef,
            async (bookingsSnapshot) => {
              const conversationBookings = [];

              for (const bookingDoc of bookingsSnapshot.docs) {
                const bookingData = bookingDoc.data();
                const isCustomer = bookingData.customerId === user.id;
                const isTechnician = bookingData.technicianId === user.id;

                // Only show relevant bookings
                if (isCustomer || isTechnician) {
                  const booking = {
                    id: bookingDoc.id,
                    conversationId: convDoc.id,
                    ...bookingData,
                    isCustomer,
                    isTechnician,
                  };

                  // Fetch service name if not already stored
                  if (!booking.serviceName && booking.serviceId) {
                    try {
                      const serviceRef = doc(db, 'services', booking.serviceId);
                      const serviceDoc = await getDoc(serviceRef);
                      if (serviceDoc.exists()) {
                        booking.serviceName = serviceDoc.data().name || 'Service Booking';
                      } else {
                        booking.serviceName = 'Service Booking';
                      }
                    } catch (err) {
                      booking.serviceName = 'Service Booking';
                    }
                  } else if (!booking.serviceName) {
                    booking.serviceName = 'Service Booking';
                  }

                  conversationBookings.push(booking);
                }
              }

              // Update bookings: replace this conversation's bookings
              console.log(`🔄 Real-time update for conversation ${convDoc.id.substring(0, 8)}: ${conversationBookings.length} bookings`);
              conversationBookings.forEach(b => {
                console.log(`  └─ Booking ${b.id.substring(0, 8)}: ${b.status}`);
              });
              
              setBookings((prevBookings) => {
                const otherBookings = prevBookings.filter(b => b.conversationId !== convDoc.id);
                const updated = [...otherBookings, ...conversationBookings];
                
                // Sort by scheduled date
                updated.sort((a, b) => {
                  return new Date(b.scheduledDate) - new Date(a.scheduledDate);
                });
                
                return updated;
              });
            },
            (error) => {
              console.error(`Error listening to bookings for conversation ${convDoc.id}:`, error);
            }
          );

          unsubscribersRef.current.push(unsubscribe);
          conversationsProcessed++;
        } catch (err) {
          console.error(`Error setting up listener for conversation ${convDoc.id}:`, err);
          conversationsProcessed++;
        }
      }

      // If no conversations found, just update loading state
      if (conversationsProcessed === 0 || conversationsSnapshot.empty) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, refreshing]);

  const getFilteredBookings = () => {
    const now = new Date();
    console.log(`📊 Filtering bookings for tab: ${activeTab}`);
    console.log(`   Total bookings: ${bookings.length}`);
    bookings.forEach(b => {
      console.log(`   └─ Booking ${b.id.substring(0, 8)}: status=${b.status}, scheduled=${new Date(b.scheduledDate).toLocaleDateString()}`);
    });
    
    if (activeTab === 'upcoming') {
      const filtered = bookings.filter(b => new Date(b.scheduledDate) >= now);
      console.log(`   ✓ Upcoming bookings: ${filtered.length}`);
      return filtered;
    } else {
      const filtered = bookings.filter(b => new Date(b.scheduledDate) < now);
      console.log(`   ✓ Past bookings: ${filtered.length}`);
      return filtered;
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'confirmed':
        return '#28a745';
      case 'completed':
        return '#007AFF';
      case 'cancelled':
        return '#DC3545';
      default:
        return '#666';
    }
  };

  const handleCancelBooking = (booking) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? A refund will be processed based on the cancellation policy.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🚫 Cancelling booking: ${booking.id.substring(0, 8)} in conversation ${booking.conversationId.substring(0, 8)}`);
              
              // Show loading indicator
              Alert.alert('Processing', 'Cancelling booking and processing refund...', [
                { text: 'Wait', disabled: true }
              ], { cancelable: false });

              // First, get the payment ID for this booking
              const bookingRef = doc(db, 'conversations', booking.conversationId, 'bookings', booking.id);
              const bookingSnap = await getDoc(bookingRef);
              const bookingData = bookingSnap.data();
              
              console.log(`   Before update: status=${bookingData?.status}`);
              
              // Update booking status to cancelled
              await updateDoc(bookingRef, {
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
              });
              
              console.log(`   ✅ After update: status set to cancelled`);

              // Process refund if payment exists
              if (bookingData?.paymentId) {
                try {
                  const refundResult = await processRefundRequest(
                    bookingData.paymentId,
                    {
                      reason: 'Customer cancelled booking',
                      bookingId: booking.id,
                    }
                  );

                  // Dismiss loading alert
                  Alert.alert(
                    'Booking Cancelled',
                    `Booking cancelled successfully!\n\nRefund: ₹${refundResult.customerRefund.toFixed(2)}\nRefund Type: ${refundResult.reason}`
                  );
                } catch (refundError) {
                  console.warn('Refund processing error:', refundError.message);
                  // Even if refund fails, booking is cancelled
                  Alert.alert(
                    'Booking Cancelled',
                    'Booking cancelled. Note: Refund processing encountered an issue. Please contact support if refund is not received within 3-5 business days.'
                  );
                }
              } else {
                // No payment ID, just show success
                Alert.alert('Success', 'Booking cancelled successfully');
              }

              // Refresh bookings
              fetchBookings();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleMarkComplete = (booking) => {
    navigation.navigate('ServiceCompletion', { booking });
  };

  const renderBookingCard = ({ item }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingTitleSection}>
          <Text style={styles.bookingTitle}>Booking #{item.id.substring(0, 8)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('ChatDetail', {
              conversationId: item.conversationId,
            })
          }
        >
          <Text style={styles.contactButton}>💬</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Scheduled Date</Text>
          <Text style={styles.detailValue}>{formatDate(item.scheduledDate)}</Text>
        </View>

        <View style={styles.divider} />

        {item.serviceName && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {item.serviceName}
              </Text>
            </View>

            <View style={styles.divider} />
          </>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue} numberOfLines={2}>
            {item.location}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.priceValue}>₹{Math.round(item.estimatedPrice * 1.1)}</Text>
        </View>

        {item.description && (
          <>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Details</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          </>
        )}

        {/* Mark Complete Button - Only show for customers and if booking is confirmed */}
        {item.isCustomer && item.status === 'confirmed' && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleMarkComplete(item)}
            >
              <Text style={styles.completeButtonText}>Mark as Complete</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Cancel Button - Only show for customers and if booking is pending/confirmed */}
        {item.isCustomer && (item.status === 'pending' || item.status === 'confirmed') && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(item)}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const filteredBookings = getFilteredBookings();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {user?.role === 'technician' ? 'Bookings' : 'My Bookings'}
        </Text>
        <TouchableOpacity
          style={styles.menuIconButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View style={styles.menu}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              navigation.navigate('Home');
              setShowMenu(false);
            }}
          >
            <Text style={styles.menuItemText}>🏠 Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              navigation.navigate('Messages');
              setShowMenu(false);
            }}
          >
            <Text style={styles.menuItemText}>💬 Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              navigation.navigate('Services');
              setShowMenu(false);
            }}
          >
            <Text style={styles.menuItemText}>📋 Services</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              navigation.navigate('Profile');
              setShowMenu(false);
            }}
          >
            <Text style={styles.menuItemText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'upcoming' && styles.activeTabText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'past' && styles.activeTabText,
            ]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {activeTab === 'upcoming'
              ? 'No upcoming bookings'
              : 'No past bookings'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    fontSize: 28,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerPlaceholder: {
    width: 28,
  },
  menuIconButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: '#333',
  },
  menu: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookingTitleSection: {
    flex: 1,
    gap: 8,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  contactButton: {
    fontSize: 24,
  },
  bookingDetails: {
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  priceValue: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  completeButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
