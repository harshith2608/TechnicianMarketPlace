import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import bookingReducer from './bookingSlice';
import callReducer from './callSlice';
import messageReducer from './messageSlice';
import paymentReducer from './paymentSlice';
import phoneAuthReducer from './phoneAuthSlice';
import serviceCompletionReducer from './serviceCompletionSlice';
import serviceReducer from './serviceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    services: serviceReducer,
    messages: messageReducer,
    calls: callReducer,
    booking: bookingReducer,
    payment: paymentReducer,
    phoneAuth: phoneAuthReducer,
    serviceCompletion: serviceCompletionReducer,
  },
});
