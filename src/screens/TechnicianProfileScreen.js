import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { startConversation } from '../redux/messageSlice';
import { fetchUserServices } from '../redux/serviceSlice';

export const TechnicianProfileScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { technicianId, technicianName } = route.params;
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { userServices, loading } = useSelector((state) => state.services);
  const messageLoading = useSelector((state) => state.messages.loading);
  
  const [technicianData, setTechnicianData] = useState(null);

  useEffect(() => {
    dispatch(fetchUserServices(technicianId));
  }, [dispatch, technicianId]);

  const handleStartConversation = async () => {
    if (user?.role === 'technician') {
      Alert.alert('Error', 'Technicians can only message customers');
      return;
    }

    try {
      const result = await dispatch(
        startConversation({
          customerId: user.id,
          customerName: user.name,
          technicianId,
          technicianName,
        })
      );

      if (result.type === startConversation.fulfilled.type) {
        navigation.navigate('ChatDetail', {
          conversationId: result.payload.id,
          otherUserName: technicianName,
        });
      } else {
        Alert.alert('Error', result.payload || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', error.message || 'Failed to start conversation');
    }
  };

  const ServiceCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.serviceGridItem}
      onPress={() => {
        // Can navigate to service details
      }}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.serviceGridImage}
      />
      <View style={styles.serviceGridOverlay}>
        <Text style={styles.serviceGridTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.serviceGridPrice}>₹{item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.ratingBadge}>
        <Text style={styles.ratingText}>⭐ {item.rating || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{technicianName}</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Profile Section */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{technicianName?.charAt(0) || '👤'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.technicianName}>{technicianName}</Text>
              <Text style={styles.serviceCount}>
                {userServices.length} Service{userServices.length !== 1 ? 's' : ''}
              </Text>
              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>⭐ {(userServices.reduce((sum, s) => sum + (s.rating || 0), 0) / Math.max(userServices.length, 1)).toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>👥 {userServices.reduce((sum, s) => sum + (s.reviewCount || 0), 0)}</Text>
                  <Text style={styles.statLabel}>Reviews</Text>
                </View>
              </View>
            </View>
          </View>

          {user?.role !== 'technician' && (
            <TouchableOpacity 
              style={[styles.messageButton, messageLoading && styles.messageButtonDisabled]}
              onPress={handleStartConversation}
              disabled={messageLoading}
            >
              {messageLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.messageButtonText}>💬 Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Services Grid (Instagram-style) */}
          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>Services</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : userServices.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No services yet</Text>
              </View>
            ) : (
              <FlatList
                data={userServices}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ServiceCard item={item} />}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.gridRow}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSection: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  technicianName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  servicesSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  messageButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 25,
  },
  messageButtonDisabled: {
    backgroundColor: '#ccc',
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gridRow: {
    gap: 10,
  },
  serviceGridItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  serviceGridImage: {
    width: '100%',
    height: '100%',
  },
  serviceGridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    justifyContent: 'flex-end',
  },
  serviceGridTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceGridPrice: {
    color: '#4AE963',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFA500',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
});
