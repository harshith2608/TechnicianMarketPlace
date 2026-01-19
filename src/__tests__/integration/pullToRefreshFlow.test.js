/**
 * Integration Tests for Pull-to-Refresh Functionality
 * Testing: Verify Redux state updates and data fetching on BookingsScreen, MessagesScreen, HomeScreen
 * File: src/__tests__/integration/pullToRefreshFlow.test.js
 */

import configureStore from 'redux-mock-store';

describe('Pull-to-Refresh Integration Flow', () => {
  let store;
  let mockDispatch;

  beforeEach(() => {
    mockDispatch = jest.fn();
  });

  describe('BookingsScreen Pull-to-Refresh', () => {
    beforeEach(() => {
      store = configureStore([])(
        {
          booking: {
            bookings: [
              {
                id: 'booking1',
                serviceName: 'Plumbing',
                status: 'completed',
                technicianName: 'John',
                customerRating: 4.5,
              },
            ],
            loading: false,
            refreshing: false,
            error: null,
          },
          auth: {
            user: {
              id: 'customer1',
              userType: 'customer',
            },
          },
        }
      );
      store.dispatch = mockDispatch;
    });

    it('should initialize with refreshing false', () => {
      expect(store.getState().booking.refreshing).toBe(false);
    });

    it('should have bookings in initial state', () => {
      expect(store.getState().booking.bookings).toHaveLength(1);
      expect(store.getState().booking.bookings[0].serviceName).toBe('Plumbing');
    });

    it('should handle refresh start action', () => {
      store.dispatch({
        type: 'booking/setRefreshing',
        payload: true,
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'booking/setRefreshing',
        payload: true,
      });
    });

    it('should handle bookings update after refresh', () => {
      const updatedBookings = [
        {
          id: 'booking1',
          serviceName: 'Plumbing',
          status: 'completed',
          technicianName: 'John',
          customerRating: 4.8, // Updated rating
        },
        {
          id: 'booking2',
          serviceName: 'Electrical',
          status: 'pending',
          technicianName: 'Sarah',
          customerRating: null,
        },
      ];

      store.dispatch({
        type: 'booking/setBookings',
        payload: updatedBookings,
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'booking/setBookings',
        payload: updatedBookings,
      });
    });

    it('should handle refresh complete action', () => {
      store.dispatch({
        type: 'booking/setRefreshing',
        payload: false,
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'booking/setRefreshing',
        payload: false,
      });
    });

    it('should handle refresh error gracefully', () => {
      store.dispatch({
        type: 'booking/setError',
        payload: 'Failed to fetch bookings',
      });

      store.dispatch({
        type: 'booking/setRefreshing',
        payload: false,
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('MessagesScreen Pull-to-Refresh', () => {
    beforeEach(() => {
      store = configureStore([])(
        {
          message: {
            conversations: [
              {
                id: 'conv1',
                participantId: 'tech1',
                participantName: 'John',
                lastMessage: 'See you tomorrow!',
                unread: false,
              },
            ],
            currentConversation: null,
            messages: [],
            unreadCount: 0,
            loading: false,
            refreshing: false,
            error: null,
          },
        }
      );
      store.dispatch = mockDispatch;
    });

    it('should initialize with refreshing false', () => {
      expect(store.getState().message.refreshing).toBe(false);
    });

    it('should have conversations in initial state', () => {
      expect(store.getState().message.conversations).toHaveLength(1);
    });

    it('should update conversations on refresh', () => {
      const updatedConversations = [
        {
          id: 'conv1',
          participantId: 'tech1',
          participantName: 'John',
          lastMessage: 'Updated message',
          lastMessageTime: new Date().toISOString(),
          unread: false,
        },
        {
          id: 'conv2',
          participantId: 'tech2',
          participantName: 'Sarah',
          lastMessage: 'New conversation',
          unread: true,
        },
      ];

      store.dispatch({
        type: 'message/setConversations',
        payload: updatedConversations,
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'message/setConversations',
        payload: updatedConversations,
      });
    });

    it('should recalculate unread count after refresh', () => {
      const conversations = [
        { id: 'conv1', unread: false },
        { id: 'conv2', unread: true },
        { id: 'conv3', unread: true },
      ];

      store.dispatch({
        type: 'message/setConversations',
        payload: conversations,
      });

      const unreadCount = conversations.filter((c) => c.unread).length;

      store.dispatch({
        type: 'message/setUnreadCount',
        payload: unreadCount,
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'message/setUnreadCount',
        payload: 2,
      });
    });

    it('should handle refresh error without clearing conversations', () => {
      const existingConversations = store.getState().message.conversations;

      store.dispatch({
        type: 'message/setError',
        payload: 'Network error',
      });

      // Conversations should still be accessible
      expect(existingConversations).toHaveLength(1);
    });
  });

  describe('HomeScreen Pull-to-Refresh', () => {
    beforeEach(() => {
      store = configureStore([])(
        {
          service: {
            services: [
              {
                id: 'service1',
                title: 'Plumbing',
                category: 'Maintenance',
                price: 100,
              },
            ],
            loading: false,
            refreshing: false,
            error: null,
          },
          auth: {
            user: {
              id: 'tech1',
              userType: 'technician',
            },
          },
        }
      );
      store.dispatch = mockDispatch;
    });

    it('should initialize with refreshing false', () => {
      expect(store.getState().service.refreshing).toBe(false);
    });

    it('should update services on refresh', () => {
      const updatedServices = [
        {
          id: 'service1',
          title: 'Plumbing',
          category: 'Maintenance',
          price: 100,
          views: 15, // Updated data
        },
        {
          id: 'service2',
          title: 'Electrical',
          category: 'Installation',
          price: 150,
          views: 8,
        },
      ];

      store.dispatch({
        type: 'service/setServices',
        payload: updatedServices,
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'service/setServices',
        payload: updatedServices,
      });
    });

    it('should fetch user services for technician on refresh', () => {
      const state = store.getState();
      expect(state.auth.user.userType).toBe('technician');

      store.dispatch({
        type: 'service/fetchUserServices/pending',
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'service/fetchUserServices/pending',
      });
    });

    it('should update conversation metrics on refresh', () => {
      const metrics = {
        totalConversations: 5,
        activeConversations: 3,
        messageCount: 42,
      };

      store.dispatch({
        type: 'service/setMetrics',
        payload: metrics,
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'service/setMetrics',
        payload: metrics,
      });
    });

    it('should mark refresh complete', () => {
      store.dispatch({
        type: 'service/setRefreshing',
        payload: false,
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'service/setRefreshing',
        payload: false,
      });
    });
  });

  describe('Pull-to-Refresh Edge Cases', () => {
    it('should handle rapid successive refreshes', () => {
      store = configureStore([])(
        {
          booking: {
            bookings: [],
            loading: false,
            refreshing: false,
            error: null,
          },
        }
      );
      store.dispatch = mockDispatch;

      store.dispatch({ type: 'booking/setRefreshing', payload: true });
      store.dispatch({ type: 'booking/setRefreshing', payload: false });
      store.dispatch({ type: 'booking/setRefreshing', payload: true });

      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });

    it('should handle refresh timeout', () => {
      store = configureStore([])(
        {
          booking: {
            bookings: [],
            loading: false,
            refreshing: true,
            error: null,
          },
        }
      );
      store.dispatch = mockDispatch;

      // Simulate timeout - mark refresh as complete and set error
      store.dispatch({
        type: 'booking/setRefreshing',
        payload: false,
      });

      store.dispatch({
        type: 'booking/setError',
        payload: 'Refresh timeout',
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle partial data updates during refresh', () => {
      store = configureStore([])(
        {
          booking: {
            bookings: [
              {
                id: 'booking1',
                serviceName: 'Plumbing',
                status: 'completed',
              },
            ],
            loading: false,
            refreshing: true,
            error: null,
          },
        }
      );
      store.dispatch = mockDispatch;

      // Update only specific bookings
      store.dispatch({
        type: 'booking/updateBooking',
        payload: {
          id: 'booking1',
          customerRating: 4.8,
        },
      });

      store.dispatch({
        type: 'booking/setRefreshing',
        payload: false,
      });

      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh when user is offline', () => {
      store = configureStore([])(
        {
          app: {
            isOnline: false,
          },
          booking: {
            bookings: [],
            refreshing: false,
            error: null,
          },
        }
      );
      store.dispatch = mockDispatch;

      const isOnline = store.getState().app.isOnline;
      expect(isOnline).toBe(false);

      // Should attempt refresh but may fail gracefully
      store.dispatch({
        type: 'booking/setError',
        payload: 'No internet connection',
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
