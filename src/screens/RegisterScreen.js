import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { PhoneVerificationModal } from '../components/PhoneVerificationModal';
import { registerUser } from '../redux/authSlice';
import { resetPhoneAuth } from '../redux/phoneAuthSlice';

export const RegisterScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [registrationStep, setRegistrationStep] = useState('credentials'); // 'credentials' or 'phone'
  const [tempRegistrationData, setTempRegistrationData] = useState(null);
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const { isPhoneVerified, phoneNumber: registeredPhoneNumber } = useSelector(
    (state) => state.phoneAuth
  );

  // Password strength calculator
  const getPasswordStrength = (pass) => {
    if (!pass) return { strength: 0, label: '', color: '#ccc' };
    
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^a-zA-Z0-9]/.test(pass)) score++;
    
    if (score <= 1) return { strength: 1, label: 'Weak', color: '#FF3B30' };
    if (score <= 2) return { strength: 2, label: 'Fair', color: '#FF9500' };
    if (score <= 3) return { strength: 3, label: 'Good', color: '#FFCC00' };
    if (score <= 4) return { strength: 4, label: 'Strong', color: '#34C759' };
    return { strength: 5, label: 'Very Strong', color: '#00A86B' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Show phone verification modal
    setTempRegistrationData({ name, email, password, role });
    setShowPhoneVerification(true);
  };

  const handlePhoneVerificationSuccess = async () => {
    // Complete the registration with phone number
    if (!tempRegistrationData) {
      Alert.alert('Error', 'Registration data was lost. Please try again.');
      return;
    }

    if (!registeredPhoneNumber) {
      Alert.alert('Error', 'Phone number was not captured. Please try again.');
      return;
    }

    const result = await dispatch(
      registerUser({
        name: tempRegistrationData.name,
        email: tempRegistrationData.email,
        password: tempRegistrationData.password,
        role: tempRegistrationData.role,
        phoneNumber: registeredPhoneNumber,
      })
    );

    if (result && result.meta && result.meta.requestStatus === 'fulfilled') {
      Alert.alert('Success', 'Account created with phone number!');
      setShowPhoneVerification(false);
      setTempRegistrationData(null);
      dispatch(resetPhoneAuth());
      // Navigation happens automatically in LoginScreen check
    } else {
      Alert.alert('Registration Failed', result?.payload || 'An error occurred');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* FixBolt Logo */}
        <View style={styles.logoContainer}>
          <FixBoltLogo width={80} height={80} />
        </View>
        
        <Text style={styles.title}>Create Account</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          editable={!loading}
          placeholderTextColor="#999"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
        placeholderTextColor="#999"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
        placeholderTextColor="#999"
      />

      {password && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBar}>
            <View 
              style={[
                styles.strengthFill,
                { 
                  width: `${(passwordStrength.strength / 5) * 100}%`,
                  backgroundColor: passwordStrength.color 
                }
              ]} 
            />
          </View>
          <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
            Password Strength: {passwordStrength.label}
          </Text>
          <View style={styles.requirementsList}>
            <Text style={[styles.requirement, password.length >= 8 && styles.requirementMet]}>
              {password.length >= 8 ? '✓' : '○'} At least 8 characters
            </Text>
            <Text style={[styles.requirement, /[a-z]/.test(password) && /[A-Z]/.test(password) && styles.requirementMet]}>
              {/[a-z]/.test(password) && /[A-Z]/.test(password) ? '✓' : '○'} Uppercase & lowercase letters
            </Text>
            <Text style={[styles.requirement, /[0-9]/.test(password) && styles.requirementMet]}>
              {/[0-9]/.test(password) ? '✓' : '○'} At least one number
            </Text>
            <Text style={[styles.requirement, /[^a-zA-Z0-9]/.test(password) && styles.requirementMet]}>
              {/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} Special character (!@#$%^&*)
            </Text>
          </View>
        </View>
      )}
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!loading}
        placeholderTextColor="#999"
      />

      <Text style={styles.roleLabel}>Select Your Role</Text>
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[styles.roleButton, role === 'customer' && styles.roleButtonActive]}
          onPress={() => setRole('customer')}
          disabled={loading}
        >
          <Text style={[styles.roleButtonText, role === 'customer' && styles.roleButtonTextActive]}>
            Customer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleButton, role === 'technician' && styles.roleButtonActive]}
          onPress={() => setRole('technician')}
          disabled={loading}
        >
          <Text style={[styles.roleButtonText, role === 'technician' && styles.roleButtonTextActive]}>
            Technician
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.phoneRequiredNote}>
        ℹ️ You will be asked to verify your phone number after filling in these details
      </Text>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginLink}>Already have an account? Login</Text>
      </TouchableOpacity>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        visible={showPhoneVerification}
        onClose={() => {
          setShowPhoneVerification(false);
          dispatch(resetPhoneAuth());
        }}
        onSuccess={handlePhoneVerificationSuccess}
      />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#0066FF',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  strengthContainer: {
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  strengthBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  requirementsList: {
    gap: 6,
  },
  requirement: {
    fontSize: 12,
    color: '#999',
  },
  requirementMet: {
    color: '#34C759',
    fontWeight: '500',
  },
  phoneRequiredNote: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
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
  loginLink: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  roleButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  roleButtonTextActive: {
    color: '#007AFF',
  },
});
