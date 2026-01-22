import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';

export const createService = createAsyncThunk(
  'services/createService',
  async ({ userId, technicianName, title, description, category, price, images }, { rejectWithValue }) => {
    try {
      let imageUrl = 'https://via.placeholder.com/300?text=Service';
      let imageUrls = [];

      // Upload images if provided
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          try {
            console.log(`Uploading image ${i}:`, image.uri);
            
            // Convert URI to blob with timeout
            let response;
            try {
              response = await Promise.race([
                fetch(image.uri),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Image fetch timeout')), 30000)
                )
              ]);
            } catch (fetchErr) {
              console.error(`Error fetching image ${i}:`, fetchErr);
              continue; // Skip this image and move to next
            }
            
            if (!response.ok) {
              console.error(`Image fetch returned status ${response.status}`);
              continue;
            }
            
            const blob = await response.blob();
            console.log(`Blob created for image ${i}, size:`, blob.size);
            
            // Create unique filename
            const fileName = `${userId}/${Date.now()}_${i}.jpg`;
            const storageRef = ref(storage, `service-images/${fileName}`);
            
            console.log(`Uploading to Firebase: ${fileName}`);
            // Upload to Firebase Storage
            await uploadBytes(storageRef, blob);
            const downloadUrl = await getDownloadURL(storageRef);
            
            console.log(`Image ${i} uploaded successfully:`, downloadUrl);
            imageUrls.push(downloadUrl);
            
            // Set first image as main image
            if (i === 0) {
              imageUrl = downloadUrl;
            }
          } catch (uploadError) {
            console.error(`Error uploading image ${i}:`, uploadError);
            // Continue with other images even if one fails
          }
        }
      }

      // Create service in user's subcollection: users/{userId}/services/{serviceId}
      const userServicesCollection = collection(db, 'users', userId, 'services');
      const docRef = await addDoc(userServicesCollection, {
        title,
        description,
        category,
        price: parseFloat(price),
        imageUrl: imageUrl,
        imageUrls: imageUrls,
        technicianName,
        createdAt: new Date(),
        updatedAt: new Date(),
        rating: 0,
        reviewCount: 0,
      });

      const createdAtDate = new Date();
      return {
        id: docRef.id,
        userId,
        title,
        description,
        category,
        price: parseFloat(price),
        imageUrl: imageUrl,
        technicianName,
        imageUrls: imageUrls,
        createdAt: createdAtDate.toISOString(),
        updatedAt: createdAtDate.toISOString(),
        rating: 0,
        reviewCount: 0,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAllServices = createAsyncThunk(
  'services/fetchAllServices',
  async (_, { rejectWithValue }) => {
    try {
      // Fetch all users
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      const services = [];
      
      // Iterate through each user and fetch their services
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Get services subcollection for this user
        const userServicesCollection = collection(db, 'users', userId, 'services');
        const servicesSnapshot = await getDocs(userServicesCollection);
        
        servicesSnapshot.docs.forEach((serviceDoc) => {
          const serviceData = serviceDoc.data();
          const { createdAt, updatedAt, ...restData } = serviceData;
          services.push({
            id: serviceDoc.id,
            userId,
            ...restData,
            createdAt: createdAt?.toDate?.().toISOString?.() || new Date().toISOString(),
            updatedAt: updatedAt?.toDate?.().toISOString?.() || new Date().toISOString(),
            technicianName: userData?.name || 'Unknown',
            technicianRole: userData?.role || 'technician',
          });
        });
      }

      return services;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserServices = createAsyncThunk(
  'services/fetchUserServices',
  async (userId, { rejectWithValue }) => {
    try {
      // Fetch from user's services subcollection: users/{userId}/services
      const userServicesCollection = collection(db, 'users', userId, 'services');
      const snapshot = await getDocs(userServicesCollection);

      const services = snapshot.docs.map((doc) => {
        const { createdAt, updatedAt, ...restData } = doc.data();
        return {
          id: doc.id,
          userId,
          ...restData,
          createdAt: createdAt?.toDate?.().toISOString?.() || new Date().toISOString(),
          updatedAt: updatedAt?.toDate?.().toISOString?.() || new Date().toISOString(),
        };
      });

      return services;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateService = createAsyncThunk(
  'services/updateService',
  async ({ userId, serviceId, title, description, category, price, images }, { rejectWithValue }) => {
    try {
      let imageUrl = undefined;
      let imageUrls = [];

      // Handle image updates if new images provided
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          
          // Skip if already a URL (existing image)
          if (typeof image === 'string') {
            imageUrls.push(image);
            if (i === 0) imageUrl = image;
            continue;
          }

          try {
            // Convert URI to blob (new image)
            const response = await fetch(image.uri);
            const blob = await response.blob();
            
            // Create unique filename
            const fileName = `${userId}/${Date.now()}_${i}.jpg`;
            const storageRef = ref(storage, `service-images/${fileName}`);
            
            // Upload to Firebase Storage
            await uploadBytes(storageRef, blob);
            const downloadUrl = await getDownloadURL(storageRef);
            
            imageUrls.push(downloadUrl);
            
            // Set first image as main image
            if (i === 0) {
              imageUrl = downloadUrl;
            }
          } catch (uploadError) {
            console.error(`Error uploading image ${i}:`, uploadError);
          }
        }
      }

      // Update in user's services subcollection
      const serviceRef = doc(db, 'users', userId, 'services', serviceId);
      const updateData = {};
      
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (category) updateData.category = category;
      if (price) updateData.price = parseFloat(price);
      if (imageUrl) updateData.imageUrl = imageUrl;
      if (imageUrls.length > 0) updateData.imageUrls = imageUrls;
      updateData.updatedAt = new Date();

      await updateDoc(serviceRef, updateData);

      return {
        id: serviceId,
        title,
        description,
        category,
        price: price ? parseFloat(price) : undefined,
        imageUrl,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteService = createAsyncThunk(
  'services/deleteService',
  async ({ userId, serviceId }, { rejectWithValue }) => {
    try {
      // Get service document to retrieve image URLs before deletion
      const serviceRef = doc(db, 'users', userId, 'services', serviceId);
      const userServicesCollection = collection(db, 'users', userId, 'services');
      const q = query(userServicesCollection, where('__name__', '==', serviceId));
      const serviceSnapshot = await getDocs(q);

      // Delete images from Firebase Storage if they exist
      if (serviceSnapshot.docs.length > 0) {
        const serviceData = serviceSnapshot.docs[0].data();
        const imageUrls = serviceData.imageUrls || [];
        
        for (const imageUrl of imageUrls) {
          try {
            // Extract the path from the download URL
            // Firebase download URLs have format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?...
            const urlParts = imageUrl.split('/o/');
            if (urlParts.length > 1) {
              const encodedPath = urlParts[1].split('?')[0];
              const decodedPath = decodeURIComponent(encodedPath);
              const imageRef = ref(storage, decodedPath);
              await deleteObject(imageRef);
            }
          } catch (imageDeleteError) {
            console.warn(`Failed to delete image from storage:`, imageDeleteError);
            // Continue deleting other images and the service even if one image fails
          }
        }
      }

      // Delete from user's services subcollection
      await deleteDoc(serviceRef);
      return serviceId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Check if customer has conversation with technician
export const checkUserConversation = createAsyncThunk(
  'services/checkUserConversation',
  async ({ customerId, technicianId, serviceId }, { rejectWithValue }) => {
    try {
      // Check if customer has a booking for this service with the technician
      // Booking can be in any status: pending, confirmed, completed, cancelled
      const conversationsCollection = collection(db, 'conversations');
      const q = query(
        conversationsCollection,
        where('participants', 'array-contains', customerId)
      );
      const snapshot = await getDocs(q);
      
      // Check if any conversation has a booking for this service
      let hasBooking = false;
      for (const convDoc of snapshot.docs) {
        const participants = convDoc.data().participants || [];
        if (participants.includes(technicianId)) {
          // This conversation includes both users, now check for bookings of this service
          const bookingsCollection = collection(db, 'conversations', convDoc.id, 'bookings');
          const bookingsQuery = query(
            bookingsCollection,
            where('serviceId', '==', serviceId),
            where('customerId', '==', customerId),
            where('technicianId', '==', technicianId)
          );
          const bookingsSnap = await getDocs(bookingsQuery);
          if (!bookingsSnap.empty) {
            hasBooking = true;
            break;
          }
        }
      }
      
      return hasBooking;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch reviews for a service
export const fetchServiceReviews = createAsyncThunk(
  'services/fetchServiceReviews',
  async ({ technicianId, serviceId }, { rejectWithValue }) => {
    try {
      const reviewsCollection = collection(db, 'users', technicianId, 'services', serviceId, 'reviews');
      const snapshot = await getDocs(reviewsCollection);
      
      const reviews = snapshot.docs.map((doc) => ({
        id: doc.id,
        customerId: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.().toISOString?.() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.().toISOString?.() || new Date().toISOString(),
      }));
      
      return reviews;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Submit or update a review
export const submitServiceReview = createAsyncThunk(
  'services/submitServiceReview',
  async ({ technicianId, serviceId, customerId, customerName, serviceRating, technicianRating, comment }, { rejectWithValue }) => {
    try {
      const reviewRef = doc(db, 'users', technicianId, 'services', serviceId, 'reviews', customerId);
      const now = new Date();
      
      // Set review (overwrites if exists, creates if new)
      await setDoc(reviewRef, {
        customerName,
        serviceRating,
        technicianRating,
        comment,
        createdAt: now,
        updatedAt: now,
      });
      
      // Recalculate average rating and total reviews
      const reviewsCollection = collection(db, 'users', technicianId, 'services', serviceId, 'reviews');
      const snapshot = await getDocs(reviewsCollection);
      
      let totalRating = 0;
      let reviewCount = 0;
      
      snapshot.docs.forEach((doc) => {
        const reviewData = doc.data();
        // Average both service and technician rating
        const avgReview = (reviewData.serviceRating + reviewData.technicianRating) / 2;
        totalRating += avgReview;
        reviewCount += 1;
      });
      
      const avgRating = reviewCount > 0 ? parseFloat((totalRating / reviewCount).toFixed(1)) : 0;
      
      // Update service document with aggregate data
      const serviceRef = doc(db, 'users', technicianId, 'services', serviceId);
      await updateDoc(serviceRef, {
        rating: avgRating,
        reviewCount: reviewCount,
      });
      
      return {
        id: customerId,
        customerId,
        customerName,
        serviceRating,
        technicianRating,
        comment,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  allServices: [],
  userServices: [],
  currentService: null,
  serviceReviews: [],
  hasConversation: false,
  loading: false,
  error: null,
};

const serviceSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentService: (state, action) => {
      state.currentService = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Create Service
    builder
      .addCase(createService.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createService.fulfilled, (state, action) => {
        state.loading = false;
        state.userServices.push(action.payload);
        state.error = null;
      })
      .addCase(createService.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch All Services
    builder
      .addCase(fetchAllServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllServices.fulfilled, (state, action) => {
        state.loading = false;
        state.allServices = action.payload;
        state.error = null;
      })
      .addCase(fetchAllServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch User Services
    builder
      .addCase(fetchUserServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserServices.fulfilled, (state, action) => {
        state.loading = false;
        state.userServices = action.payload;
        state.error = null;
      })
      .addCase(fetchUserServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Service
    builder
      .addCase(updateService.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateService.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.userServices.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          const updated = { ...state.userServices[index] };
          // Only update provided fields, clean up undefined values
          Object.keys(action.payload).forEach((key) => {
            if (action.payload[key] !== undefined) {
              updated[key] = action.payload[key];
            }
          });
          state.userServices[index] = updated;
        }
        state.error = null;
      })
      .addCase(updateService.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Service
    builder
      .addCase(deleteService.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.loading = false;
        state.userServices = state.userServices.filter((s) => s.id !== action.payload);
        state.allServices = state.allServices.filter((s) => s.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteService.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Check User Conversation
    builder
      .addCase(checkUserConversation.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkUserConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.hasConversation = action.payload;
      })
      .addCase(checkUserConversation.rejected, (state, action) => {
        state.loading = false;
        state.hasConversation = false;
        state.error = action.payload;
      });

    // Fetch Service Reviews
    builder
      .addCase(fetchServiceReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServiceReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.serviceReviews = action.payload;
        state.error = null;
      })
      .addCase(fetchServiceReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Submit Service Review
    builder
      .addCase(submitServiceReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitServiceReview.fulfilled, (state, action) => {
        state.loading = false;
        // Update or add review to the reviews list
        const index = state.serviceReviews.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.serviceReviews[index] = action.payload;
        } else {
          state.serviceReviews.push(action.payload);
        }
        state.error = null;
      })
      .addCase(submitServiceReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentService } = serviceSlice.actions;
export default serviceSlice.reducer;
