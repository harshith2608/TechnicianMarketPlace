import * as ImagePicker from 'expo-image-picker';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ActionMenu } from '../components/ActionMenu';
import { BookingModal } from '../components/BookingModal';
import { db } from '../config/firebase';
import { createBooking } from '../redux/bookingSlice';
import { initiateCall } from '../redux/callSlice';
import { sendMessage, updateMessagesRealTime } from '../redux/messageSlice';

export const ChatDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const { conversationId, otherUserName, otherUserId } = route.params;
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { currentMessages, loading } = useSelector((state) => state.messages);
  const { loading: bookingLoading } = useSelector((state) => state.booking);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [technicianData, setTechnicianData] = useState(null);

  // Fetch technician data for booking
  useEffect(() => {
    const fetchTechnicianData = async () => {
      try {
        if (!otherUserId) {
          console.warn('otherUserId not available');
          return;
        }
        const techRef = doc(db, 'users', otherUserId);
        const techDoc = await getDoc(techRef);
        if (techDoc.exists()) {
          setTechnicianData(techDoc.data());
        }
      } catch (error) {
        console.error('Error fetching technician data:', error);
      }
    };
    if (otherUserId) {
      fetchTechnicianData();
    }
  }, [otherUserId]);

  // Function to fetch messages
  const fetchMessagesPolling = async () => {
    try {
      const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesCollection, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      
      const messages = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          message: data.message || '',
          imageUrl: data.imageUrl || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        });
      });
      
      dispatch(updateMessagesRealTime(messages));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMessagesPolling();
    setIsInitialLoad(false);

    // Poll for messages every 2 seconds
    const pollInterval = setInterval(() => {
      fetchMessagesPolling();
      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }, 2000);

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, [dispatch, conversationId]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleShareLocation = () => {
    Alert.alert('Share Location', 'Location sharing coming soon!');
  };

  const handleSharePhoto = async () => {
    await handlePickImage();
  };

  const handleBookServiceFromChat = async (bookingDetails) => {
    try {
      const result = await dispatch(
        createBooking({
          conversationId,
          serviceId: 'general-service',
          serviceName: 'Service Booking', // Service name stored directly in booking
          technicianId: otherUserId,
          customerId: user.id,
          scheduledDate: bookingDetails.scheduledDate,
          location: bookingDetails.location,
          description: bookingDetails.description,
          estimatedPrice: 0, // Will be set by technician
        })
      ).unwrap();

      setShowBookingModal(false);
      
      // Navigate to payment screen to complete payment
      navigation.navigate('Payment', {
        bookingId: result.id,
        serviceTitle: result.serviceName || 'Service Booking',
        technicianName: otherUserName,
        technicianId: otherUserId,
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', error?.message || 'Failed to create booking');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() && !selectedImage) return;
    if (!user || !user.id) {
      console.warn('User not logged in');
      return;
    }

    setIsSending(true);
    try {
      const result = await dispatch(
        sendMessage({
          conversationId,
          userId: user.id,
          userName: user.name || 'Anonymous',
          message: messageText.trim(),
          imageUri: selectedImage?.uri || null,
        })
      );

      if (result.type === sendMessage.fulfilled.type) {
        setMessageText('');
        setSelectedImage(null);
      } else if (result.type === sendMessage.rejected.type) {
        console.error('Failed to send message:', result.payload);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleInitiateCall = async () => {
    try {
      if (!otherUserId) {
        Alert.alert('Error', 'Unable to initiate call');
        return;
      }

      const result = await dispatch(
        initiateCall({
          conversationId,
          callerId: user.id,
          receiverId: otherUserId,
        })
      ).unwrap();

      navigation.navigate('Call', {
        conversationId,
        callId: result.id,
        otherUserId,
        otherUserName,
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Error', error?.message || 'Failed to initiate call');
    }
  };

  const MessageBubble = ({ item }) => {
    const isCurrentUser = user && item.userId === user.id;
    // Allow wider bubble for images (95% instead of 80%, and remove padding)
    const bubbleStyle = [
      item.imageUrl && !item.message ? { ...styles.messageBubble, padding: 0 } : styles.messageBubble, 
      isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
      item.imageUrl ? styles.messageBubbleWithImage : styles.messageBubbleWithoutImage,
    ];

    return (
      <View style={[styles.messageBubbleContainer, isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer]}>
        <View style={bubbleStyle}>
          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.messageBubbleImage}
            />
          )}
          {item.message && (
            <Text style={[styles.messageText, isCurrentUser ? styles.currentUserText : styles.otherUserText]}>
              {item.message}
            </Text>
          )}
          <Text style={[styles.messageTime, isCurrentUser ? styles.currentUserTime : styles.otherUserTime]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{otherUserName}</Text>
        <TouchableOpacity onPress={handleInitiateCall}>
          <Text style={styles.callButton}>☎️</Text>
        </TouchableOpacity>
      </View>

      {isInitialLoad && currentMessages.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={currentMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble item={item} />}
            contentContainerStyle={styles.messagesList}
            inverted={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
              </View>
            }
            onContentSizeChange={() => {
              // Auto scroll to bottom when new messages arrive
            }}
          />

          <View style={styles.imagePreviewContainer}>
            {selectedImage && (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowActionMenu(true)}
              disabled={isSending}
            >
              <Text style={styles.menuButtonText}>+</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              editable={!isSending}
            />
            <TouchableOpacity
              style={[styles.sendButton, (isSending || (!messageText.trim() && !selectedImage)) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={isSending || (!messageText.trim() && !selectedImage)}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Action Menu */}
      <ActionMenu
        visible={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        onBookService={() => {
          setShowActionMenu(false);
          setShowBookingModal(true);
        }}
        onShareLocation={handleShareLocation}
        onSharePhoto={handleSharePhoto}
      />

      {/* Booking Modal */}
      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        service={{ name: 'Service Booking', price: 0, category: 'General' }}
        technician={technicianData}
        onBook={handleBookServiceFromChat}
        loading={bookingLoading}
      />
    </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  callButton: {
    fontSize: 20,
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  messageBubbleContainer: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    flexDirection: 'row',
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
    paddingHorizontal: 5,
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
    paddingHorizontal: 5,
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginVertical: 3,
  },
  messageBubbleWithImage: {
    width: '95%',
    padding: 0,
  },
  messageBubbleWithoutImage: {
    maxWidth: '75%',
  },
  currentUserBubble: {
    backgroundColor: '#007AFF',
  },
  otherUserBubble: {
    backgroundColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 15,
    marginBottom: 4,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTime: {
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 25,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  menuButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  imageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  imageButtonText: {
    fontSize: 20,
  },
  imagePreviewContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 150,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  messageBubbleImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
  },
});
