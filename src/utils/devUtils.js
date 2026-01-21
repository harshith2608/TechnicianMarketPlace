import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Test account credentials
export const TEST_ACCOUNTS = {
  customer: {
    email: 'customer@test.com',
    password: 'test1234',
    name: 'Test Customer',
    role: 'customer',
  },
  technician: {
    email: 'technician@test.com',
    password: 'test1234',
    name: 'Test Technician',
    role: 'technician',
  },
};

/**
 * Create test accounts in Firebase Auth and Firestore
 */
export const setupTestAccounts = async () => {
  try {
    const results = {};
    
    for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
      try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          account.email,
          account.password
        );
        
        const uid = userCredential.user.uid;
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', uid), {
          name: account.name,
          email: account.email,
          role: account.role,
          phoneNumber: null,
          isPhoneVerified: false,
          createdAt: new Date(),
          legalAcceptance: {
            accepted: true,
            acceptedAt: new Date().toISOString(),
            version: '1.0',
          },
          totalEarnings: 0,
          pendingPayout: 0,
          totalTransactions: 0,
          lastPayoutDate: null,
        });
        
        results[role] = {
          uid,
          email: account.email,
          name: account.name,
          success: true,
        };
      } catch (err) {
        // Account might already exist
        if (err.code === 'auth/email-already-in-use') {
          results[role] = {
            email: account.email,
            success: false,
            message: 'Account already exists',
          };
        } else {
          throw err;
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error setting up test accounts:', error);
    throw error;
  }
};

/**
 * Get test account UIDs from Firestore
 */
export const getTestAccountUIDs = async () => {
  try {
    const results = {};
    
    for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', account.email));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        results[role] = {
          uid: snapshot.docs[0].id,
          email: account.email,
          name: account.name,
        };
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error getting test account UIDs:', error);
    throw error;
  }
};

/**
 * Create a test booking between customer and technician
 */
export const createTestBooking = async (customerId, technicianId) => {
  try {
    // Get user details
    const { getDoc, doc } = await import('firebase/firestore');
    const customerRef = doc(db, 'users', customerId);
    const techRef = doc(db, 'users', technicianId);
    
    const customerSnap = await getDoc(customerRef);
    const techSnap = await getDoc(techRef);
    
    if (!customerSnap.exists() || !techSnap.exists()) {
      throw new Error('Customer or technician not found');
    }

    const customerData = customerSnap.data();
    const techData = techSnap.data();

    // Create or get conversation
    const conversationsRef = collection(db, 'conversations');
    const existingConv = await getDocs(
      query(
        conversationsRef,
        where('participants', 'array-contains', customerId)
      )
    );

    let conversationId;
    for (const convDoc of existingConv.docs) {
      const participants = convDoc.data().participants || [];
      if (participants.includes(technicianId)) {
        conversationId = convDoc.id;
        break;
      }
    }

    if (!conversationId) {
      // Create new conversation
      const convRef = await addDoc(conversationsRef, {
        participants: [customerId, technicianId],
        createdAt: new Date(),
        lastMessage: null,
        lastMessageTime: new Date(),
      });
      conversationId = convRef.id;
    }

    // Create booking
    const bookingsRef = collection(db, 'conversations', conversationId, 'bookings');
    const bookingRef = await addDoc(bookingsRef, {
      customerId,
      customername: customerData.name,
      technicianId,
      technicianName: techData.name,
      serviceId: 'test-service-001',
      serviceName: 'Test Service',
      status: 'pending',
      paymentStatus: 'pending',
      amount: 1000,
      estimatedPrice: 1000,
      location: 'Test Location',
      description: 'Test booking for development',
      scheduledDate: new Date(),
      createdAt: new Date(),
      conversationId,
    });

    return {
      bookingId: bookingRef.id,
      conversationId,
      customerId,
      technicianId,
      status: 'pending',
    };
  } catch (error) {
    console.error('Error creating test booking:', error);
    throw error;
  }
};

/**
 * Auto-complete booking workflow
 */
export const autoCompleteBooking = async (customerId, technicianId) => {
  try {
    // 1. Create booking
    const booking = await createTestBooking(customerId, technicianId);
    console.log('✅ Booking created:', booking);

    // 2. Accept booking (technician side)
    const { doc, updateDoc, getDoc } = await import('firebase/firestore');
    const bookingRef = doc(
      db,
      'conversations',
      booking.conversationId,
      'bookings',
      booking.bookingId
    );

    await updateDoc(bookingRef, {
      status: 'confirmed',
      acceptedAt: new Date(),
    });
    console.log('✅ Booking accepted');

    // 3. Mark as completed (customer side)
    await updateDoc(bookingRef, {
      status: 'completed',
      completedAt: new Date(),
      paymentStatus: 'completed',
    });
    console.log('✅ Booking completed');

    // 4. Update technician earnings (simulate payment processing)
    const COMMISSION_RATE = 0.10; // 10% commission (matches backend config)
    const bookingAmount = 1000; // Test booking amount
    const commission = Math.round(bookingAmount * COMMISSION_RATE);
    const earnings = bookingAmount - commission;

    const technicianRef = doc(db, 'users', technicianId);
    const techSnap = await getDoc(technicianRef);
    
    if (techSnap.exists()) {
      const currentEarnings = techSnap.data().totalEarnings || 0;
      const currentPending = techSnap.data().pendingPayout || 0;
      const currentTransactions = techSnap.data().totalTransactions || 0;

      await updateDoc(technicianRef, {
        totalEarnings: currentEarnings + earnings,
        pendingPayout: currentPending + earnings,
        totalTransactions: currentTransactions + 1,
      });
      console.log(`💰 Earnings updated: +₹${earnings} (Commission: ₹${commission})`);
    }

    return {
      ...booking,
      status: 'completed',
      earnings,
      commission,

    };
  } catch (error) {
    console.error('Error auto-completing booking:', error);
    throw error;
  }
};

/**
 * Delete all test bookings for cleanup
 */
export const resetTestData = async (customerId, technicianId) => {
  try {
    // Find conversations involving these users
    const conversationsRef = collection(db, 'conversations');
    const convQuery = query(
      conversationsRef,
      where('participants', 'array-contains', customerId)
    );
    const convSnap = await getDocs(convQuery);

    let deletedCount = 0;

    for (const convDoc of convSnap.docs) {
      const participants = convDoc.data().participants || [];
      if (!participants.includes(technicianId)) continue;

      // Get all bookings in this conversation
      const bookingsRef = collection(db, 'conversations', convDoc.id, 'bookings');
      const bookingsSnap = await getDocs(bookingsRef);

      // Delete each booking
      for (const bookingDoc of bookingsSnap.docs) {
        await deleteDoc(bookingDoc.ref);
        deletedCount++;
      }
    }

    console.log(`✅ Deleted ${deletedCount} test bookings`);
    return deletedCount;
  } catch (error) {
    console.error('Error resetting test data:', error);
    throw error;
  }
};

/**
 * Get test account by role
 */
export const getTestAccount = (role = 'customer') => {
  return TEST_ACCOUNTS[role] || TEST_ACCOUNTS.customer;
};
