import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { db } from '../config/firebase';
import { logoutUser } from '../redux/authSlice';
import { fetchConversations } from '../redux/messageSlice';
import { fetchAllServices, fetchUserServices } from '../redux/serviceSlice';

const CATEGORIES = ['All', 'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'HVAC', 'Other'];

export const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.auth.user);
  const { allServices, loading } = useSelector((state) => state.services);
  const { conversations } = useSelector((state) => state.messages);
  const dispatch = useDispatch();
  
  const [filterCategory, setFilterCategory] = useState('All');
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard metrics state
  const [technicianStats, setTechnicianStats] = useState({
    totalServices: 0,
    avgRating: 0,
    totalReviews: 0,
    profileCompleteness: 0,
    responseRate: 0,
    recentActivity: [],
  });

  useEffect(() => {
    dispatch(fetchAllServices());
    if (user?.id) {
      dispatch(fetchUserServices(user.id));
      dispatch(fetchConversations(user.id));
    }
  }, [dispatch, user?.id]);

  // Handle refresh action
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchAllServices()),
      user?.id && dispatch(fetchUserServices(user.id)),
      user?.id && dispatch(fetchConversations(user.id)),
    ]);
    if (user?.role === 'technician' && user?.id) {
      await calculateTechnicianMetrics();
    }
    setRefreshing(false);
  };

  // Fetch and calculate dashboard metrics when user role is technician
  useEffect(() => {
    if (user?.role === 'technician' && user?.id) {
      calculateTechnicianMetrics();
    }
  }, [user?.id, user?.role, allServices, conversations]);

  const calculateTechnicianMetrics = async () => {
    try {
      // 1. Get technician's services (already in allServices filtered by userId)
      const techServices = allServices.filter(s => s.userId === user.id);
      const totalServices = techServices.length;

      // 2. Calculate average rating and total reviews from all services
      let totalRating = 0;
      let totalReviewCount = 0;

      for (const service of techServices) {
        const serviceDoc = await getDoc(doc(db, 'users', user.id, 'services', service.id));
        if (serviceDoc.exists()) {
          const data = serviceDoc.data();
          totalRating += (data.rating || 0) * (data.reviewCount || 0);
          totalReviewCount += data.reviewCount || 0;
        }
      }

      const avgRating = totalReviewCount > 0 ? (totalRating / totalReviewCount).toFixed(1) : 0;

      // 3. Calculate profile completeness
      const userDoc = await getDoc(doc(db, 'users', user.id));
      let profileComplete = 0;
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const requiredFields = ['name', 'email', 'role'];
        const optionalFields = ['profilePicture', 'bio'];
        
        const filledRequired = requiredFields.filter(field => userData[field]).length;
        const filledOptional = optionalFields.filter(field => userData[field]).length;
        
        profileComplete = Math.round(((filledRequired + filledOptional * 0.5) / (requiredFields.length + optionalFields.length * 0.5)) * 100);
      }

      // 4. Calculate response rate (messages sent vs conversations)
      const techConversations = conversations.filter(conv => 
        conv.participants.includes(user.id)
      );
      
      let totalMessages = 0;
      for (const conv of techConversations) {
        const messagesRef = collection(db, 'conversations', conv.id, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        totalMessages += messagesSnapshot.size;
      }

      const responseRate = techConversations.length > 0 
        ? Math.min(100, Math.round((totalMessages / (techConversations.length * 5)) * 100)) 
        : 0;

      // 5. Fetch recent activity (last 3 messages or service inquiries)
      const recentActivity = [];
      
      // Get recent messages
      if (techConversations.length > 0) {
        const latestConv = techConversations[0];
        const messagesRef = collection(db, 'conversations', latestConv.id, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        const messages = messagesSnapshot.docs
          .map(doc => ({
            id: doc.id,
            type: 'message',
            title: 'New message from ' + (latestConv.otherParticipantName || 'Customer'),
            time: doc.data().createdAt?.toDate?.() || new Date(),
          }))
          .sort((a, b) => b.time - a.time)
          .slice(0, 2);
        
        recentActivity.push(...messages);
      }

      // Add a placeholder activity if no real activities
      if (recentActivity.length === 0) {
        recentActivity.push({
          id: '1',
          type: 'info',
          title: 'Welcome! Start getting messages from customers.',
          time: new Date(),
        });
      }

      setTechnicianStats({
        totalServices,
        avgRating: parseFloat(avgRating),
        totalReviews: totalReviewCount,
        profileCompleteness: profileComplete,
        responseRate: Math.min(100, responseRate),
        recentActivity,
      });
    } catch (error) {
      console.error('Error calculating technician metrics:', error);
      // Keep existing state if error occurs
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await dispatch(logoutUser());
          setShowMenu(false);
        },
        style: 'destructive',
      },
    ]);
  };

  const filteredServices =
    filterCategory === 'All'
      ? allServices
      : allServices.filter((service) => service.category === filterCategory);

  const ServiceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => {
        if (user?.role === 'customer') {
          navigation.navigate('ServiceDetail', {
            serviceId: item.id,
            technicianId: item.userId,
            service: item,
          });
        } else {
          navigation.navigate('TechnicianProfile', {
            technicianId: item.userId,
            technicianName: item.technicianName,
          });
        }
      }}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.serviceImage}
      />
      <View style={styles.serviceOverlay}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <Text style={styles.technicianName}>by {item.technicianName}</Text>
        <View style={styles.serviceFooter}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
        </View>
      </View>
      {item.rating > 0 && (
        <View style={styles.ratingBadge}>
          <Text style={styles.rating}>⭐ {item.rating.toFixed(1)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (user?.role === 'technician') {
    // Technician view
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={styles.technicianGreeting}>Welcome, {user?.name}!</Text>
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        </View>

        {showMenu && (
          <View style={styles.menu}>
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
                navigation.navigate(user?.role === 'technician' ? 'TechnicianBookings' : 'Bookings');
                setShowMenu(false);
              }}
            >
              <Text style={styles.menuItemText}>📅 {user?.role === 'technician' ? 'My Bookings' : 'Bookings'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('Services');
                setShowMenu(false);
              }}
            >
              <Text style={styles.menuItemText}>📋 Manage Services</Text>
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
            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleLogout}
            >
              <Text style={styles.menuItemTextDanger}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.technicianContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>You're a technician offering services!</Text>
          
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{technicianStats.totalServices}</Text>
              <Text style={styles.statLabel}>Total Services</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{technicianStats.avgRating}</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{technicianStats.totalReviews}</Text>
              <Text style={styles.statLabel}>Total Reviews</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Services')}
            >
              <Text style={styles.quickActionIcon}>📋</Text>
              <Text style={styles.quickActionText}>Manage Services</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Messages')}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.quickActionIcon}>👤</Text>
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Featured Section */}
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>📊 Performance</Text>
            <View style={styles.performanceCard}>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Profile Completeness</Text>
                <Text style={styles.performanceValue}>{technicianStats.profileCompleteness}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${technicianStats.profileCompleteness}%` }]} />
              </View>
            </View>

            <View style={styles.performanceCard}>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Response Rate</Text>
                <Text style={styles.performanceValue}>{technicianStats.responseRate}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${technicianStats.responseRate}%` }]} />
              </View>
            </View>
          </View>

          {/* Recent Requests */}
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>📨 Recent Activity</Text>
            {technicianStats.recentActivity.length > 0 ? (
              technicianStats.recentActivity.map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <Text style={styles.activityIcon}>{activity.type === 'message' ? '💬' : 'ℹ️'}</Text>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityTime}>
                      {activity.time instanceof Date 
                        ? getTimeAgo(activity.time)
                        : 'Just now'
                      }
                    </Text>
                  </View>
                  <Text style={styles.activityArrow}>›</Text>
                </View>
              ))
            ) : (
              <View style={styles.activityCard}>
                <Text style={styles.activityIcon}>ℹ️</Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>No recent activity</Text>
                  <Text style={styles.activityTime}>Get started by creating services</Text>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Services')}
          >
            <Text style={styles.buttonText}>+ Create New Service</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Customer view - Services Feed
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.backButtonPlaceholder} />
        <Text style={styles.greeting}>Services Marketplace</Text>
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View style={styles.menu}>
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
              navigation.navigate('Bookings');
              setShowMenu(false);
            }}
          >
            <Text style={styles.menuItemText}>📅 My Bookings</Text>
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
          <TouchableOpacity 
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={handleLogout}
          >
            <Text style={styles.menuItemTextDanger}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category Filter */}
      <View style={styles.filterSectionWrapper}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryFilter,
                filterCategory === item && styles.categoryFilterActive,
              ]}
              onPress={() => setFilterCategory(item)}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  filterCategory === item && styles.categoryFilterTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        />
      </View>

      {/* Services Feed */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : filteredServices.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No services found in this category</Text>
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ServiceCard item={item} />}
          contentContainerStyle={styles.feedContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
              title="Pull to refresh"
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
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    fontSize: 28,
    color: '#333',
    padding: 5,
    marginRight: 10,
  },
  backButtonPlaceholder: {
    width: 38,
    marginRight: 10,
  },
  technicianGreeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  menuIcon: {
    fontSize: 24,
    color: '#333',
    padding: 5,
  },
  menu: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  menuItemTextDanger: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  filterSectionWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
  },
  categoryContainer: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 8,
  },
  categoryFilter: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryFilterActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  categoryFilterTextActive: {
    color: '#fff',
  },
  feedContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    height: 280,
    marginHorizontal: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    paddingBottom: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  technicianName: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 10,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    color: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4AE963',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFA500',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  rating: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  technicianContent: {
    flex: 1,
    padding: 15,
    paddingBottom: 30,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  featuredSection: {
    marginBottom: 20,
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  performanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activityArrow: {
    fontSize: 20,
    color: '#007AFF',
  },
  primaryButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
