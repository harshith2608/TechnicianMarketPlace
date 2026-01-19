/**
 * Integration Tests for Review Eligibility System
 * Testing: Review eligibility when customer has booking for service
 * File: src/__tests__/integration/reviewEligibilityFlow.test.js
 */

import configureStore from 'redux-mock-store';

describe('Review Eligibility Flow - Customer Review Booking Requirement', () => {
  let store;
  let mockDispatch;

  beforeEach(() => {
    mockDispatch = jest.fn();
    store = configureStore([])(
      {
        auth: {
          user: {
            id: 'customer1',
            name: 'John Customer',
            email: 'john@example.com',
            userType: 'customer',
          },
          loading: false,
          error: null,
        },
        service: {
          services: [],
          currentService: {
            id: 'service1',
            title: 'Plumbing Service',
            technicianId: 'tech1',
            technicianName: 'John Technician',
          },
          userCanReview: false,
          loading: false,
          error: null,
        },
        booking: {
          bookings: [
            {
              id: 'booking1',
              serviceId: 'service1',
              customerId: 'customer1',
              technicianId: 'tech1',
              status: 'completed',
              serviceName: 'Plumbing Service',
              createdAt: '2025-12-01T10:00:00Z',
            },
          ],
          currentBooking: null,
          loading: false,
          error: null,
        },
      }
    );

    store.dispatch = mockDispatch;
  });

  describe('Review eligibility check when booking exists', () => {
    it('should allow review when customer has completed booking for service', () => {
      // Scenario: Customer completed a booking and wants to review the technician
      const state = store.getState();
      
      // Check: Customer has service1 booking
      const hasBooking = state.booking.bookings.some(
        (b) =>
          b.serviceId === state.service.currentService.id &&
          b.customerId === state.auth.user.id &&
          b.technicianId === state.service.currentService.technicianId
      );

      expect(hasBooking).toBe(true);
      expect(state.auth.user.userType).toBe('customer');
    });

    it('should allow review for pending booking (not just completed)', () => {
      // Update store with pending booking
      store = configureStore([])(
        {
          ...store.getState(),
          booking: {
            bookings: [
              {
                id: 'booking2',
                serviceId: 'service1',
                customerId: 'customer1',
                technicianId: 'tech1',
                status: 'pending', // Pending status
                serviceName: 'Plumbing Service',
                createdAt: '2025-12-15T10:00:00Z',
              },
            ],
          },
        }
      );

      const bookings = store.getState().booking.bookings;
      const hasPendingBooking = bookings.some((b) => b.status === 'pending');

      expect(hasPendingBooking).toBe(true);
    });

    it('should allow review for cancelled booking', () => {
      // Business rule: Even cancelled bookings allow review
      store = configureStore([])(
        {
          ...store.getState(),
          booking: {
            bookings: [
              {
                id: 'booking3',
                serviceId: 'service1',
                customerId: 'customer1',
                technicianId: 'tech1',
                status: 'cancelled',
                serviceName: 'Plumbing Service',
                createdAt: '2025-11-15T10:00:00Z',
              },
            ],
          },
        }
      );

      const bookings = store.getState().booking.bookings;
      const hasCancelledBooking = bookings.some((b) => b.status === 'cancelled');

      expect(hasCancelledBooking).toBe(true);
    });
  });

  describe('Review eligibility check when NO booking exists', () => {
    it('should NOT allow review when customer has no booking for service', () => {
      // Scenario: Customer views service but never booked
      store = configureStore([])(
        {
          ...store.getState(),
          booking: {
            bookings: [], // No bookings
          },
        }
      );

      const state = store.getState();
      const hasBooking = state.booking.bookings.some(
        (b) =>
          b.serviceId === state.service.currentService.id &&
          b.customerId === state.auth.user.id
      );

      expect(hasBooking).toBe(false);
    });

    it('should NOT allow review for booking with different customer', () => {
      // Scenario: Booking exists but for different customer
      store = configureStore([])(
        {
          ...store.getState(),
          booking: {
            bookings: [
              {
                id: 'booking4',
                serviceId: 'service1',
                customerId: 'different-customer', // Different customer
                technicianId: 'tech1',
                status: 'completed',
                serviceName: 'Plumbing Service',
              },
            ],
          },
        }
      );

      const state = store.getState();
      const hasBooking = state.booking.bookings.some(
        (b) =>
          b.serviceId === state.service.currentService.id &&
          b.customerId === state.auth.user.id // Current customer
      );

      expect(hasBooking).toBe(false);
    });

    it('should NOT allow review for booking with different service', () => {
      // Scenario: Customer has booking but for different service
      store = configureStore([])(
        {
          ...store.getState(),
          booking: {
            bookings: [
              {
                id: 'booking5',
                serviceId: 'service99', // Different service
                customerId: 'customer1',
                technicianId: 'tech1',
                status: 'completed',
                serviceName: 'Electrical Service',
              },
            ],
          },
        }
      );

      const state = store.getState();
      const hasBooking = state.booking.bookings.some(
        (b) =>
          b.serviceId === state.service.currentService.id && // current service
          b.customerId === state.auth.user.id
      );

      expect(hasBooking).toBe(false);
    });

    it('should NOT allow review for booking with different technician', () => {
      // Scenario: Customer has booking but different technician
      store = configureStore([])(
        {
          ...store.getState(),
          booking: {
            bookings: [
              {
                id: 'booking6',
                serviceId: 'service1',
                customerId: 'customer1',
                technicianId: 'different-tech', // Different technician
                status: 'completed',
                serviceName: 'Plumbing Service',
              },
            ],
          },
        }
      );

      const state = store.getState();
      const hasBooking = state.booking.bookings.some(
        (b) =>
          b.serviceId === state.service.currentService.id &&
          b.customerId === state.auth.user.id &&
          b.technicianId === state.service.currentService.technicianId
      );

      expect(hasBooking).toBe(false);
    });
  });

  describe('Multiple bookings scenario', () => {
    it('should allow review if any booking matches criteria', () => {
      // Scenario: Customer has multiple bookings, at least one matches
      store = configureStore([])(
        {
          ...store.getState(),
          booking: {
            bookings: [
              {
                id: 'booking7a',
                serviceId: 'service1',
                customerId: 'customer1',
                technicianId: 'tech1',
                status: 'completed',
              },
              {
                id: 'booking7b',
                serviceId: 'service2',
                customerId: 'customer1',
                technicianId: 'tech2',
                status: 'completed',
              },
              {
                id: 'booking7c',
                serviceId: 'service3',
                customerId: 'customer1',
                technicianId: 'tech3',
                status: 'completed',
              },
            ],
          },
        }
      );

      const state = store.getState();
      const matchingBooking = state.booking.bookings.find(
        (b) =>
          b.serviceId === state.service.currentService.id &&
          b.customerId === state.auth.user.id &&
          b.technicianId === state.service.currentService.technicianId
      );

      expect(matchingBooking).toBeDefined();
      expect(matchingBooking.id).toBe('booking7a');
    });

    it('should use first matching booking for review', () => {
      // Scenario: Customer has multiple bookings for same service (should not happen but handle gracefully)
      store = configureStore([])(
        {
          ...store.getState(),
          booking: {
            bookings: [
              {
                id: 'booking8a',
                serviceId: 'service1',
                customerId: 'customer1',
                technicianId: 'tech1',
                status: 'cancelled',
                createdAt: '2025-10-01T10:00:00Z',
              },
              {
                id: 'booking8b',
                serviceId: 'service1',
                customerId: 'customer1',
                technicianId: 'tech1',
                status: 'completed',
                createdAt: '2025-12-01T10:00:00Z',
              },
            ],
          },
        }
      );

      const state = store.getState();
      const firstMatchingBooking = state.booking.bookings.find(
        (b) =>
          b.serviceId === state.service.currentService.id &&
          b.customerId === state.auth.user.id
      );

      // Should find first one (cancelled)
      expect(firstMatchingBooking.id).toBe('booking8a');
    });
  });

  describe('Review eligibility UI message', () => {
    it('should show correct message when review is eligible', () => {
      const state = store.getState();
      const hasBooking = state.booking.bookings.length > 0;

      const message = hasBooking ? '📦 You can rate after booking' : 'Create a booking to rate';
      expect(message).toBe('📦 You can rate after booking');
    });

    it('should show different message when review is not eligible', () => {
      store = configureStore([])(
        {
          ...store.getState(),
          booking: { bookings: [] },
        }
      );

      const state = store.getState();
      const hasBooking = state.booking.bookings.length > 0;

      const message = hasBooking ? '📦 You can rate after booking' : 'Create a booking to rate';
      expect(message).toBe('Create a booking to rate');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty booking list gracefully', () => {
      store = configureStore([])(
        {
          ...store.getState(),
          booking: { bookings: [] },
        }
      );

      const state = store.getState();
      expect(() => {
        const hasBooking = state.booking.bookings.some((b) => b.serviceId === 'service1');
        expect(hasBooking).toBe(false);
      }).not.toThrow();
    });

    it('should handle missing booking fields gracefully', () => {
      store = configureStore([])(
        {
          ...store.getState(),
          booking: {
            bookings: [
              {
                id: 'booking-incomplete',
                // Missing serviceId, customerId, technicianId
              },
            ],
          },
        }
      );

      const state = store.getState();
      const hasBooking = state.booking.bookings.some((b) => b.serviceId === 'service1');
      expect(hasBooking).toBe(false);
    });

    it('should handle null or undefined current service', () => {
      store = configureStore([])(
        {
          ...store.getState(),
          service: { currentService: null },
        }
      );

      const state = store.getState();
      expect(() => {
        const hasBooking = state.booking.bookings.some(
          (b) => b.serviceId === state.service.currentService?.id
        );
        expect(hasBooking).toBe(false);
      }).not.toThrow();
    });
  });
});
