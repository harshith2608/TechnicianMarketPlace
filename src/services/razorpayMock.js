/**
 * Razorpay Mock for Simulator Testing
 * Simulates Razorpay payment flow for development/testing on Expo Go
 * In production, this should use the real react-native-razorpay package
 */

export const RazorpayCheckout = {
  open: (options) => {
    return new Promise((resolve, reject) => {
      // Simulate payment processing delay
      setTimeout(() => {
        // Mock successful payment response
        const mockPaymentData = {
          razorpay_payment_id: 'pay_' + Math.random().toString(36).substr(2, 14),
          razorpay_order_id: options.order_id,
          razorpay_signature: 'mock_signature_' + Math.random().toString(36).substr(2, 8),
        };
        
        console.log('✓ Mock Razorpay Payment Successful:', mockPaymentData);
        resolve(mockPaymentData);
      }, 2000); // 2 second delay to simulate payment UI
    });
  },
};

export default RazorpayCheckout;
