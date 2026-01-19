/**
 * Integration Test Setup
 * Configures Firebase emulator for integration tests
 */

const admin = require('firebase-admin');
const process = require('process');

/**
 * Initialize Firebase Admin SDK for emulator
 * Uses FIREBASE_EMULATOR_HOST environment variable
 */
function initializeFirebaseEmulator() {
  // Check if emulator is running
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  
  if (!emulatorHost) {
    throw new Error(
      'FIRESTORE_EMULATOR_HOST not set. ' +
      'Start emulator with: firebase emulators:start --only firestore,auth'
    );
  }

  console.log(`✓ Using Firebase Emulator at ${emulatorHost}`);

  // Initialize with minimal credentials (emulator doesn't check)
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
      projectId: 'test-project',
    });
  }

  return admin;
}

/**
 * Clear all data from Firestore collections
 * Useful for test cleanup
 */
async function clearFirestore(adminInstance) {
  try {
    const db = adminInstance.firestore();
    const collections = ['payments', 'payouts', 'payment_logs', 'users', 'bookings', 'config'];

    for (const collectionName of collections) {
      try {
        const querySnapshot = await db.collection(collectionName).get();
        if (querySnapshot.docs.length > 0) {
          const batch = db.batch();
          querySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`✓ Cleared ${querySnapshot.docs.length} documents from ${collectionName}`);
        }
      } catch (err) {
        // Collection might not exist yet, skip
        continue;
      }
    }
  } catch (error) {
    console.warn('clearFirestore error:', error.message);
  }
}

/**
 * Create test user in Firestore
 */
async function createTestUser(admin, userId, userData = {}) {
  const db = admin.firestore();
  const defaultData = {
    id: userId,
    email: `${userId}@test.com`,
    name: 'Test User',
    createdAt: new Date().toISOString(),
    ...userData,
  };

  await db.collection('users').doc(userId).set(defaultData);
  return defaultData;
}

/**
 * Create test payment record
 */
async function createTestPayment(admin, paymentId, paymentData = {}) {
  const db = admin.firestore();
  const defaultData = {
    id: paymentId,
    orderId: `order_${paymentId}`,
    amount: 5000,
    commission: 500,
    status: 'completed',
    customerId: 'cust_test_001',
    technicianId: 'tech_test_001',
    paymentDate: new Date().toISOString(),
    signature: 'test_signature',
    ...paymentData,
  };

  await db.collection('payments').doc(paymentId).set(defaultData);
  return defaultData;
}

/**
 * Create test booking record
 */
async function createTestBooking(admin, bookingId, bookingData = {}) {
  const db = admin.firestore();
  const defaultData = {
    id: bookingId,
    customerId: 'cust_test_001',
    technicianId: 'tech_test_001',
    serviceType: 'plumbing',
    amount: 5000,
    status: 'completed',
    paymentId: 'pay_test_001',
    createdAt: new Date().toISOString(),
    ...bookingData,
  };

  await db.collection('bookings').doc(bookingId).set(defaultData);
  return defaultData;
}

/**
 * Get document from Firestore (for assertions)
 */
async function getDoc(admin, collectionName, docId) {
  const db = admin.firestore();
  const doc = await db.collection(collectionName).doc(docId).get();
  
  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
}

/**
 * Get all documents from collection (for assertions)
 */
async function getAllDocs(admin, collectionName) {
  const db = admin.firestore();
  const snapshot = await db.collection(collectionName).get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Query documents with where clause
 */
async function queryDocs(admin, collectionName, field, operator, value) {
  const db = admin.firestore();
  const snapshot = await db.collection(collectionName)
    .where(field, operator, value)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

module.exports = {
  initializeFirebaseEmulator,
  clearFirestore,
  createTestUser,
  createTestPayment,
  createTestBooking,
  getDoc,
  getAllDocs,
  queryDocs,
};
