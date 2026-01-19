/**
 * Unit Tests for Service Completion Redux Slice (New Architecture)
 * Tests: currentCompletion state, new actions, selectors
 * Note: These are pure Redux tests and don't require Firebase
 */

import serviceCompletionReducer, {
    clearCurrentCompletion,
    clearError,
    clearSuccess,
    resetServiceCompletion,
    selectCompletionError,
    selectCompletionLoading,
    selectCompletionSuccess,
    selectCurrentCompletion,
    setCurrentCompletion,
} from '../../redux/serviceCompletionSlice';

describe('Service Completion Redux Slice - New Architecture', () => {
  const initialState = {
    currentCompletion: null,
    completionId: null,
    otp: null,
    bookingId: null,
    conversationId: null,
    customerId: null,
    technicianId: null,
    loading: false,
    success: false,
    error: null,
    otpAttempts: 0,
  };

  describe('setCurrentCompletion action', () => {
    test('should set currentCompletion with full data object', () => {
      const completionData = {
        completionId: 'comp123',
        otp: '1234',
        bookingId: 'booking123',
        conversationId: 'conv123',
        customerId: 'customer123',
        technicianId: 'tech123',
      };

      const state = serviceCompletionReducer(initialState, setCurrentCompletion(completionData));

      expect(state.currentCompletion).toEqual(completionData);
      expect(state.currentCompletion.completionId).toBe('comp123');
      expect(state.currentCompletion.otp).toBe('1234');
    });

    test('should overwrite existing currentCompletion', () => {
      let state = {
        ...initialState,
        currentCompletion: {
          completionId: 'old123',
          otp: '0000',
        },
      };

      const newData = {
        completionId: 'new456',
        otp: '5678',
      };

      state = serviceCompletionReducer(state, setCurrentCompletion(newData));
      expect(state.currentCompletion.completionId).toBe('new456');
      expect(state.currentCompletion.otp).toBe('5678');
    });

    test('should preserve all properties in currentCompletion', () => {
      const completionData = {
        completionId: 'comp123',
        otp: '1234',
        bookingId: 'booking123',
        conversationId: 'conv123',
        customerId: 'customer123',
        technicianId: 'tech123',
        otpExpiresAt: 1705600000000,
        otpVerified: false,
      };

      const state = serviceCompletionReducer(initialState, setCurrentCompletion(completionData));

      expect(state.currentCompletion).toEqual(completionData);
      expect(state.currentCompletion.otpExpiresAt).toBe(1705600000000);
      expect(state.currentCompletion.otpVerified).toBe(false);
    });
  });

  describe('clearCurrentCompletion action', () => {
    test('should clear currentCompletion to null', () => {
      let state = {
        ...initialState,
        currentCompletion: {
          completionId: 'comp123',
          otp: '1234',
        },
      };

      state = serviceCompletionReducer(state, clearCurrentCompletion());
      expect(state.currentCompletion).toBeNull();
    });

    test('should not affect other state properties', () => {
      let state = {
        ...initialState,
        completionId: 'comp123',
        otp: '1234',
        currentCompletion: {
          completionId: 'comp123',
          otp: '1234',
        },
        otpAttempts: 2,
      };

      state = serviceCompletionReducer(state, clearCurrentCompletion());

      expect(state.currentCompletion).toBeNull();
      expect(state.completionId).toBeNull();
      expect(state.otp).toBeNull();
      expect(state.otpAttempts).toBe(2);
      expect(state.success).toBe(false);
    });
  });

  describe('selectCurrentCompletion selector', () => {
    test('should return currentCompletion from state', () => {
      const stateTree = {
        serviceCompletion: {
          currentCompletion: {
            completionId: 'comp123',
            otp: '1234',
          },
        },
      };

      const result = selectCurrentCompletion(stateTree);
      expect(result).toEqual({
        completionId: 'comp123',
        otp: '1234',
      });
    });

    test('should return null when no currentCompletion', () => {
      const stateTree = {
        serviceCompletion: {
          currentCompletion: null,
        },
      };

      const result = selectCurrentCompletion(stateTree);
      expect(result).toBeNull();
    });

    test('should return all properties of currentCompletion', () => {
      const stateTree = {
        serviceCompletion: {
          currentCompletion: {
            completionId: 'comp123',
            otp: '1234',
            bookingId: 'booking123',
            conversationId: 'conv123',
            customerId: 'cust123',
            technicianId: 'tech123',
          },
        },
      };

      const result = selectCurrentCompletion(stateTree);
      expect(result.completionId).toBe('comp123');
      expect(result.otp).toBe('1234');
      expect(result.bookingId).toBe('booking123');
      expect(result.conversationId).toBe('conv123');
      expect(result.customerId).toBe('cust123');
      expect(result.technicianId).toBe('tech123');
    });
  });

  describe('Other selectors (unchanged)', () => {
    test('selectCompletionLoading should work', () => {
      const stateTree = {
        serviceCompletion: {
          loading: true,
        },
      };

      const result = selectCompletionLoading(stateTree);
      expect(result).toBe(true);
    });

    test('selectCompletionError should work', () => {
      const stateTree = {
        serviceCompletion: {
          error: 'OTP verification failed',
        },
      };

      const result = selectCompletionError(stateTree);
      expect(result).toBe('OTP verification failed');
    });

    test('selectCompletionSuccess should work', () => {
      const stateTree = {
        serviceCompletion: {
          success: true,
        },
      };

      const result = selectCompletionSuccess(stateTree);
      expect(result).toBe(true);
    });
  });

  describe('Other actions (unchanged)', () => {
    test('clearError should clear error', () => {
      let state = {
        ...initialState,
        error: 'Some error',
      };

      state = serviceCompletionReducer(state, clearError());
      expect(state.error).toBeNull();
    });

    test('clearSuccess should clear success', () => {
      let state = {
        ...initialState,
        success: true,
      };

      state = serviceCompletionReducer(state, clearSuccess());
      expect(state.success).toBe(false);
    });

    test('resetServiceCompletion should reset entire state', () => {
      let state = {
        ...initialState,
        completionId: 'comp123',
        otp: '1234',
        currentCompletion: {
          completionId: 'comp123',
          otp: '1234',
        },
        otpAttempts: 3,
        error: 'Some error',
      };

      state = serviceCompletionReducer(state, resetServiceCompletion());

      expect(state.completionId).toBeNull();
      expect(state.otp).toBeNull();
      expect(state.currentCompletion).toBeNull();
      expect(state.otpAttempts).toBe(0);
      expect(state.error).toBeNull();
    });
  });

  describe('State flow - Customer initiates completion', () => {
    test('should set currentCompletion after successful initiation', () => {
      let state = initialState;

      const completionData = {
        completionId: 'comp123',
        otp: '1234',
        bookingId: 'booking123',
        conversationId: 'conv123',
        customerId: 'cust123',
        technicianId: 'tech123',
      };

      state = serviceCompletionReducer(state, setCurrentCompletion(completionData));

      expect(state.currentCompletion).toEqual(completionData);
    });
  });

  describe('State flow - Technician verifies and clears', () => {
    test('should clear currentCompletion after verification', () => {
      let state = {
        ...initialState,
        currentCompletion: {
          completionId: 'comp123',
          otp: '1234',
        },
      };

      state = serviceCompletionReducer(state, clearCurrentCompletion());

      expect(state.currentCompletion).toBeNull();
    });
  });
});
