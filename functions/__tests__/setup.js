// functions/__tests__/setup.js
/**
 * Jest Setup File
 * Configures test environment for Firebase Cloud Functions
 */

// Create mock firestore db object
const createMockFirestoreDb = () => ({
  collection: jest.fn(function(collectionName) {
    return {
      doc: jest.fn(function(docId) {
        return {
          set: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: docId,
            ref: this,
            data: jest.fn(() => ({
              id: docId,
              status: 'test',
            })),
          }),
          delete: jest.fn().mockResolvedValue(undefined),
        };
      }),
      add: jest.fn().mockResolvedValue({
        id: 'mock-doc-id-' + Date.now(),
        ref: {
          update: jest.fn().mockResolvedValue(undefined),
        },
      }),
      where: jest.fn(function() {
        return {
          limit: jest.fn(function() {
            return {
              get: jest.fn().mockResolvedValue({
                empty: false,
                docs: [{
                  id: 'mock-id',
                  data: jest.fn(() => ({
                    id: 'mock-id',
                    status: 'pending',
                  })),
                }],
              }),
            };
          }),
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [{
              id: 'mock-id',
              data: jest.fn(() => ({
                id: 'mock-id',
                status: 'pending',
              })),
            }],
          }),
        };
      }),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{
          id: 'mock-id',
          data: jest.fn(() => ({
            id: 'mock-id',
            status: 'pending',
          })),
        }],
      }),
    };
  }),
});

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => createMockFirestoreDb()),
  credential: {
    cert: jest.fn(),
  },
}));

// Mock Razorpay SDK
jest.mock('razorpay', () => {
  return jest.fn(function() {
    return {
      orders: {
        create: jest.fn(),
        fetch: jest.fn(),
      },
      payments: {
        capture: jest.fn(),
        refund: jest.fn(),
        fetch: jest.fn(),
      },
      payouts: {
        create: jest.fn(),
      },
    };
  });
});

// Mock Firebase Functions
jest.mock('firebase-functions', () => ({
  https: {
    onCall: jest.fn((handler) => handler),
  },
  runWith: jest.fn(() => ({
    https: {
      onCall: jest.fn((handler) => handler),
    },
  })),
  config: jest.fn(() => ({
    razorpay: {
      key_id: jest.fn(() => 'test-key-id'),
      key_secret: jest.fn(() => 'test-key-secret'),
    },
  })),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console errors during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
