import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';

/**
 * Connect Firebase services to the emulator suite
 * Only connects if:
 * 1. EXPO_PUBLIC_USE_EMULATOR environment variable is set to 'true'
 * 2. Running in development mode
 */
export function initializeEmulators(auth, db, storage) {
  const useEmulator = process.env.EXPO_PUBLIC_USE_EMULATOR === 'true';

  if (!useEmulator) {
    console.log('Firebase Emulator not enabled. Using production Firebase.');
    return;
  }

  try {
    // Check if already connected to avoid errors
    if (location.hostname === 'localhost') {
      // Auth Emulator
      try {
        connectAuthEmulator(auth, 'http://localhost:9099', {
          disableWarnings: true,
        });
        console.log('✅ Connected to Auth Emulator (localhost:9099)');
      } catch (error) {
        console.log('Auth Emulator already connected or not available');
      }

      // Firestore Emulator
      try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('✅ Connected to Firestore Emulator (localhost:8080)');
      } catch (error) {
        console.log('Firestore Emulator already connected or not available');
      }

      // Storage Emulator
      try {
        connectStorageEmulator(storage, 'localhost', 9199);
        console.log('✅ Connected to Storage Emulator (localhost:9199)');
      } catch (error) {
        console.log('Storage Emulator already connected or not available');
      }
    }
  } catch (error) {
    console.error('Error initializing emulators:', error);
  }
}

/**
 * For React Native/Expo testing in Node environment
 * Use this in test files instead
 */
export function connectEmulators(auth, db, storage) {
  try {
    if (process.env.NODE_ENV === 'test') {
      connectAuthEmulator(auth, 'http://localhost:9099', {
        disableWarnings: true,
      });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('✅ All emulators connected for testing');
    }
  } catch (error) {
    // Already connected, ignore
    if (!error.message.includes('already initialized')) {
      console.error('Error connecting emulators:', error);
    }
  }
}
