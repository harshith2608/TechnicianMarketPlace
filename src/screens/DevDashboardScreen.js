import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, logoutUser } from '../redux/authSlice';
import {
    autoCompleteBooking,
    createTestBooking,
    getTestAccount,
    resetTestData,
    TEST_ACCOUNTS,
} from '../utils/devUtils';

export const DevDashboardScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.auth.user);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = (msg, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  };

  const handleCreateTestBooking = async () => {
    try {
      setLoading(true);
      
      // Use current user and prompt for the other user
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        setLoading(false);
        return;
      }

      const role = user.role === 'customer' ? 'technician' : 'customer';
      Alert.prompt(
        'Create Test Booking',
        `Logged in as: ${user.role} (${user.email})\n\nEnter the ${role} UID:`,
        [
          { text: 'Cancel', onPress: () => setLoading(false) },
          {
            text: 'Create',
            onPress: async (input) => {
              const otherId = input.trim();
              
              if (!otherId) {
                Alert.alert('Error', 'UID is required');
                setLoading(false);
                return;
              }

              try {
                const customerId = user.role === 'customer' ? user.id : otherId;
                const technicianId = user.role === 'technician' ? user.id : otherId;

                const booking = await createTestBooking(customerId, technicianId);
                showMessage(`✅ Booking created!\nID: ${booking.bookingId.substring(0, 8)}...`);
              } catch (err) {
                Alert.alert('Error', err.message || 'Failed to create booking');
              }
              setLoading(false);
            },
          },
        ],
        'plain-text'
      );
    } catch (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleAutoCompleteWorkflow = async () => {
    try {
      setLoading(true);
      
      Alert.prompt(
        'Auto-Complete Workflow',
        'Enter the Customer UID:',
        [
          { text: 'Cancel', onPress: () => setLoading(false) },
          {
            text: 'Next',
            onPress: async (customerId) => {
              const cId = customerId.trim();
              
              if (!cId) {
                Alert.alert('Error', 'Customer UID is required');
                setLoading(false);
                return;
              }

              Alert.prompt(
                'Auto-Complete Workflow',
                'Enter the Technician UID:',
                [
                  { text: 'Cancel', onPress: () => setLoading(false) },
                  {
                    text: 'Auto-Complete',
                    onPress: async (input) => {
                      const technicianId = input.trim();
                      
                      if (!technicianId) {
                        Alert.alert('Error', 'Technician UID is required');
                        setLoading(false);
                        return;
                      }

                      try {
                        const result = await autoCompleteBooking(cId, technicianId);
                        showMessage(`✅ Workflow completed!\nBooking: ${result.bookingId.substring(0, 8)}...`);
                      } catch (err) {
                        Alert.alert('Error', err.message || 'Failed to complete workflow');
                      }
                      setLoading(false);
                    },
                  },
                ],
                'plain-text'
              );
            },
          },
        ],
        'plain-text'
      );
    } catch (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleResetTestData = async () => {
    Alert.alert(
      'Reset Test Data',
      'Are you sure? This will delete all test bookings.',
      [
        { text: 'Cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              setLoading(true);
              
              if (!user) {
                Alert.alert('Error', 'You must be logged in');
                setLoading(false);
                return;
              }

              const role = user.role === 'customer' ? 'technician' : 'customer';
              Alert.prompt(
                'Enter UIDs',
                `Logged in as: ${user.role}\n\nEnter the ${role} UID:`,
                [
                  { text: 'Cancel', onPress: () => setLoading(false) },
                  {
                    text: 'Delete',
                    onPress: async (input) => {
                      const otherId = input.trim();
                      
                      if (!otherId) {
                        Alert.alert('Error', 'UID is required');
                        setLoading(false);
                        return;
                      }

                      try {
                        const customerId = user.role === 'customer' ? user.id : otherId;
                        const technicianId = user.role === 'technician' ? user.id : otherId;

                        const deleted = await resetTestData(customerId, technicianId);
                        showMessage(`✅ Deleted ${deleted} test bookings`);
                      } catch (err) {
                        Alert.alert('Error', err.message || 'Failed to reset data');
                      }
                      setLoading(false);
                    },
                  },
                ],
                'plain-text'
              );
            } catch (error) {
              Alert.alert('Error', error.message);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetupTestAccounts = async () => {
    try {
      setLoading(true);
      
      const { setupTestAccounts } = await import('../utils/devUtils');
      const results = await setupTestAccounts();
      
      let message = '✅ Test Accounts Setup:\n\n';
      for (const [role, result] of Object.entries(results)) {
        if (result.success) {
          message += `${role.toUpperCase()}:\n  UID: ${result.uid.substring(0, 8)}...\n  Email: ${result.email}\n\n`;
        } else {
          message += `${role.toUpperCase()}: ${result.message}\n\n`;
        }
      }
      
      Alert.alert('Setup Complete', message);
      showMessage('✅ Test accounts ready!');
      setLoading(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to setup test accounts');
      setLoading(false);
    }
  };

  const handleSwitchAccount = (role) => {
    const account = getTestAccount(role);
    Alert.alert(
      `Login as ${role.toUpperCase()}`,
      `Email: ${account.email}\nPassword: ${account.password}`,
      [
        { text: 'Cancel' },
        {
          text: 'Login',
          onPress: () => {
            dispatch(loginUser({ email: account.email, password: account.password }))
              .then(() => {
                showMessage(`✅ Logged in as ${role}`);
                // Navigation will automatically update when user state changes
              })
              .catch((error) => {
                Alert.alert('Login Failed', error || 'Could not login with test account');
              });
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    dispatch(logoutUser())
      .then(() => {
        showMessage('✅ Logged out');
      })
      .catch((error) => {
        Alert.alert('Error', error.message);
      });
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🧪 Developer Testing</Text>
      </View>

      {/* Status */}
      {user && (
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Current User</Text>
          <Text style={styles.statusValue}>{user.email}</Text>
          <Text style={styles.statusRole}>{user.role}</Text>
        </View>
      )}

      {/* Message */}
      {message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Quick Actions</Text>

        <TouchableOpacity
          style={[styles.button, styles.buttonWarning]}
          onPress={handleSetupTestAccounts}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>⚙️ Setup Test Accounts</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleCreateTestBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>+ Create Test Booking</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSuccess]}
          onPress={handleAutoCompleteWorkflow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>⚡ Auto-Complete Workflow</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleResetTestData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🗑️ Reset Test Data</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Account Switching */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Switch Account</Text>

        <TouchableOpacity
          style={[styles.button, styles.buttonInfo]}
          onPress={() => handleSwitchAccount('customer')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>👤 Login as Customer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonInfo]}
          onPress={() => handleSwitchAccount('technician')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🔧 Login as Technician</Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={[styles.button, styles.buttonWarning]}
            onPress={handleLogout}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🚪 Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Test Credentials */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔑 Test Credentials</Text>

        <View style={styles.credentialBox}>
          <Text style={styles.credentialLabel}>Customer</Text>
          <Text style={styles.credentialValue}>{TEST_ACCOUNTS.customer.email}</Text>
          <Text style={styles.credentialPassword}>{TEST_ACCOUNTS.customer.password}</Text>
        </View>

        <View style={styles.credentialBox}>
          <Text style={styles.credentialLabel}>Technician</Text>
          <Text style={styles.credentialValue}>{TEST_ACCOUNTS.technician.email}</Text>
          <Text style={styles.credentialPassword}>{TEST_ACCOUNTS.technician.password}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ How to Use</Text>
        <Text style={styles.infoText}>
          1. Use "Switch Account" to login as customer or technician{'\n'}
          2. Create test booking (prompts for other user's UID){'\n'}
          3. Auto-complete workflow (uses both logged-in and other user){'\n'}
          4. Reset data when done testing{'\n\n'}
          💡 Your current UID: {user?.id?.substring(0, 8)}...
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#007AFF',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  statusBox: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  statusLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  statusRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  messageBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  messageText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSuccess: {
    backgroundColor: '#34C759',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonInfo: {
    backgroundColor: '#5856D6',
  },
  buttonWarning: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  credentialBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  credentialLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  credentialValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    fontFamily: 'Courier',
  },
  credentialPassword: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Courier',
  },
  infoBox: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
});
