import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';

// Thunk to fetch all conversations for a user
export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async (userId, { rejectWithValue }) => {
    try {
      const conversationsCollection = collection(db, 'conversations');
      // Query without orderBy to avoid needing composite index
      const q = query(
        conversationsCollection,
        where('participants', 'array-contains', userId)
      );
      const snapshot = await getDocs(q);
      
      const conversations = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        });
      }
      
      // Sort conversations by updatedAt in descending order (most recent first)
      conversations.sort((a, b) => {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      
      return conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

// Thunk to fetch messages in a conversation
export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (conversationId, { rejectWithValue }) => {
    try {
      const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesCollection, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      
      const messages = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          message: data.message || '',
          imageUrl: data.imageUrl || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        });
      }
      
      return messages;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Thunk to send a message
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ conversationId, userId, userName, message, imageUri }, { rejectWithValue }) => {
    try {
      if (!conversationId || !userId || (!message && !imageUri)) {
        console.error('Missing required fields:', { conversationId, userId, message, imageUri });
        return rejectWithValue('Missing required fields: need either message or image');
      }

      let imageUrl = null;

      // Upload image if provided
      if (imageUri) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const timestamp = Date.now();
          const imagePath = `conversations/${conversationId}/images/${timestamp}.jpg`;
          const imageRef = ref(storage, imagePath);
          
          await uploadBytes(imageRef, blob);
          imageUrl = await getDownloadURL(imageRef);
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          return rejectWithValue('Failed to upload image');
        }
      }

      const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
      const messageData = {
        userId,
        userName,
        createdAt: serverTimestamp(),
      };

      if (message) messageData.message = message;
      if (imageUrl) messageData.imageUrl = imageUrl;

      const docRef = await addDoc(messagesCollection, messageData);

      // Update conversation's lastMessage and updatedAt
      const conversationRef = doc(db, 'conversations', conversationId);
      const lastMessageText = message || (imageUrl ? '[Image]' : '');
      await updateDoc(conversationRef, {
        lastMessage: lastMessageText,
        updatedAt: serverTimestamp(),
      });

      return {
        id: docRef.id,
        userId,
        userName,
        message: message || '',
        imageUrl: imageUrl || null,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in sendMessage thunk:', error.message, error.code);
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

// Thunk to start a new conversation
export const startConversation = createAsyncThunk(
  'messages/startConversation',
  async ({ customerId, customerName, technicianId, technicianName }, { rejectWithValue }) => {
    try {
      // Check if conversation already exists
      const conversationsCollection = collection(db, 'conversations');
      const q = query(
        conversationsCollection,
        where('participants', 'array-contains', customerId)
      );
      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.participants.includes(technicianId)) {
          // Conversation already exists
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          };
        }
      }

      // Create new conversation
      const newConversation = await addDoc(conversationsCollection, {
        participants: [customerId, technicianId],
        participantNames: {
          [customerId]: customerName,
          [technicianId]: technicianName,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
      });

      return {
        id: newConversation.id,
        participants: [customerId, technicianId],
        participantNames: {
          [customerId]: customerName,
          [technicianId]: technicianName,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: '',
      };
    } catch (error) {
      console.error('startConversation error:', error.message, error.code);
      return rejectWithValue(error.message || 'Unknown error');
    }
  }
);

const initialState = {
  conversations: [],
  currentMessages: [],
  currentConversationId: null,
  loading: false,
  error: null,
};

const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentConversation: (state, action) => {
      state.currentConversationId = action.payload;
    },
    clearCurrentMessages: (state) => {
      state.currentMessages = [];
    },
    updateMessagesRealTime: (state, action) => {
      state.currentMessages = action.payload;
    },
    updateConversationsRealTime: (state, action) => {
      state.conversations = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch conversations
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch messages
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMessages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Send message
    builder
      .addCase(sendMessage.pending, (state) => {
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        // Don't manually push - let real-time listener handle it to avoid duplicates
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Start conversation
    builder
      .addCase(startConversation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConversationId = action.payload.id;
        // Add to conversations if not already there
        const exists = state.conversations.find(c => c.id === action.payload.id);
        if (!exists) {
          state.conversations.unshift(action.payload);
        }
      })
      .addCase(startConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentConversation, clearCurrentMessages, updateMessagesRealTime, updateConversationsRealTime } = messageSlice.actions;
export default messageSlice.reducer;
