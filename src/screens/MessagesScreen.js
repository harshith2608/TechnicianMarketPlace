import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { db } from '../config/firebase';
import { setCurrentConversation, updateConversationsRealTime } from '../redux/messageSlice';

export const MessagesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { conversations, loading, error } = useSelector((state) => state.messages);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch conversations
  const fetchConversationsPolling = async () => {
    try {
      const conversationsCollection = collection(db, 'conversations');
      const q = query(
        conversationsCollection,
        where('participants', 'array-contains', user.id)
      );
      
      const snapshot = await getDocs(q);
      const convs = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        convs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        });
      });

      // Sort by updatedAt
      convs.sort((a, b) => {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });

      dispatch(updateConversationsRealTime(convs));
    } catch (error) {
      console.error('Error fetching conversations:', error);    } finally {
      setRefreshing(false);    }
  };

  // Set up polling for conversations
  useEffect(() => {
    if (user?.id) {
      // Initial fetch
      fetchConversationsPolling();
      setIsInitialLoad(false);

      // Poll for conversations every 2 seconds
      const pollInterval = setInterval(() => {
        fetchConversationsPolling();
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [dispatch, user?.id]);

  const getOtherParticipantName = (conversation) => {
    if (!conversation.participantNames) return 'Unknown';
    for (const [userId, name] of Object.entries(conversation.participantNames)) {
      if (userId !== user?.id) {
        return name;
      }
    }
    return 'Unknown';
  };

  const getOtherParticipantId = (conversation) => {
    // Try to get from participants array first
    if (conversation.participants && Array.isArray(conversation.participants)) {
      for (const participantId of conversation.participants) {
        if (participantId !== user?.id) {
          return participantId;
        }
      }
    }
    
    // If not found, try to get from participantNames object
    if (conversation.participantNames) {
      for (const userId of Object.keys(conversation.participantNames)) {
        if (userId !== user?.id) {
          return userId;
        }
      }
    }
    
    return null;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const ConversationItem = ({ item }) => {
    const otherUserId = getOtherParticipantId(item);
    
    return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => {
        dispatch(setCurrentConversation(item.id));
        navigation.navigate('ChatDetail', { 
          conversationId: item.id,
          otherUserName: getOtherParticipantName(item),
          otherUserId: otherUserId,
        });
      }}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatar}>
          {getOtherParticipantName(item).charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.conversationInfo}>
        <Text style={styles.conversationName}>
          {getOtherParticipantName(item)}
        </Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || 'Start a conversation...'}
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {formatDate(item.updatedAt)}
      </Text>
    </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {isInitialLoad ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Error loading conversations</Text>
          <Text style={styles.emptySubText}>{error}</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubText}>Start a conversation from a technician's profile</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationItem item={item} />}
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
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 28,
    color: '#333',
    padding: 5,
  },
  backButtonPlaceholder: {
    width: 38,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerPlaceholder: {
    width: 38,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatar: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
