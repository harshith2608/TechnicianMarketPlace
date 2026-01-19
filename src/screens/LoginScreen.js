import { collection, getDocs, query, where } from 'firebase/firestore';
import { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { PhoneVerificationModal } from '../components/PhoneVerificationModal';
import { db } from '../config/firebase';
import { clearError, loginUser, loginWithPhone } from '../redux/authSlice';
import { resetPhoneAuth } from '../redux/phoneAuthSlice';

export const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState('email'); // 'email' or 'phone'
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const { isPhoneVerified, verificationId, phoneNumber: verifiedPhone } = useSelector(
    (state) => state.phoneAuth
  );

  const getErrorMessage = (errorMessage) => {
    if (!errorMessage) return null;
    
    // Firebase error code parsing
    if (errorMessage.includes('user-not-found') || errorMessage.includes('invalid-credential')) {
      return 'Email or password is incorrect. Please try again.';
    }
    if (errorMessage.includes('wrong-password')) {
      return 'Incorrect password. Please try again.';
    }
    if (errorMessage.includes('invalid-email')) {
      return 'Invalid email address.';
    }
    if (errorMessage.includes('user-disabled')) {
      return 'This account has been disabled.';
    }
    if (errorMessage.includes('too-many-requests')) {
      return 'Too many failed login attempts. Please try again later.';
    }
    
    // Generic Firebase error messages
    return errorMessage.replace(/^Firebase: /, '').replace(/\(auth\/.*\)$/, '').trim();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      dispatch(clearError());
      return;
    }
    
    const result = await dispatch(loginUser({ email, password }));
    // No need for Alert, error will be displayed in UI
  };

  const handlePhoneLoginSuccess = async () => {
    // After OTP verification, sign in with phone
    try {
      if (!isPhoneVerified || !verifiedPhone) {
        console.error('Phone verification not complete');
        return;
      }

      // In development mode or for phone auth, we need to find user by phone number
      // Query Firestore to find user with this phone number
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, where('phoneNumber', '==', verifiedPhone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error('User not found with phone:', verifiedPhone);
        dispatch(clearError());
        return;
      }

      // Get the first user found with this phone number
      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;

      // Create a mock userCredential for the thunk
      const mockUserCredential = {
        user: {
          uid: userId,
        },
      };

      // Call loginWithPhone with the found user
      const result = await dispatch(
        loginWithPhone({
          phoneNumber: verifiedPhone,
          userCredential: mockUserCredential,
        })
      );

      if (result.type === loginWithPhone.fulfilled.type) {
        setShowPhoneModal(false);
        dispatch(resetPhoneAuth());
        // Navigation happens automatically from RootNavigator
      } else {
        console.error('Phone login failed:', result.payload);
      }
    } catch (err) {
      console.error('Phone login error:', err);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Technician Marketplace</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage(error)}</Text>
        </View>
      )}

      {!email && !password && error && (
        <TouchableOpacity 
          style={styles.dismissError}
          onPress={() => dispatch(clearError())}
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      )}

      {/* Login Mode Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, loginMode === 'email' && styles.activeTab]}
          onPress={() => setLoginMode('email')}
        >
          <Text style={[styles.tabText, loginMode === 'email' && styles.activeTabText]}>
            📧 Email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, loginMode === 'phone' && styles.activeTab]}
          onPress={() => setLoginMode('phone')}
        >
          <Text style={[styles.tabText, loginMode === 'phone' && styles.activeTabText]}>
            📱 Phone
          </Text>
        </TouchableOpacity>
      </View>

      {/* Email Login */}
      {loginMode === 'email' && (
        <>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) dispatch(clearError());
            }}
            editable={!loading}
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) dispatch(clearError());
            }}
            secureTextEntry
            editable={!loading}
            placeholderTextColor="#999"
          />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled, !email || !password ? styles.buttonDisabled : null]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login with Email</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Phone Login */}
      {loginMode === 'phone' && (
        <>
          <View style={styles.phoneLoginSection}>
            <Text style={styles.phoneLoginSubtitle}>
              Verify your phone number to login
            </Text>
            <TouchableOpacity
              style={styles.phoneLoginButton}
              onPress={() => setShowPhoneModal(true)}
            >
              <Text style={styles.phoneLoginButtonText}>📱 Login with Phone</Text>
            </TouchableOpacity>
            <Text style={styles.phoneLoginInfo}>
              We'll send you an OTP to verify your phone number
            </Text>
          </View>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerLink}>Don't have an account? Register</Text>
      </TouchableOpacity>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        visible={showPhoneModal}
        onClose={() => {
          setShowPhoneModal(false);
          dispatch(resetPhoneAuth());
        }}
        onSuccess={handlePhoneLoginSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    color: '#C41C00',
    fontSize: 14,
    fontWeight: '500',
  },
  dismissError: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  dismissText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerLink: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
  },
  forgotPasswordLink: {
    color: '#007AFF',
    textAlign: 'right',
    marginBottom: 15,
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  phoneLoginSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  phoneLoginSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  phoneLoginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  phoneLoginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  phoneLoginInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
