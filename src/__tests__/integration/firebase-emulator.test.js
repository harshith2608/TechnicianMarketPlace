/**
 * Firebase Emulator Integration Tests
 * Tests basic Firestore operations using the emulator
 */

import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';

describe('Firebase Emulator - Integration Tests', () => {
  let db;

  beforeAll(() => {
    // Get Firestore instance from global test setup
    db = global.testFirebaseServices.db;

    if (!db) {
      throw new Error(
        'Firebase Emulator not initialized. Ensure firebase-emulator-setup.js is loaded.'
      );
    }
  });

  describe('Firestore Read Operations', () => {
    test('should retrieve all users from emulator', async () => {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      expect(snapshot.empty).toBe(false);
      expect(snapshot.docs.length).toBeGreaterThan(0);

      snapshot.docs.forEach((doc) => {
        expect(doc.id).toBeDefined();
        expect(doc.data()).toHaveProperty('email');
      });
    });

    test('should query technician users', async () => {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('userType', '==', 'technician'));
      const snapshot = await getDocs(q);

      expect(snapshot.empty).toBe(false);
      snapshot.docs.forEach((doc) => {
        expect(doc.data().userType).toBe('technician');
      });
    });

    test('should retrieve a specific booking', async () => {
      const bookingRef = doc(db, 'bookings', 'booking-1');
      const snapshot = await getDoc(bookingRef);

      expect(snapshot.exists()).toBe(true);
      expect(snapshot.data().customerId).toBe('test-user-1');
      expect(snapshot.data().status).toBe('pending');
    });

    test('should query bookings by customer', async () => {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('customerId', '==', 'test-user-1')
      );
      const snapshot = await getDocs(q);

      expect(snapshot.empty).toBe(false);
      snapshot.docs.forEach((doc) => {
        expect(doc.data().customerId).toBe('test-user-1');
      });
    });

    test('should query bookings by technician and status', async () => {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('technicianId', '==', 'test-tech-1'),
        where('status', '==', 'accepted')
      );
      const snapshot = await getDocs(q);

      expect(snapshot.empty).toBe(false);
      expect(snapshot.docs[0].data().status).toBe('accepted');
    });

    test('should retrieve services for a technician', async () => {
      const servicesRef = collection(db, 'services');
      const q = query(
        servicesRef,
        where('technicianId', '==', 'test-tech-1')
      );
      const snapshot = await getDocs(q);

      expect(snapshot.empty).toBe(false);
      snapshot.docs.forEach((doc) => {
        expect(doc.data().technicianId).toBe('test-tech-1');
      });
    });
  });

  describe('Firestore Write Operations', () => {
    test('should create a new booking', async () => {
      const newBookingId = 'test-booking-new-' + Date.now();
      const bookingRef = doc(db, 'bookings', newBookingId);

      await setDoc(bookingRef, {
        customerId: 'test-user-1',
        technicianId: 'test-tech-1',
        serviceId: 'service-1',
        status: 'pending',
        amount: 500,
        currency: 'INR',
        createdAt: new Date(),
      });

      const snapshot = await getDoc(bookingRef);
      expect(snapshot.exists()).toBe(true);
      expect(snapshot.data().customerId).toBe('test-user-1');
    });

    test('should update booking status', async () => {
      const bookingRef = doc(db, 'bookings', 'booking-1');

      await updateDoc(bookingRef, {
        status: 'accepted',
        acceptedAt: new Date(),
      });

      const snapshot = await getDoc(bookingRef);
      expect(snapshot.data().status).toBe('accepted');
    });

    test('should create a new service', async () => {
      const newServiceId = 'test-service-new-' + Date.now();
      const serviceRef = doc(db, 'services', newServiceId);

      await setDoc(serviceRef, {
        technicianId: 'test-tech-1',
        name: 'Test Service',
        category: 'Testing',
        pricing: { type: 'fixed', amount: 999 },
        verified: false,
        createdAt: new Date(),
      });

      const snapshot = await getDoc(serviceRef);
      expect(snapshot.exists()).toBe(true);
      expect(snapshot.data().name).toBe('Test Service');
    });

    test('should delete a test booking', async () => {
      // Create a temporary booking first
      const tempBookingId = 'temp-booking-' + Date.now();
      const bookingRef = doc(db, 'bookings', tempBookingId);

      await setDoc(bookingRef, {
        customerId: 'test-user-1',
        technicianId: 'test-tech-1',
        status: 'pending',
        amount: 100,
        createdAt: new Date(),
      });

      // Verify it exists
      let snapshot = await getDoc(bookingRef);
      expect(snapshot.exists()).toBe(true);

      // Delete it
      await deleteDoc(bookingRef);

      // Verify deletion
      snapshot = await getDoc(bookingRef);
      expect(snapshot.exists()).toBe(false);
    });
  });

  describe('Firestore Complex Queries', () => {
    test('should query completed bookings with ratings', async () => {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('status', '==', 'completed'),
        where('rating', '>', 0)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        snapshot.docs.forEach((doc) => {
          expect(doc.data().status).toBe('completed');
          expect(doc.data().rating).toBeGreaterThan(0);
        });
      }
    });

    test('should query verified services', async () => {
      const servicesRef = collection(db, 'services');
      const q = query(servicesRef, where('verified', '==', true));
      const snapshot = await getDocs(q);

      snapshot.docs.forEach((doc) => {
        expect(doc.data().verified).toBe(true);
      });
    });

    test('should retrieve conversations with specific participant', async () => {
      const convsRef = collection(db, 'conversations');
      const q = query(
        convsRef,
        where('participants', 'array-contains', 'test-user-1')
      );
      const snapshot = await getDocs(q);

      expect(snapshot.empty).toBe(false);
      snapshot.docs.forEach((doc) => {
        expect(doc.data().participants).toContain('test-user-1');
      });
    });
  });

  describe('Firestore Transaction Operations', () => {
    test('should retrieve multiple related documents', async () => {
      // Get a booking
      const bookingRef = doc(db, 'bookings', 'booking-1');
      const bookingSnap = await getDoc(bookingRef);
      expect(bookingSnap.exists()).toBe(true);

      const bookingData = bookingSnap.data();

      // Get customer
      const customerRef = doc(db, 'users', bookingData.customerId);
      const customerSnap = await getDoc(customerRef);
      expect(customerSnap.exists()).toBe(true);

      // Get technician
      const techRef = doc(db, 'users', bookingData.technicianId);
      const techSnap = await getDoc(techRef);
      expect(techSnap.exists()).toBe(true);

      expect(customerSnap.data().userType).toBe('customer');
      expect(techSnap.data().userType).toBe('technician');
    });
  });

  describe('Error Handling', () => {
    test('should handle query errors gracefully', async () => {
      expect(async () => {
        // This should not throw, but return empty results
        const usersRef = collection(db, 'nonexistent-collection');
        const q = query(usersRef, where('test', '==', 'value'));
        await getDocs(q);
      }).not.toThrow();
    });

    test('should handle document not found', async () => {
      const ref = doc(db, 'bookings', 'nonexistent-id');
      const snapshot = await getDoc(ref);
      expect(snapshot.exists()).toBe(false);
    });
  });
});
