import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

export const ServiceRatingsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { serviceId, serviceName, currentRating } = route.params;
  const user = useSelector((state) => state.auth.user);
  
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(currentRating || 0);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    if (reviewText.trim().length < 10) {
      Alert.alert('Error', 'Review must be at least 10 characters');
      return;
    }

    setLoading(true);
    try {
      // TODO: Add to Firebase when backend is ready
      const newReview = {
        id: Math.random().toString(),
        userId: user.id,
        userName: user.name,
        rating,
        reviewText: reviewText.trim(),
        createdAt: new Date().toISOString(),
      };

      setReviews([newReview, ...reviews]);
      const newAverage = (averageRating * reviews.length + rating) / (reviews.length + 1);
      setAverageRating(Number(newAverage.toFixed(1)));

      Alert.alert('Success', 'Review submitted successfully!');
      setRating(0);
      setReviewText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const renderStar = (index) => (
    <TouchableOpacity key={index} onPress={() => setRating(index + 1)}>
      <Text style={[styles.star, index < rating && styles.starFilled]}>★</Text>
    </TouchableOpacity>
  );

  const ReviewCard = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{item.userName}</Text>
        <View style={styles.ratingStars}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Text key={i} style={[styles.reviewStar, i < item.rating && styles.starFilled]}>★</Text>
          ))}
        </View>
      </View>
      <Text style={styles.reviewDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
      <Text style={styles.reviewText}>{item.reviewText}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serviceName} - Reviews</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Service Rating</Text>
          <View style={styles.currentRating}>
            <Text style={styles.ratingValue}>{averageRating}</Text>
            <View style={styles.starsContainer}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Text key={i} style={[styles.bigStar, i < Math.round(averageRating) && styles.starFilled]}>★</Text>
              ))}
            </View>
            <Text style={styles.reviewCount}>({reviews.length} reviews)</Text>
          </View>
        </View>

        {/* Add Review Section */}
        <View style={styles.addReviewSection}>
          <Text style={styles.sectionTitle}>Share Your Experience</Text>
          
          <Text style={styles.label}>Your Rating</Text>
          <View style={styles.starRating}>
            {[0, 1, 2, 3, 4].map((i) => renderStar(i))}
          </View>

          <Text style={styles.label}>Your Review</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience with this service..."
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmitReview}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>All Reviews</Text>
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>No reviews yet. Be the first to review!</Text>
          ) : (
            <FlatList
              data={reviews}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ReviewCard item={item} />}
              scrollEnabled={false}
            />
          )}
        </View>
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
  content: {
    flex: 1,
    padding: 15,
  },
  ratingSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  currentRating: {
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  bigStar: {
    fontSize: 24,
    color: '#ddd',
    marginHorizontal: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  addReviewSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  starRating: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  star: {
    fontSize: 32,
    color: '#ddd',
    marginRight: 8,
  },
  starFilled: {
    color: '#FFD700',
  },
  reviewInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    height: 100,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewsSection: {
    marginBottom: 20,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ratingStars: {
    flexDirection: 'row',
  },
  reviewStar: {
    fontSize: 14,
    color: '#ddd',
    marginLeft: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});
