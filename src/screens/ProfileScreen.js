import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import { storage } from '../config/firebase';
import { updateProfile } from '../redux/authSlice';
import { resetPhoneAuth } from '../redux/phoneAuthSlice';

// Lazy load ImagePicker to avoid native module loading issues
let ImagePicker = null;
const loadImagePicker = async () => {
  if (!ImagePicker) {
    ImagePicker = await import('expo-image-picker');
  }
  return ImagePicker;
};

export const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.auth.user);
  const { loading } = useSelector((state) => state.auth);
  const { phoneNumber: verifiedPhone, isPhoneVerified } = useSelector(
    (state) => state.phoneAuth
  );
  const dispatch = useDispatch();
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'customer');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);
  const [uploading, setUploading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  const handlePickProfilePicture = async () => {
    try {
      const picker = await loadImagePicker();
      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        const imageUri = result.assets[0].uri;
        const imageName = `profile_${Date.now()}.jpg`;
        const storageRef = ref(storage, `profile_pictures/${user.id}/${imageName}`);

        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);

        setProfilePicture(downloadUrl);
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const hasChanges = name !== user?.name || role !== user?.role || profilePicture !== user?.profilePicture;
    if (!hasChanges) {
      Alert.alert('Info', 'No changes made');
      return;
    }

    try {
      const result = await dispatch(updateProfile({ 
        userId: user.id, 
        name: name !== user?.name ? name : undefined,
        role: role !== user?.role ? role : undefined,
        profilePicture: profilePicture !== user?.profilePicture ? profilePicture : undefined,
      }));
      if (result.type === updateProfile.fulfilled.type) {
        Alert.alert('Success', 'Profile updated successfully');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const phoneAuthState = useSelector((state) => state.phoneAuth);

  const handlePhoneVerificationSuccess = async () => {
    setShowPhoneVerification(false);
    // Phone is already verified and stored in Redux
    // Now update Firestore with the new phone number
    try {
      const result = await dispatch(
        updatePhoneNumber({
          userId: user.id,
          phoneNumber: phoneAuthState.phoneNumber,
          isVerified: true,
        })
      );

      if (result.type === updatePhoneNumber.fulfilled.type) {
        Alert.alert('Success', 'Phone number verified and updated');
        dispatch(resetPhoneAuth());
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save phone number');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={true}>

      <View style={styles.profilePictureSection}>
        <TouchableOpacity 
          style={styles.profilePictureContainer}
          onPress={handlePickProfilePicture}
          disabled={uploading}
        >
          {profilePicture ? (
            <Image 
              source={{ uri: profilePicture }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.placeholderText}>📷</Text>
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.profilePictureLabel}>
          {uploading ? 'Uploading...' : 'Tap to change profile picture'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
          editable={!loading}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.emailContainer}>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>
        <Text style={styles.helperText}>Email cannot be changed</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Select Your Role</Text>
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
      </View>

      {/* Phone Number Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📱 Phone Number</Text>
          {user?.isPhoneVerified && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
          {!user?.isPhoneVerified && <Text style={styles.unverifiedBadge}>⚠ Not Verified</Text>}
        </View>

        {user?.phoneNumber ? (
          <>
            <View style={styles.phoneDisplayContainer}>
              <Text style={styles.phoneDisplayLabel}>Current Number:</Text>
              <Text style={styles.phoneDisplay}>{user?.phoneNumber}</Text>
            </View>
            <TouchableOpacity
              style={styles.changePhoneButton}
              onPress={() => setShowPhoneVerification(true)}
            >
              <Text style={styles.changePhoneButtonText}>Change Phone Number</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.verifyPhoneButton}
            onPress={() => setShowPhoneVerification(true)}
          >
            <Text style={styles.verifyPhoneButtonText}>Add & Verify Phone Number</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleUpdateProfile}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update Profile</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 28,
    color: '#333',
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerPlaceholder: {
    width: 38,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 48,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  emailContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  emailText: {
    fontSize: 16,
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 0,
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
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  verifiedBadge: {
    backgroundColor: '#28a745',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  unverifiedBadge: {
    backgroundColor: '#FFA500',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  phoneDisplayContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  phoneDisplayLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  phoneDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  verifyPhoneButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  verifyPhoneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  changePhoneButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  changePhoneButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
