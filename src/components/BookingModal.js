import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export const BookingModal = ({ visible, onClose, service, technician, onBook, loading = false }) => {
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setScheduledDate(selectedDate);
    }
  };

  const handleBook = () => {
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter service location');
      return;
    }

    if (scheduledDate < new Date()) {
      Alert.alert('Error', 'Please select a future date');
      return;
    }

    onBook({
      scheduledDate: scheduledDate.toISOString(),
      location,
      description,
    });
  };

  if (!service || !technician) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Book Service</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Service Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <View style={styles.serviceCard}>
              <Text style={styles.serviceName}>{service.title || service.name || 'Service'}</Text>
              {service.category && (
                <Text style={styles.serviceCategory}>{service.category}</Text>
              )}
              <Text style={styles.technicianName}>by {technician.name}</Text>
              <Text style={styles.price}>₹{service.price}</Text>
            </View>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Date & Time</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                📅 {scheduledDate.toLocaleDateString()} - {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={scheduledDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter service address"
              value={location}
              onChangeText={setLocation}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe what needs to be done..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>

          {/* Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Fee:</Text>
              <Text style={styles.summaryValue}>₹{service.price}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee (10%):</Text>
              <Text style={styles.summaryValue}>₹{Math.round(service.price * 0.1)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>₹{Math.round(service.price * 1.1)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bookButton, loading && styles.bookButtonDisabled]}
            onPress={handleBook}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bookButtonText}>Proceed to Payment</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    fontSize: 24,
    color: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceCategory: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  technicianName: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 8,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 80,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  bookButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#999',
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
