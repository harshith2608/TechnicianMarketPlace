import { useFocusEffect } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { db } from '../config/firebase';
import { processRefundRequest } from '../services/bookingService';

export const TechnicianBookingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.auth.user);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'confirmed', 'history'
  const [showMenu, setShowMenu] = useState(false);
  const unsubscribersRef = useRef([]);

  useEffect(() => {
    fetchTechnicianBookings();
    
    // Cleanup on unmount
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Refresh bookings when screen is focused
  useFocusEffect(
    useCallback(() => {
      setRefreshing(true);
      fetchTechnicianBookings();
    }, [fetchTechnicianBookings])
  );

  const fetchTechnicianBookings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      // Clear old unsubscribers
      unsubscribersRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') unsubscribe();
      });
      unsubscribersRef.current = [];

      // Get all conversations for this user
      const bookingsRef = collection(db, 'conversations');
      const userConversationsQuery = query(
        bookingsRef,
        where('participants', 'array-contains', user.id)
      );
      const conversationsSnap = await getDocs(userConversationsQuery);
      
      let conversationsProcessed = 0;

      // Set up real-time listeners for each conversation's bookings
      for (const convDoc of conversationsSnap.docs) {
        try {
          const bookingsCollectionRef = collection(db, 'conversations', convDoc.id, 'bookings');
          const bookingsQuery = query(
            bookingsCollectionRef,
            where('technicianId', '==', user.id),
            limit(20)
          );

          // Set up real-time listener for this conversation's bookings
          const unsubscribe = onSnapshot(
            bookingsQuery,
            async (bookingsSnap) => {
              const conversationBookings = [];

              for (const bookingDoc of bookingsSnap.docs) {
                const bookingData = bookingDoc.data();
                
                const booking = {
                  id: bookingDoc.id,
                  conversationId: convDoc.id,
                  ...bookingData,
                };

                // Fetch fresh customer ratings and profile data
                if (booking.customerId) {
                  try {
                    const customerRef = doc(db, 'users', booking.customerId);
                    const customerSnap = await getDoc(customerRef);
                    if (customerSnap.exists()) {
                      const customerData = customerSnap.data();
                      booking.customerName = customerData.name || 'Customer';
                      booking.customerRating = customerData.rating || 0;
                      booking.customerReviews = customerData.totalReviews || 0;
                      booking.customerVerified = customerData.verified || false;
                    }
                  } catch (err) {
                    console.warn(`Failed to fetch customer data for ${booking.customerId}:`, err);
                  }
                }

                // Fetch fresh service data including ratings
                if (booking.serviceId) {
                  try {
                    const serviceRef = doc(db, 'services', booking.serviceId);
                    const serviceSnap = await getDoc(serviceRef);
                    if (serviceSnap.exists()) {
                      const serviceData = serviceSnap.data();
                      booking.serviceName = serviceData.title || booking.serviceName || 'Service';
                      booking.serviceRating = serviceData.rating || 0;
                      booking.serviceReviews = serviceData.reviews || 0;
                    }
                  } catch (err) {
                    console.warn(`Failed to fetch service data for ${booking.serviceId}:`, err);
                  }
                }

                conversationBookings.push(booking);
              }

              // Update bookings: replace this conversation's bookings
              setBookings((prevBookings) => {
                const otherBookings = prevBookings.filter(b => b.conversationId !== convDoc.id);
                const updated = [...otherBookings, ...conversationBookings];
                
                // Sort by scheduled date (newest first)
                updated.sort((a, b) => {
                  const dateA = new Date(a.scheduledDate || 0);
                  const dateB = new Date(b.scheduledDate || 0);
                  return dateB - dateA;
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
      if (conversationsProcessed === 0 || conversationsSnap.empty) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching technician bookings:', error);
      setError(error.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, refreshing]);

  // Handle refresh action
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTechnicianBookings();
  }, [fetchTechnicianBookings]);

  const getFilteredBookings = () => {
    const now = new Date();
    
    if (activeTab === 'pending') {
      const filtered = bookings.filter(b => b.status === 'pending');
      return filtered;
    } else if (activeTab === 'confirmed') {
      const filtered = bookings.filter(
        b => b.status === 'confirmed' && new Date(b.scheduledDate) >= now
      );
      return filtered;
    } else {
      // History: completed or past confirmed bookings
      const filtered = bookings.filter(
        b => b.status === 'completed' || b.status === 'cancelled' || (b.status === 'confirmed' && new Date(b.scheduledDate) < now)
      );
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

  const handleConfirmBooking = useCallback((booking) => {
    Alert.alert(
      'Confirm Booking',
      'Are you sure you want to confirm this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            try {
              const bookingRef = doc(db, 'conversations', booking.conversationId, 'bookings', booking.id);
              await updateDoc(bookingRef, {
                status: 'confirmed',
                confirmedAt: new Date().toISOString(),
              });
              await fetchTechnicianBookings();
              Alert.alert('Success', 'Booking confirmed successfully');
            } catch (error) {
              console.error('Error confirming booking:', error);
              setError(error.message || 'Failed to confirm booking');
              Alert.alert('Error', 'Failed to confirm booking');
            }
          },
        },
      ]
    );
  }, [fetchTechnicianBookings]);

  const handleCompleteBooking = useCallback((booking) => {
    navigation.navigate('ServiceCompletion', { booking });
  }, [navigation]);

  const handleCancelBooking = useCallback((booking) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? Customer refund will be processed based on the cancellation policy.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const bookingRef = doc(db, 'conversations', booking.conversationId, 'bookings', booking.id);
              const bookingSnap = await getDoc(bookingRef);
              const bookingData = bookingSnap.data();

              await updateDoc(bookingRef, {
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
              });

              // Process refund if payment exists
              if (bookingData?.paymentId) {
                try {
                  const refundResult = await processRefundRequest(
                    bookingData.paymentId,
                    {
                      reason: 'Booking cancelled by technician',
                      bookingId: booking.id,
                      conversationId: booking.conversationId,
                    }
                  );

                  // Dismiss loading alert
                  Alert.alert(
                    'Booking Cancelled',
                    `Refund initiated successfully!\n\nAmount: ₹${refundResult.refundAmount}\nStatus: ${refundResult.message}`
                  );
                } catch (refundError) {
                  console.warn('Refund processing error:', refundError.message);
                  // Even if refund fails, booking is cancelled
                  Alert.alert(
                    'Booking Cancelled',
                    'Booking cancelled. Note: Refund processing encountered an issue. Customer will be notified.'
                  );
                }
              } else {
                Alert.alert('Success', 'Booking cancelled successfully');
              }

              await fetchTechnicianBookings();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              setError(error.message || 'Failed to cancel booking');
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  }, [fetchTechnicianBookings]);

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

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue} numberOfLines={2}>
            {item.location}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.priceValue}>₹{item.estimatedPrice}</Text>
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

        <View style={styles.actionButtons}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => handleConfirmBooking(item)}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => handleCancelBooking(item)}
              >
                <Text style={styles.cancelButtonText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'confirmed' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleCompleteBooking(item)}
              >
                <Text style={styles.buttonText}>Mark Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => handleCancelBooking(item)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {(item.status === 'completed' || item.status === 'cancelled') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.infoButton]}
              onPress={() =>
                navigation.navigate('ChatDetail', {
                  conversationId: item.conversationId,
                })
              }
            >
              <Text style={styles.buttonText}>View Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const filteredBookings = getFilteredBookings();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
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
              navigation.navigate('MyServices');
              setShowMenu(false);
            }}
          >
            <Text style={styles.menuItemText}>📋 My Services</Text>
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

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'confirmed' && styles.tabActive]}
          onPress={() => setActiveTab('confirmed')}
        >
          <Text style={[styles.tabText, activeTab === 'confirmed' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorRetryButton}
            onPress={() => {
              setRefreshing(true);
              fetchTechnicianBookings();
            }}
          >
            <Text style={styles.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeTab === 'pending'
              ? 'No pending bookings'
              : activeTab === 'confirmed'
              ? 'No upcoming bookings'
              : 'No booking history'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
              title="Pull to refresh bookings"
              titleColor="#666"
              colors={['#007AFF']}
            />
          }
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
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  listContent: {
    padding: 15,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookingTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  contactButton: {
    fontSize: 24,
    padding: 5,
  },
  bookingDetails: {
    padding: 15,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  completeButton: {
    backgroundColor: '#007AFF',
  },
  cancelActionButton: {
    backgroundColor: '#f0f0f0',
  },
  infoButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#DC3545',
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
    marginHorizontal: 15,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  errorRetryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffc107',
    borderRadius: 6,
    marginLeft: 10,
  },
  errorRetryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
