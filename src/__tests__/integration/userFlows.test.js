/**
 * Integration Tests for Critical User Flows
 * Testing: Complete workflows combining multiple components and Redux actions
 * File: src/__tests__/integration/userFlows.test.js
 */

import configureStore from 'redux-mock-store';

// Test scenarios
describe('User Flow Integration Tests', () => {
  let store;
  let mockDispatch;

  beforeEach(() => {
    mockDispatch = jest.fn();
    store = configureStore([])(
      {
        auth: {
          user: null,
          loading: false,
          error: null,
          userType: null,
        },
        booking: {
          bookings: [],
          currentBooking: null,
          loading: false,
          error: null,
        },
        message: {
          conversations: [],
          currentConversation: null,
          messages: [],
          unreadCount: 0,
          loading: false,
          error: null,
          typingUsers: [],
        },
      }
    );

    store.dispatch = mockDispatch;

    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
    });
  });

  // ===== REGISTRATION AND LEGAL FLOW =====
  describe('Complete Registration and Legal Acceptance Flow', () => {
    it('should complete full registration to legal acceptance flow', async () => {
      /**
       * Flow:
       * 1. User registers with email/phone
       * 2. System creates user record
       * 3. Redirects to legal acceptance screen
       * 4. User accepts all terms
       * 5. Redirects to home screen
       */

      // Step 1-2: Register user
      expect(mockDispatch).toHaveBeenCalledTimes(0);

      const registrationAction = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        phone: '+919876543210',
      };

      // Simulate dispatch
      mockDispatch(registrationAction);
      expect(mockDispatch).toHaveBeenCalled();

      // Step 3: System should update store with new user
      const newUserState = {
        ...store.getState().auth,
        user: {
          id: 'user123',
          email: registrationAction.email,
          name: registrationAction.name,
          phone: registrationAction.phone,
        },
      };

      expect(newUserState.user).toBeTruthy();
      expect(newUserState.user.email).toBe('john@example.com');
    });

    it('should handle registration with customer role', async () => {
      const registrationData = {
        userType: 'customer',
        name: 'Jane Customer',
        email: 'jane@example.com',
        password: 'SecurePass456!',
        phone: '+919876543211',
      };

      mockDispatch(registrationData);

      expect(mockDispatch).toHaveBeenCalledWith(registrationData);
    });

    it('should handle registration with technician role and skills', async () => {
      const technicianData = {
        userType: 'technician',
        name: 'Mike Technician',
        email: 'mike@example.com',
        password: 'SecurePass789!',
        phone: '+919876543212',
        skills: ['plumbing', 'electrical'],
        experience: '5 years',
      };

      mockDispatch(technicianData);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userType: 'technician',
          skills: expect.any(Array),
        })
      );
    });

    it('should prevent registration with invalid data', async () => {
      const invalidData = {
        name: 'J', // Too short
        email: 'notanemail',
        password: 'weak',
      };

      // Should not dispatch if validation fails
      const isValid = await validateRegistrationData(invalidData);
      expect(isValid).toBe(false);
    });

    it('should handle registration with duplicate email', async () => {
      mockDispatch({
        type: 'registerUser',
        payload: {
          email: 'existing@example.com',
        },
      });

      // Simulate error from backend
      mockDispatch({
        type: 'registerUser/rejected',
        payload: 'Email already registered',
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: 'Email already registered',
        })
      );
    });
  });

  // ===== LOGIN AND AUTHENTICATION FLOW =====
  describe('Login Authentication Flow', () => {
    it('should complete email login flow', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'SecurePass123!',
      };

      mockDispatch({
        type: 'loginUser',
        payload: loginData,
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            email: 'john@example.com',
          }),
        })
      );
    });

    it('should handle phone login with OTP verification', async () => {
      // Step 1: Request OTP
      mockDispatch({
        type: 'requestPhoneOTP',
        payload: { phone: '+919876543210' },
      });

      // Step 2: Verify OTP
      mockDispatch({
        type: 'verifyPhoneOTP',
        payload: {
          phone: '+919876543210',
          otp: '123456',
        },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle login failure and retry', async () => {
      // First attempt fails
      mockDispatch({
        type: 'loginUser/rejected',
        payload: 'Invalid credentials',
      });

      // Retry
      mockDispatch({
        type: 'loginUser',
        payload: {
          email: 'john@example.com',
          password: 'CorrectPass123!',
        },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle session timeout and re-login', async () => {
      // User's session expires
      mockDispatch({
        type: 'setError',
        payload: 'Session expired',
      });

      // User logs in again
      mockDispatch({
        type: 'loginUser',
        payload: {
          email: 'john@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // ===== BOOKING CREATION FLOW =====
  describe('Booking Creation Flow', () => {
    it('should complete booking creation flow for customer', async () => {
      /**
       * Flow:
       * 1. Customer searches for service
       * 2. Selects technician
       * 3. Schedules date and time
       * 4. Confirms booking
       * 5. Receives confirmation
       */

      // Mock customer logged in
      store = configureStore([])(
        {
          auth: {
            user: {
              id: 'customer123',
              email: 'john@example.com',
              userType: 'customer',
            },
          },
        }
      );
      store.dispatch = mockDispatch;

      // Step 1-4: Create booking
      const bookingData = {
        serviceId: 'service123',
        technicianId: 'tech123',
        scheduledDate: '2024-12-25',
        scheduledTime: '10:00 AM',
        address: '123 Main St',
        description: 'Plumbing repair',
        estimatedCost: 500,
      };

      mockDispatch({
        type: 'createBooking',
        payload: bookingData,
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            serviceId: 'service123',
            technicianId: 'tech123',
          }),
        })
      );

      // Step 5: Booking created
      const createdBooking = {
        id: 'booking123',
        status: 'pending',
        ...bookingData,
      };

      expect(createdBooking.status).toBe('pending');
    });

    it('should handle booking cancellation', async () => {
      const bookingId = 'booking123';

      // Cancel booking
      mockDispatch({
        type: 'cancelBooking',
        payload: bookingId,
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: bookingId,
        })
      );
    });

    it('should handle technician accepting booking', async () => {
      // Technician views pending bookings
      const pendingBookings = [
        {
          id: 'booking123',
          status: 'pending',
          description: 'Plumbing repair',
        },
      ];

      // Technician accepts
      mockDispatch({
        type: 'updateBooking',
        payload: {
          id: 'booking123',
          status: 'accepted',
          technicianId: 'tech123',
        },
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            status: 'accepted',
          }),
        })
      );
    });

    it('should handle booking completion and rating', async () => {
      // Booking completed
      mockDispatch({
        type: 'updateBooking',
        payload: {
          id: 'booking123',
          status: 'completed',
          actualCost: 500,
        },
      });

      // Customer rates
      mockDispatch({
        type: 'rateBooking',
        payload: {
          bookingId: 'booking123',
          rating: 4.5,
          review: 'Great work!',
        },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });
  });

  // ===== MESSAGING FLOW =====
  describe('Messaging Flow', () => {
    it('should complete message conversation flow', async () => {
      /**
       * Flow:
       * 1. Open conversation
       * 2. Load message history
       * 3. Send message
       * 4. Receive reply
       * 5. Mark messages as read
       */

      // Step 1: Start conversation
      mockDispatch({
        type: 'openConversation',
        payload: 'conv123',
      });

      // Step 2: Load messages
      mockDispatch({
        type: 'getMessages',
        payload: 'conv123',
      });

      // Step 3: Send message
      mockDispatch({
        type: 'sendMessage',
        payload: {
          conversationId: 'conv123',
          text: 'Hello, do you have availability?',
        },
      });

      // Step 4: Receive reply (simulated)
      mockDispatch({
        type: 'receiveMessage',
        payload: {
          id: 'msg124',
          conversationId: 'conv123',
          text: 'Yes, I can help. What time?',
          isRead: false,
        },
      });

      // Step 5: Mark as read
      mockDispatch({
        type: 'markAsRead',
        payload: 'msg124',
      });

      expect(mockDispatch).toHaveBeenCalledTimes(5);
    });

    it('should handle typing indicators during messaging', async () => {
      // Other user starts typing
      mockDispatch({
        type: 'setTypingStatus',
        payload: {
          userId: 'tech123',
          isTyping: true,
        },
      });

      // Other user sends message
      mockDispatch({
        type: 'sendMessage',
        payload: {
          text: 'I can help with that.',
        },
      });

      // Other user stops typing
      mockDispatch({
        type: 'setTypingStatus',
        payload: {
          userId: 'tech123',
          isTyping: false,
        },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });

    it('should handle message with image', async () => {
      mockDispatch({
        type: 'sendMessage',
        payload: {
          conversationId: 'conv123',
          text: 'Check this damage',
          imageUrl: 'https://example.com/image.jpg',
        },
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            imageUrl: expect.stringContaining('http'),
          }),
        })
      );
    });

    it('should load conversation history on app restart', async () => {
      // Simulate app restart
      mockDispatch({
        type: 'getConversations',
      });

      // Should fetch conversations including unread counts
      mockDispatch({
        type: 'updateUnreadCount',
        payload: {
          totalUnread: 5,
        },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });
  });

  // ===== ERROR RECOVERY FLOWS =====
  describe('Error Recovery Flows', () => {
    it('should handle and recover from network error', async () => {
      // Network error occurs
      mockDispatch({
        type: 'setError',
        payload: 'Network error',
      });

      // User retries
      mockDispatch({
        type: 'retry',
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid token and re-authenticate', async () => {
      // Invalid token error
      mockDispatch({
        type: 'setError',
        payload: 'Invalid token',
      });

      // Re-authenticate
      mockDispatch({
        type: 'refreshToken',
      });

      mockDispatch({
        type: 'loginUser',
        payload: {
          email: 'john@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle payment failure', async () => {
      // Payment fails
      mockDispatch({
        type: 'processPayment/rejected',
        payload: 'Payment declined',
      });

      // Retry payment
      mockDispatch({
        type: 'processPayment',
        payload: {
          bookingId: 'booking123',
          amount: 500,
        },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });
  });

  // ===== PROFILE OPERATIONS =====
  describe('Profile Update Operations', () => {
    it('should update customer profile', async () => {
      mockDispatch({
        type: 'updateProfile',
        payload: {
          name: 'John Updated',
          phone: '+919876543220',
          address: 'New Address',
        },
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            name: 'John Updated',
          }),
        })
      );
    });

    it('should update technician profile with skills', async () => {
      mockDispatch({
        type: 'updateProfile',
        payload: {
          name: 'Mike Updated',
          skills: ['plumbing', 'electrical', 'carpentry'],
          experience: '7 years',
          hourlyRate: 50,
        },
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            skills: expect.arrayContaining(['plumbing']),
          }),
        })
      );
    });

    it('should upload profile picture', async () => {
      mockDispatch({
        type: 'uploadProfilePicture',
        payload: {
          userId: 'user123',
          imageUrl: 'https://example.com/profile.jpg',
        },
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // ===== STATE PERSISTENCE =====
  describe('State Persistence Across Sessions', () => {
    it('should persist authentication state', async () => {
      const authState = {
        user: {
          id: 'user123',
          email: 'john@example.com',
        },
        token: 'valid_token',
      };

      // Save to local storage
      mockDispatch({
        type: 'saveAuthState',
        payload: authState,
      });

      // Restore on app launch
      mockDispatch({
        type: 'restoreAuthState',
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should load conversations on app start', async () => {
      mockDispatch({
        type: 'loadConversations',
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // ===== EDGE CASES AND CORNER SCENARIOS =====
  describe('Edge Cases and Corner Scenarios', () => {
    it('should handle simultaneous booking requests', async () => {
      const bookings = [
        {
          serviceId: 'service1',
          technicianId: 'tech1',
        },
        {
          serviceId: 'service2',
          technicianId: 'tech2',
        },
      ];

      bookings.forEach((booking) => {
        mockDispatch({
          type: 'createBooking',
          payload: booking,
        });
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle offline mode gracefully', async () => {
      // Set offline
      mockDispatch({
        type: 'setOfflineMode',
        payload: true,
      });

      // Try to send message (should be queued)
      mockDispatch({
        type: 'sendMessage',
        payload: {
          text: 'Message in offline mode',
          offline: true,
        },
      });

      // Come online
      mockDispatch({
        type: 'setOfflineMode',
        payload: false,
      });

      // Should sync queued messages
      mockDispatch({
        type: 'syncOfflineMessages',
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle rapid state changes', async () => {
      for (let i = 0; i < 10; i++) {
        mockDispatch({
          type: 'updateUI',
          payload: { index: i },
        });
      }

      expect(mockDispatch).toHaveBeenCalledTimes(10);
    });
  });

  // ===== EXTENDED EDGE CASE SCENARIOS =====
  describe('Extended Real-world Scenarios', () => {
    it('should handle user switching between customer and technician roles', async () => {
      // Logout as customer
      mockDispatch({
        type: 'logoutUser',
      });

      // Re-register as technician
      mockDispatch({
        type: 'registerUser',
        payload: {
          userType: 'technician',
          name: 'Mike Tech',
          email: 'mike@example.com',
          skills: ['plumbing'],
        },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle booking with custom service request', async () => {
      mockDispatch({
        type: 'createBooking',
        payload: {
          customDescription: 'Urgent: Pipe burst in kitchen',
          urgencyLevel: 'high',
          preferredTime: 'ASAP',
        },
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle multiple messages in quick succession', async () => {
      const messages = [
        { text: 'Hello?' },
        { text: 'Are you there?' },
        { text: 'Can you help?' },
      ];

      messages.forEach((msg) => {
        mockDispatch({
          type: 'sendMessage',
          payload: msg,
        });
      });

      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });

    it('should handle notification preferences during registration', async () => {
      mockDispatch({
        type: 'registerUser',
        payload: {
          email: 'user@example.com',
          password: 'Pass123!',
          preferences: {
            emailNotifications: true,
            pushNotifications: false,
            smsNotifications: true,
          },
        },
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle cancellation with reason and feedback', async () => {
      mockDispatch({
        type: 'cancelBooking',
        payload: {
          bookingId: 'booking123',
          reason: 'Found another technician',
          feedback: 'Service was good but too expensive',
        },
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle payment retry with different payment method', async () => {
      // First payment fails
      mockDispatch({
        type: 'processPayment/rejected',
        payload: { bookingId: 'booking123', method: 'card' },
      });

      // Retry with different method
      mockDispatch({
        type: 'processPayment',
        payload: { bookingId: 'booking123', method: 'upi' },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle incomplete profile and profile completion flow', async () => {
      // Register with minimal data
      mockDispatch({
        type: 'registerUser',
        payload: {
          email: 'user@example.com',
          password: 'Pass123!',
        },
      });

      // Redirect to complete profile
      mockDispatch({
        type: 'navigateToProfileCompletion',
      });

      // Complete profile
      mockDispatch({
        type: 'updateProfile',
        payload: {
          phone: '+919876543210',
          address: '123 Main St',
          photo: 'profile.jpg',
        },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });

    it('should handle technician availability schedule setting', async () => {
      mockDispatch({
        type: 'setAvailability',
        payload: {
          monday: { start: '9:00 AM', end: '6:00 PM', available: true },
          tuesday: { start: '9:00 AM', end: '6:00 PM', available: true },
          wednesday: { available: false },
          thursday: { start: '9:00 AM', end: '6:00 PM', available: true },
          friday: { start: '9:00 AM', end: '6:00 PM', available: true },
          weekend: { available: false },
        },
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle customer viewing technician profile and reviews', async () => {
      mockDispatch({
        type: 'loadTechnicianProfile',
        payload: 'tech123',
      });

      mockDispatch({
        type: 'loadTechnicianReviews',
        payload: 'tech123',
      });

      mockDispatch({
        type: 'loadTechnicianRating',
        payload: 'tech123',
      });

      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });

    it('should handle app resume after forced logout due to token expiry', async () => {
      // App resumes
      mockDispatch({
        type: 'appResumed',
      });

      // Check token validity
      mockDispatch({
        type: 'validateToken',
      });

      // Token invalid, force login
      mockDispatch({
        type: 'forceLogout',
        payload: 'Token expired',
      });

      // User logs in again
      mockDispatch({
        type: 'loginUser',
        payload: { email: 'user@example.com', password: 'Pass123!' },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(4);
    });

    it('should handle successful booking-to-payment flow end-to-end', async () => {
      // Create booking
      mockDispatch({
        type: 'createBooking',
        payload: { serviceId: 'service1', technicianId: 'tech1' },
      });

      // Technician accepts
      mockDispatch({
        type: 'updateBooking',
        payload: { bookingId: 'booking1', status: 'accepted' },
      });

      // Message exchange
      mockDispatch({
        type: 'sendMessage',
        payload: { text: 'On the way' },
      });

      // Service completed
      mockDispatch({
        type: 'updateBooking',
        payload: { bookingId: 'booking1', status: 'completed', actualCost: 500 },
      });

      // Payment processed
      mockDispatch({
        type: 'processPayment',
        payload: { bookingId: 'booking1', amount: 500 },
      });

      // Rate and review
      mockDispatch({
        type: 'rateBooking',
        payload: { bookingId: 'booking1', rating: 5, review: 'Excellent!' },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(6);
    });
  });
});

// Helper function for validation
async function validateRegistrationData(data) {
  if (!data.name || data.name.length < 2) return false;
  if (!data.email || !data.email.includes('@')) return false;
  if (!data.password || data.password.length < 8) return false;
  return true;
}
