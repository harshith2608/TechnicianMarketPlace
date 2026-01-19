import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
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
import { BookingModal } from '../components/BookingModal';
import { db } from '../config/firebase';
import { setCurrentConversation, startConversation } from '../redux/messageSlice';
import {
    checkUserConversation,
    fetchServiceReviews,
    submitServiceReview,
} from '../redux/serviceSlice';

export const ServiceDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { serviceId, technicianId, service } = route.params;
  const user = useSelector((state) => state.auth.user);
  const { serviceReviews, hasConversation, loading } = useSelector(
    (state) => state.services
  );
  const { loading: bookingLoading } = useSelector((state) => state.booking);
  const dispatch = useDispatch();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [serviceRating, setServiceRating] = useState(0);
  const [technicianRating, setTechnicianRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [freshService, setFreshService] = useState(service);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [technicianData, setTechnicianData] = useState(null);

  // Fetch technician data
  useEffect(() => {
    const fetchTechnicianData = async () => {
      try {
        const techRef = doc(db, 'users', technicianId);
        const techDoc = await getDoc(techRef);
        if (techDoc.exists()) {
          setTechnicianData(techDoc.data());
        }
      } catch (error) {
        console.error('Error fetching technician data:', error);
      }
    };
    fetchTechnicianData();
  }, [technicianId]);

  // Function to fetch fresh service data from Firestore
  const fetchFreshServiceData = async () => {
    try {
      const serviceRef = doc(db, 'users', technicianId, 'services', serviceId);
      const serviceDoc = await getDoc(serviceRef);
      if (serviceDoc.exists()) {
        setFreshService({ id: serviceDoc.id, ...serviceDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching fresh service data:', error);
    }
  };

  useEffect(() => {
    // Fetch reviews for this service
    dispatch(fetchServiceReviews({ technicianId, serviceId }));

    // Check if user has a booking for this service with the technician
    if (user?.id) {
      dispatch(checkUserConversation({ customerId: user.id, technicianId, serviceId }));
    }

    // Fetch fresh service data
    fetchFreshServiceData();
  }, [dispatch, serviceId, technicianId, user?.id]);

  const customerReview = serviceReviews.find((r) => r.customerId === user?.id);

  const handleSubmitReview = async () => {
    if (serviceRating === 0 || technicianRating === 0) {
      Alert.alert('Error', 'Please rate both the service and technician');
      return;
    }
    if (comment.trim().length < 10) {
      Alert.alert('Error', 'Comment must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        submitServiceReview({
          technicianId,
          serviceId,
          customerId: user.id,
          customerName: user.name,
          serviceRating,
          technicianRating,
          comment: comment.trim(),
        })
      ).unwrap();

      Alert.alert('Success', 'Review submitted successfully!');
      setServiceRating(0);
      setTechnicianRating(0);
      setComment('');
      setShowReviewForm(false);
      
      // Refetch fresh service data and reviews
      fetchFreshServiceData();
      dispatch(fetchServiceReviews({ technicianId, serviceId }));
    } catch (error) {
      Alert.alert('Error', error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookService = async (bookingDetails) => {
    try {
      // First, create or get conversation
      const conversationResult = await dispatch(
        startConversation({
          customerId: user.id,
          customerName: user.name,
          technicianId,
          technicianName: freshService?.technicianName || service?.technicianName,
        })
      ).unwrap();

      setShowBookingModal(false);
      
      // Navigate to payment screen with service and booking details
      // Booking will be created AFTER payment succeeds to avoid orphaned bookings
      const finalPrice = freshService?.price || service?.price || 0;
      navigation.navigate('Payment', {
        conversationId: conversationResult.id,
        serviceId,
        serviceName: freshService?.name || service?.name || 'Service',
        servicePrice: finalPrice,
        technicianName: freshService?.technicianName || service?.technicianName,
        technicianId,
        customerId: user.id,
        scheduledDate: bookingDetails.scheduledDate,
        location: bookingDetails.location,
        description: bookingDetails.description,
        estimatedPrice: finalPrice,
      });
    } catch (error) {
      console.error('Error booking service:', error);
      Alert.alert('Error', error?.message || 'Failed to create booking');
    }
  };

  const handleSendMessage = async () => {
    try {
      // Validate user data
      if (!user?.id || !user?.name) {
        Alert.alert('Error', 'User information not available');
        return;
      }

      // Use freshService if available, fallback to service from route params
      const technicianName = freshService?.technicianName || service?.technicianName;
      
      if (!technicianName) {
        Alert.alert('Error', 'Technician information not available');
        return;
      }

      const result = await dispatch(
        startConversation({
          customerId: user.id,
          customerName: user.name,
          technicianId,
          technicianName,
        })
      ).unwrap();

      // Navigate to chat detail screen
      dispatch(setCurrentConversation(result.id));
      navigation.navigate('ChatDetail', {
        conversationId: result.id,
        otherUserName: technicianName,
        otherUserId: technicianId,
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', error?.message || 'Failed to start conversation');
    }
  };

  const renderStar = (index, rating, onPress) => (
    <TouchableOpacity key={index} onPress={() => onPress(index + 1)}>
      <Text style={[styles.star, index < rating && styles.starFilled]}>★</Text>
    </TouchableOpacity>
  );

  const ReviewCard = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{item.customerName}</Text>
        <View style={styles.ratingDisplay}>
          <View style={styles.ratingStars}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Text
                key={i}
                style={[
                  styles.reviewStar,
                  i < item.serviceRating && styles.starFilled,
                ]}
              >
                ★
              </Text>
            ))}
          </View>
          <Text style={styles.ratingLabel}>Service</Text>
        </View>
        <View style={styles.ratingDisplay}>
          <View style={styles.ratingStars}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Text
                key={i}
                style={[
                  styles.reviewStar,
                  i < item.technicianRating && styles.starFilled,
                ]}
              >
                ★
              </Text>
            ))}
          </View>
          <Text style={styles.ratingLabel}>Technician</Text>
        </View>
      </View>
      <Text style={styles.reviewDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
      <Text style={styles.reviewText}>{item.comment}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Service Image */}
        <Image source={{ uri: freshService.imageUrl }} style={styles.serviceImage} />

        {/* Service Info */}
        <View style={styles.infoSection}>
          <Text style={styles.serviceTitle}>{freshService.title}</Text>
          <Text style={styles.technicianName}>by {freshService.technicianName}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.ratingScore}>⭐ {freshService.rating || 0}</Text>
            <Text style={styles.reviewCount}>
              ({freshService.reviewCount || 0} reviews)
            </Text>
          </View>

          <View style={styles.categoryPrice}>
            <Text style={styles.category}>{freshService.category}</Text>
            <Text style={styles.price}>₹{freshService.price.toFixed(2)}</Text>
          </View>

          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.description}>{freshService.description}</Text>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={() => setShowBookingModal(true)}
            >
              <Text style={styles.bookButtonText}>📅 Book Service</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={handleSendMessage}
            >
              <Text style={styles.messageButtonText}>💬 Message Technician</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>
            Reviews ({serviceReviews.length})
          </Text>

          {/* User's Own Review */}
          {customerReview && (
            <>
              <Text style={styles.yourReviewLabel}>Your Review</Text>
              <ReviewCard item={customerReview} />
            </>
          )}

          {/* Other Reviews */}
          {serviceReviews.length > 0 ? (
            <>
              {!customerReview && (
                <Text style={styles.otherReviewsLabel}>Other Reviews</Text>
              )}
              {serviceReviews
                .filter((r) => r.customerId !== user?.id)
                .map((review) => (
                  <ReviewCard key={review.id} item={review} />
                ))}
            </>
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet</Text>
          )}
        </View>

        {/* Review Form Button */}
        {!showReviewForm && hasConversation && user?.role === 'customer' && (
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={() => setShowReviewForm(true)}
          >
            <Text style={styles.addReviewButtonText}>
              {customerReview ? 'Update Your Review' : 'Add a Review'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Review Form */}
        {showReviewForm && hasConversation && user?.role === 'customer' && (
          <View style={styles.reviewForm}>
            <Text style={styles.formTitle}>
              {customerReview ? 'Update Your Review' : 'Share Your Experience'}
            </Text>

            {/* Service Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rate the Service</Text>
              <View style={styles.starsContainer}>
                {[0, 1, 2, 3, 4].map((i) =>
                  renderStar(i, serviceRating, setServiceRating)
                )}
              </View>
            </View>

            {/* Technician Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rate the Technician</Text>
              <View style={styles.starsContainer}>
                {[0, 1, 2, 3, 4].map((i) =>
                  renderStar(i, technicianRating, setTechnicianRating)
                )}
              </View>
            </View>

            {/* Comment */}
            <View style={styles.commentSection}>
              <Text style={styles.ratingLabel}>Your Comment</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience... (minimum 10 characters)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
                editable={!submitting}
              />
            </View>

            {/* Buttons */}
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowReviewForm(false);
                  setServiceRating(0);
                  setTechnicianRating(0);
                  setComment('');
                }}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitReview}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* No Permission Message */}
        {!hasConversation && user?.role === 'customer' && (
          <View style={styles.noPermissionMessage}>
            <Text style={styles.noPermissionText}>
              � You can rate this service after booking it
            </Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Booking Modal */}
      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        service={freshService}
        technician={technicianData}
        onBook={handleBookService}
        loading={bookingLoading}
      />
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
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 28,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerPlaceholder: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  serviceImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#e0e0e0',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  technicianName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  categoryPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  category: {
    fontSize: 13,
    fontWeight: '500',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  actionButtonsContainer: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  reviewsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15,
  },
  yourReviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 10,
  },
  otherReviewsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  reviewHeader: {
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  reviewStar: {
    fontSize: 14,
    color: '#ccc',
    marginRight: 2,
  },
  starFilled: {
    color: '#f59e0b',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#666',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  addReviewButton: {
    backgroundColor: '#007AFF',
    margin: 15,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addReviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewForm: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 8,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingSection: {
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  star: {
    fontSize: 40,
    color: '#ccc',
    marginHorizontal: 8,
  },
  commentSection: {
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    marginTop: 8,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#000',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  noPermissionMessage: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  noPermissionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
