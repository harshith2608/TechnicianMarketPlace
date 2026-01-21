import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
    createService,
    deleteService,
    fetchUserServices,
    updateService
} from '../redux/serviceSlice';

// Lazy load ImagePicker to avoid native module loading issues
let ImagePicker = null;
const loadImagePicker = async () => {
  if (!ImagePicker) {
    ImagePicker = await import('expo-image-picker');
  }
  return ImagePicker;
};

const CATEGORIES = ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'HVAC', 'Other'];

export const MyServicesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { userServices, loading, error } = useSelector((state) => state.services);
  
  // Redirect non-technicians to Services
  useEffect(() => {
    if (user && user.role !== 'technician') {
      navigation.goBack();
    }
  }, [user, navigation]);
  
  const [mode, setMode] = useState('list'); // 'list', 'create', or 'edit'
  const [editingService, setEditingService] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  
  // Create/Edit service form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [price, setPrice] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);

  useEffect(() => {
    if (user?.role === 'technician') {
      dispatch(fetchUserServices(user.id));
    }
  }, [dispatch, user]);

  const pickImages = async () => {
    try {
      const picker = await loadImagePicker();
      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultiple: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: asset.fileName || `image_${Date.now()}.jpg`,
        }));
        setSelectedImages([...selectedImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleSaveService = async () => {
    if (!title.trim() || !description.trim() || !price.trim()) {
      Alert.alert('Error', 'Please fill in title, description, and price');
      return;
    }

    if (editingService) {
      // Update existing service
      const result = await dispatch(
        updateService({
          userId: user.id,
          serviceId: editingService.id,
          title: title.trim(),
          description: description.trim(),
          category,
          price,
          images: selectedImages.length > 0 ? selectedImages : null,
        })
      );

      if (result.type === updateService.fulfilled.type) {
        Alert.alert('Success', 'Service updated successfully!');
        dispatch(fetchUserServices(user.id));
        resetForm();
        setMode('list');
      } else if (result.type === updateService.rejected.type) {
        Alert.alert('Error', result.payload || 'Failed to update service');
      }
    } else {
      // Create new service
      const result = await dispatch(
        createService({
          userId: user.id,
          technicianName: user.name,
          title: title.trim(),
          description: description.trim(),
          category,
          price,
          images: selectedImages.length > 0 ? selectedImages : null,
        })
      );

      if (result.type === createService.fulfilled.type) {
        Alert.alert('Success', 'Service created successfully!');
        resetForm();
        setMode('list');
        dispatch(fetchUserServices(user.id));
      } else if (result.type === createService.rejected.type) {
        Alert.alert('Error', result.payload || 'Failed to create service');
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Plumbing');
    setPrice('');
    setSelectedImages([]);
    setEditingService(null);
  };

  const handleDeleteService = (serviceId) => {
    Alert.alert('Delete Service', 'Are you sure you want to delete this service?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: () => {
          dispatch(deleteService({ userId: user.id, serviceId }));
        },
        style: 'destructive',
      },
    ]);
  };

  const ServiceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => {
        setEditingService(item);
        setTitle(item.title);
        setDescription(item.description);
        setCategory(item.category);
        setPrice(item.price.toString());
        setSelectedImages(item.imageUrls || []);
        setMode('edit');
      }}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.serviceImage}
        defaultSource={require('../../assets/images/react-logo.png')}
      />
      <View style={styles.serviceContent}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <Text style={styles.serviceCategory}>{item.category}</Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.serviceFooter}>
          <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>⭐ {item.rating || 'N/A'}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount || 0})</Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditingService(item);
              setTitle(item.title);
              setDescription(item.description);
              setCategory(item.category);
              setPrice(item.price.toString());
              setSelectedImages(item.imageUrls || []);
              setMode('edit');
            }}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteService(item.id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // List mode - show all services
  if (mode === 'list') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Services ({userServices.length})</Text>
          <TouchableOpacity
            style={styles.menuIconButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        </View>

        {showMenu && (
          <View style={styles.menu}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('Home');
                setShowMenu(false);
              }}
            >
              <Text style={styles.menuItemText}>🏠 Home</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('Messages');
                setShowMenu(false);
              }}
            >
              <Text style={styles.menuItemText}>💬 Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('TechnicianBookings');
                setShowMenu(false);
              }}
            >
              <Text style={styles.menuItemText}>📅 My Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('Profile');
                setShowMenu(false);
              }}
            >
              <Text style={styles.menuItemText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : userServices.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No services yet. Create your first one!</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                resetForm();
                setMode('create');
              }}
            >
              <Text style={styles.emptyButtonText}>Create Service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={userServices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ServiceCard item={item} />}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  // Create/Edit mode - show form
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setMode('list');
          }}
        >
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'edit' ? 'Edit Service' : 'Create Service'}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formGroup}>
          <Text style={styles.label}>Service Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Bathroom Plumbing Repair"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe your service in detail..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === cat && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter price per unit"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Service Images</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={pickImages}
          >
            <Text style={styles.imagePickerButtonText}>📸 Pick Images</Text>
          </TouchableOpacity>
          {selectedImages.length > 0 && (
            <Text style={styles.imageCount}>
              Selected: {selectedImages.length} image(s)
            </Text>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
          >
            {selectedImages.map((image, index) => (
              <View key={index} style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: typeof image === 'string' ? image : image.uri }}
                  style={styles.imagePreview}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSaveService}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {editingService ? 'Update Service' : 'Create Service'}
            </Text>
          )}
        </TouchableOpacity>
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
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    width: 50,
  },
  menuIconButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: '#333',
  },
  menu: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  serviceImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  serviceContent: {
    padding: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF9500',
  },
  reviewCount: {
    fontSize: 11,
    color: '#999',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E5F0FF',
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 15,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#333',
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  imagePickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
  },
  imagePickerButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  imageCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  imageScroll: {
    marginTop: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  submitButton: {
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
