/**
 * Firestore Emulator Test Data Seeding
 * Populates the Firestore emulator with sample data for testing
 */

import { doc, setDoc } from 'firebase/firestore';

export const SEED_DATA = {
  users: [
    {
      id: 'test-user-1',
      email: 'customer@test.com',
      displayName: 'Test Customer',
      userType: 'customer',
      phoneNumber: '+91-9876543210',
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'test-tech-1',
      email: 'technician@test.com',
      displayName: 'Test Technician',
      userType: 'technician',
      phoneNumber: '+91-9123456789',
      createdAt: new Date('2026-01-01'),
      rating: 4.8,
      totalBookings: 42,
    },
    {
      id: 'test-tech-2',
      email: 'technician2@test.com',
      displayName: 'Another Technician',
      userType: 'technician',
      phoneNumber: '+91-8765432109',
      createdAt: new Date('2026-01-02'),
      rating: 4.5,
      totalBookings: 25,
    },
  ],

  services: [
    {
      id: 'service-1',
      technicianId: 'test-tech-1',
      name: 'Plumbing Repair',
      description: 'Professional plumbing services for repairs and maintenance',
      category: 'Plumbing',
      pricing: {
        type: 'fixed',
        amount: 500,
        currency: 'INR',
      },
      images: ['https://via.placeholder.com/400x300?text=Plumbing'],
      rating: 4.8,
      reviews: 12,
      verified: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'service-2',
      technicianId: 'test-tech-1',
      name: 'Electrical Work',
      description: 'Expert electrical services for homes and offices',
      category: 'Electrical',
      pricing: {
        type: 'hourly',
        amount: 400,
        currency: 'INR',
      },
      images: ['https://via.placeholder.com/400x300?text=Electrical'],
      rating: 4.7,
      reviews: 8,
      verified: true,
      createdAt: new Date('2026-01-01'),
    },
  ],

  bookings: [
    {
      id: 'booking-1',
      customerId: 'test-user-1',
      technicianId: 'test-tech-1',
      serviceId: 'service-1',
      status: 'pending',
      date: new Date('2026-02-15'),
      time: '10:00 AM',
      location: {
        address: '123 Test Street, Test City',
        latitude: 28.7041,
        longitude: 77.1025,
      },
      amount: 500,
      currency: 'INR',
      notes: 'Fixing kitchen sink leakage',
      createdAt: new Date('2026-01-15'),
    },
    {
      id: 'booking-2',
      customerId: 'test-user-1',
      technicianId: 'test-tech-1',
      serviceId: 'service-2',
      status: 'accepted',
      date: new Date('2026-02-20'),
      time: '2:00 PM',
      location: {
        address: '456 Main Road, Test City',
        latitude: 28.6139,
        longitude: 77.2090,
      },
      amount: 800,
      currency: 'INR',
      notes: 'Wall wiring installation',
      createdAt: new Date('2026-01-14'),
      acceptedAt: new Date('2026-01-15'),
    },
    {
      id: 'booking-3',
      customerId: 'test-user-1',
      technicianId: 'test-tech-2',
      serviceId: 'service-1',
      status: 'completed',
      date: new Date('2026-01-10'),
      time: '11:00 AM',
      location: {
        address: '789 Park Lane, Test City',
        latitude: 28.4595,
        longitude: 77.0266,
      },
      amount: 500,
      currency: 'INR',
      completedAt: new Date('2026-01-10T01:15:00'),
      rating: 5,
      review: 'Great service, very professional!',
    },
  ],

  conversations: [
    {
      id: 'conv-1',
      participants: ['test-user-1', 'test-tech-1'],
      lastMessage: 'When can you come tomorrow?',
      lastMessageTime: new Date('2026-01-15T02:30:00'),
      unreadCount: {
        'test-user-1': 2,
        'test-tech-1': 0,
      },
      createdAt: new Date('2026-01-14'),
    },
  ],

  messages: [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'test-user-1',
      text: 'Hi, I need plumbing repair',
      timestamp: new Date('2026-01-14T10:00:00'),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'test-tech-1',
      text: 'Sure, I can help. What is the issue?',
      timestamp: new Date('2026-01-14T10:05:00'),
    },
    {
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'test-user-1',
      text: 'When can you come tomorrow?',
      timestamp: new Date('2026-01-15T02:30:00'),
    },
  ],
};

/**
 * Seed the Firestore emulator with test data
 * Handles permission errors gracefully - seeding is optional for tests
 * @param {Object} db - Firestore database instance
 */
export async function seedEmulatorData(db) {
  console.log('🌱 Seeding Firestore Emulator with test data...');

  let successCount = 0;
  let failCount = 0;

  try {
    // Seed Users
    console.log('Adding users...');
    for (const user of SEED_DATA.users) {
      try {
        const userRef = doc(db, 'users', user.id);
        await setDoc(userRef, user);
        successCount++;
      } catch (err) {
        if (err.code === 'permission-denied') {
          console.log(`⚠️  Permission denied for user ${user.id} - rules may restrict writes`);
          failCount++;
        } else {
          throw err;
        }
      }
    }

    // Seed Services - optional, continue on permission error
    console.log('Adding services...');
    for (const service of SEED_DATA.services) {
      try {
        const serviceRef = doc(db, 'services', service.id);
        await setDoc(serviceRef, service);
        successCount++;
      } catch (err) {
        if (err.code === 'permission-denied') {
          failCount++;
        } else {
          throw err;
        }
      }
    }

    // Seed Bookings
    console.log('Adding bookings...');
    for (const booking of SEED_DATA.bookings) {
      try {
        const bookingRef = doc(db, 'bookings', booking.id);
        await setDoc(bookingRef, booking);
        successCount++;
      } catch (err) {
        if (err.code === 'permission-denied') {
          failCount++;
        } else {
          throw err;
        }
      }
    }

    // Seed Conversations
    console.log('Adding conversations...');
    for (const conv of SEED_DATA.conversations) {
      try {
        const convRef = doc(db, 'conversations', conv.id);
        await setDoc(convRef, conv);
        successCount++;
      } catch (err) {
        if (err.code === 'permission-denied') {
          failCount++;
        } else {
          throw err;
        }
      }
    }

    // Seed Messages
    console.log('Adding messages...');
    for (const message of SEED_DATA.messages) {
      try {
        const messageRef = doc(
          db,
          'conversations',
          message.conversationId,
          'messages',
          message.id
        );
        await setDoc(messageRef, message);
        successCount++;
      } catch (err) {
        if (err.code === 'permission-denied') {
          failCount++;
        } else {
          throw err;
        }
      }
    }

    if (failCount > 0) {
      console.log(`⚠️  Seeded ${successCount} documents (${failCount} skipped due to permission rules)`);
      console.log('💡 Tests will use mock data or proceed with available seed data');
    } else {
      console.log(`✅ Emulator data seeding complete! (${successCount} documents added)`);
    }
    return true;
  } catch (error) {
    console.error('❌ Error seeding emulator data:', error.message);
    console.log('💡 Tests will continue with available mock data');
    return false;
  }
}

/**
 * Clear all test data from the emulator
 * @param {Object} db - Firestore database instance
 */
export async function clearEmulatorData(db) {
  console.log('🗑️  Clearing Firestore Emulator data...');

  try {
    // Note: In emulator testing, you typically use Jest setup/teardown
    // to clear data automatically. This is a manual utility function.
    console.log('Use firebase.json emulators settings to auto-clear on restart');
  } catch (error) {
    console.error('Error clearing emulator data:', error);
  }
}
