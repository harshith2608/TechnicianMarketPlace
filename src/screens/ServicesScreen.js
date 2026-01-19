import * as ImagePicker from 'expo-image-picker';
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
    clearError,
    createService,
    deleteService,
    fetchAllServices,
    fetchUserServices,
    updateService,
} from '../redux/serviceSlice';

const CATEGORIES = ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'HVAC', 'Other'];

export const ServicesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { allServices, userServices, loading, error } = useSelector((state) => state.services);
  
  const [mode, setMode] = useState('browse'); // 'browse', 'create', or 'edit'
  const [filterCategory, setFilterCategory] = useState('All');
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingService, setEditingService] = useState(null);
  
  // Create service form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [price, setPrice] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);

  useEffect(() => {
    dispatch(fetchAllServices());
    if (user?.role === 'technician') {
      dispatch(fetchUserServices(user.id));
    }
  }, [dispatch, user]);

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
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
        setTitle('');
        setDescription('');
        setCategory('Plumbing');
        setPrice('');
        setSelectedImages([]);
        setEditingService(null);
        setMode('browse');
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
        setTitle('');
        setDescription('');
        setCategory('Plumbing');
        setPrice('');
        setSelectedImages([]);
        setMode('browse');
      }
    }
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

  const filteredServices = allServices
    .filter(service => 
      (filterCategory === 'All' || service.category === filterCategory) &&
      (searchQuery === '' || 
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.technicianName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const ServiceCard = ({ item, isOwner = false }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => {
        if (!isOwner && user?.role === 'customer') {
          // Navigate to service detail for customers
          navigation.navigate('ServiceDetail', {
            serviceId: item.id,
            technicianId: item.userId,
            service: item,
          });
        }
      }}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.serviceImage}
        defaultSource={require('../../assets/images/react-logo.png')}
      />
      <View style={styles.serviceContent}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <Text style={styles.serviceTechName}>by {item.technicianName || 'Unknown'}</Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.serviceFooter}>
          <View>
            <Text style={styles.serviceCategory}>{item.category}</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>⭐ {item.rating || 'N/A'}</Text>
              <Text style={styles.reviewCount}>({item.reviewCount || 0} reviews)</Text>
            </View>
          </View>
          <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
        </View>
        {isOwner && (
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
        )}
      </View>
    </TouchableOpacity>
  );

  if ((mode === 'create' || mode === 'edit') && user?.role === 'technician') {
    return (
      <View style={styles.container}>
        <View style={[styles.modeSelector, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'browse' && styles.modeButtonActive]}
            onPress={() => setMode('browse')}
          >
            <Text style={[styles.modeButtonText, mode === 'browse' && styles.modeButtonTextActive]}>
              Browse
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, (mode === 'create' || mode === 'edit') && styles.modeButtonActive]}
            onPress={() => {
              if (mode === 'edit') {
                setEditingService(null);
                setTitle('');
                setDescription('');
                setCategory('Plumbing');
                setPrice('');
                setSelectedImages([]);
              }
              setMode('create');
            }}
          >
            <Text style={[styles.modeButtonText, (mode === 'create' || mode === 'edit') && styles.modeButtonTextActive]}>
              {mode === 'edit' ? '← Back' : 'Create Service'}
            </Text>
          </TouchableOpacity>
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
                navigation.navigate('Profile');
                setShowMenu(false);
              }}
            >
              <Text style={styles.menuItemText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.formTitle}>Create New Service</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Service Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Professional Plumbing Repair"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) dispatch(clearError());
            }}
            editable={!loading}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your service in detail..."
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (error) dispatch(clearError());
            }}
            multiline
            numberOfLines={4}
            editable={!loading}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryTag, category === cat && styles.categoryTagActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryTagText, category === cat && styles.categoryTagTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Price (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 50.00"
            value={price}
            onChangeText={(text) => {
              setPrice(text);
              if (error) dispatch(clearError());
            }}
            keyboardType="decimal-pad"
            editable={!loading}
          />

          <Text style={styles.label}>Service Images <Text style={styles.optional}>(Optional)</Text></Text>
          
          {/* Image Picker Button */}
          <TouchableOpacity
            style={[styles.imagePickerButton, loading && styles.buttonDisabled]}
            onPress={pickImages}
            disabled={loading}
          >
            <Text style={styles.imagePickerButtonText}>📷 Select Images</Text>
          </TouchableOpacity>
          
          {/* Selected Images Preview */}
          {selectedImages.length > 0 && (
            <View style={styles.imagesPreviewContainer}>
              <Text style={styles.imagesCountText}>
                {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
              </Text>
              <FlatList
                data={selectedImages}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => `${index}`}
                renderItem={({ item, index }) => (
                  <View style={styles.imagePreviewWrapper}>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Text style={styles.removeImageButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          )}

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
  }

  return (
    <View style={styles.container}>
      <View style={[styles.modeSelector, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'browse' && styles.modeButtonActive]}
          onPress={() => setMode('browse')}
        >
          <Text style={[styles.modeButtonText, mode === 'browse' && styles.modeButtonTextActive]}>
            Browse Services
          </Text>
        </TouchableOpacity>
        {user?.role === 'technician' && (
          <TouchableOpacity
            style={[styles.modeButton, mode === 'create' && styles.modeButtonActive]}
            onPress={() => setMode('create')}
          >
            <Text style={[styles.modeButtonText, mode === 'create' && styles.modeButtonTextActive]}>
              + Create
            </Text>
          </TouchableOpacity>
        )}
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
              navigation.navigate('Profile');
              setShowMenu(false);
            }}
          >
            <Text style={styles.menuItemText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search services, technicians..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#999"
      />

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={['All', ...CATEGORIES]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterTag, filterCategory === item && styles.filterTagActive]}
              onPress={() => setFilterCategory(item)}
            >
              <Text style={[styles.filterTagText, filterCategory === item && styles.filterTagTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : filteredServices.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No services found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceCard
              item={item}
              isOwner={user?.role === 'technician' && item.userId === user.id}
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {user?.role === 'technician' && (
        <TouchableOpacity
          style={styles.myServicesButton}
          onPress={() => navigation.navigate('MyServices')}
        >
          <Text style={styles.myServicesButtonText}>
            📋 My Services ({userServices.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
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
  modeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterList: {
    paddingHorizontal: 15,
    gap: 8,
  },
  filterTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterTagActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterTagTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 15,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 5,
  },
  serviceImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  serviceContent: {
    padding: 15,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceTechName: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  serviceCategory: {
    fontSize: 11,
    backgroundColor: '#f0f0f0',
    color: '#666',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA500',
  },
  reviewCount: {
    fontSize: 11,
    color: '#999',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
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
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  categoryTag: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryTagActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  categoryTagTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optional: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  imagePickerButton: {
    backgroundColor: '#E8F4F8',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  imagePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  imagesPreviewContainer: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  imagesCountText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  myServicesButton: {
    marginHorizontal: 15,
    marginVertical: 15,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  myServicesButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
