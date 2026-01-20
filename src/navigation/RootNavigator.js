import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { BookingsScreen } from '../screens/BookingsScreen';
import { CallScreen } from '../screens/CallScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LegalAcceptanceScreen } from '../screens/LegalAcceptanceScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { MyServicesScreen } from '../screens/MyServicesScreen';
import { OTPDisplayScreen } from '../screens/OTPDisplayScreen';
import { OTPVerificationScreen } from '../screens/OTPVerificationScreen';
import PaymentConfirmationScreen from '../screens/PaymentConfirmationScreen';
import { PaymentReleasedScreen } from '../screens/PaymentReleasedScreen';
import PaymentScreen from '../screens/PaymentScreen';
import { PaymentSuccessScreen } from '../screens/PaymentSuccessScreen';
import { PaymentVerifiedScreen } from '../screens/PaymentVerifiedScreen';
import PayoutSettingsScreen from '../screens/PayoutSettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ServiceCompletionScreen } from '../screens/ServiceCompletionScreen';
import { ServiceDetailScreen } from '../screens/ServiceDetailScreen';
import { ServiceRatingsScreen } from '../screens/ServiceRatingsScreen';
import { ServicesScreen } from '../screens/ServicesScreen';
import { TechnicianBookingsScreen } from '../screens/TechnicianBookingsScreen';
import { TechnicianProfileScreen } from '../screens/TechnicianProfileScreen';

const Stack = createStackNavigator();

export const RootNavigator = () => {
  const user = useSelector((state) => state.auth.user);
  const legalAccepted = user?.legalAcceptance?.accepted;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerTintColor: '#007AFF',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
        }}
      >
        {user ? (
          // User is logged in
          <>
            {!legalAccepted ? (
              // Show legal acceptance screen if not accepted
              <Stack.Screen
                name="LegalAcceptance"
                component={LegalAcceptanceScreen}
                options={{
                  headerTitle: 'Legal Agreement',
                  headerLeft: () => null, // Prevent back navigation
                  animationEnabled: false,
                }}
              />
            ) : (
              // Show main app screens
              <Stack.Group>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{
                    headerTitle: 'Home',
                    headerLeft: () => null, // Prevent back navigation
                  }}
                />
            <Stack.Screen
              name="Services"
              component={ServicesScreen}
              options={{
                headerTitle: 'Services',
              }}
            />
            <Stack.Screen
              name="MyServices"
              component={MyServicesScreen}
              options={{
                headerTitle: 'My Services',
              }}
            />
            <Stack.Screen
              name="ServiceDetail"
              component={ServiceDetailScreen}
              options={{
                headerTitle: 'Service Detail',
              }}
            />
            <Stack.Screen
              name="ServiceRatings"
              component={ServiceRatingsScreen}
              options={{
                headerTitle: 'Service Ratings',
              }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerTitle: 'Edit Profile',
              }}
            />
            <Stack.Screen
              name="TechnicianProfile"
              component={TechnicianProfileScreen}
              options={{
                headerTitle: 'Profile',
              }}
            />
            <Stack.Screen
              name="Messages"
              component={MessagesScreen}
              options={{
                headerTitle: 'Messages',
              }}
            />
            <Stack.Screen
              name="ChatDetail"
              component={ChatDetailScreen}
              options={{
                headerTitle: 'Chat',
              }}
            />
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{
                headerTitle: 'Call',
              }}
            />
            <Stack.Screen
              name="Payment"
              component={PaymentScreen}
              options={{
                headerTitle: 'Payment',
              }}
            />
            <Stack.Screen
              name="PaymentConfirmation"
              component={PaymentConfirmationScreen}
              options={{
                headerTitle: 'Payment Confirmation',
              }}
            />
            <Stack.Screen
              name="PaymentSuccess"
              component={PaymentSuccessScreen}
              options={{
                headerTitle: 'Booking Confirmed',
              }}
            />
            <Stack.Screen
              name="Bookings"
              component={BookingsScreen}
              options={{
                headerTitle: 'Bookings',
              }}
            />
            <Stack.Screen
              name="TechnicianBookings"
              component={TechnicianBookingsScreen}
              options={{
                headerTitle: 'My Bookings',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="ServiceCompletion"
              component={ServiceCompletionScreen}
              options={{
                headerTitle: 'Complete Service',
              }}
            />
            <Stack.Screen
              name="OTPDisplay"
              component={OTPDisplayScreen}
              options={{
                headerTitle: 'Your OTP',
                headerLeft: () => null,
              }}
            />
            <Stack.Screen
              name="OTPVerification"
              component={OTPVerificationScreen}
              options={{
                headerTitle: 'Verify OTP',
                headerLeft: () => null,
              }}
            />
            <Stack.Screen
              name="PaymentReleased"
              component={PaymentReleasedScreen}
              options={{
                headerTitle: 'Payment Released',
                headerLeft: () => null,
              }}
            />
            <Stack.Screen
              name="PaymentVerified"
              component={PaymentVerifiedScreen}
              options={{
                headerTitle: 'Payment Verified',
                headerLeft: () => null,
              }}
            />
            <Stack.Screen
              name="PayoutSettings"
              component={PayoutSettingsScreen}
              options={{
                headerTitle: 'Earnings & Payouts',
              }}
            />
              </Stack.Group>
            )}
          </>
        ) : (
          // User is not logged in
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
