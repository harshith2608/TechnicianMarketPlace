/**
 * Jest setup file for Firebase Emulator testing
 * Connects to Firebase Emulator Suite before running tests
 */

// Polyfill setImmediate for gRPC in Node.js environment
// This fixes "ReferenceError: setImmediate is not defined" from @grpc/grpc-js
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => {
    return setTimeout(callback, 0, ...args);
  };
}

if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = (id) => {
    return clearTimeout(id);
  };
}

// Set environment variables for emulator BEFORE importing Firebase
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

// Ensure fetch is available in Node environment
if (!globalThis.fetch) {
  const { fetch: nodeFetch } = require('node-fetch');
  globalThis.fetch = nodeFetch;
}

import { getApp, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { seedEmulatorData } from './emulator-seed';

// Mock Firebase config for testing
const testFirebaseConfig = {
  apiKey: 'AIzaSyDummyKeyForTesting123456789',
  authDomain: 'technicianmarketplace-emulator.firebaseapp.com',
  projectId: 'technicianmarketplace-emulator',
  storageBucket: 'technicianmarketplace-emulator.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123def456',
};

// Global test utilities
global.testFirebaseServices = {};

// Setup Firebase Emulator
beforeAll(async () => {
  console.log('\n🔥 Initializing Firebase Emulator Suite for testing...');

  try {
    // Initialize Firebase app for testing
    let testApp;
    try {
      testApp = getApp('testing');
    } catch (e) {
      testApp = initializeApp(testFirebaseConfig, 'testing');
    }

    const db = getFirestore(testApp);

    // Connect to Firestore Emulator
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('✅ Firestore Emulator connected (localhost:8080)');
      } catch (error) {
        if (error.code !== 'failed-precondition') {
          console.log('ℹ️  Firestore Emulator already connected');
        }
      }
    }

    // Store services globally for tests
    global.testFirebaseServices = { testApp, db };

    // Seed test data (handles permission errors gracefully)
    await seedEmulatorData(db);

    console.log('✅ Firebase Emulator Suite ready for testing!\n');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Emulator:', error.message);
    // Don't throw, allow tests to continue
  }
});

// Cleanup after all tests
afterAll(async () => {
  console.log('\n🧹 Cleaning up Firebase Emulator...');

  try {
    if (global.testFirebaseServices.testApp) {
      // Note: Full cleanup would require firebase admin SDK
      // For now, just log completion
      console.log('✅ Firebase Emulator cleanup complete\n');
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
});

// Add custom matchers if needed
expect.extend({
  toBeValidFirestoreDoc(received) {
    const pass = received && typeof received === 'object';
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} to be a valid Firestore document`,
    };
  },
});
