# Jest Mock Configuration Reference

## Problem: Firebase Admin SDK Mock Not Working

### Symptoms
- `admin.firestore()` returning `undefined`
- All Firestore tests failing with "Cannot read properties of undefined (reading 'collection')"
- 13 out of 73 tests failing

### Root Cause Analysis

The issue wasn't with the mock definition itself, but with Jest's mock lifecycle:

```javascript
// WRONG - resetMocks: true clears implementations
jest.config.js: { resetMocks: true }

// This clears mock implementations between tests
jest.clearAllMocks()  // Called automatically before each test

// Result: admin.firestore() returns undefined
```

### Solution Implemented

#### 1. Change Jest Configuration
**File**: `jest.config.js`

```javascript
// Before
resetMocks: true,        // This resets implementations

// After
resetMocks: false,       // Only clear call history, keep implementations
```

**Why**: `resetMocks` clears mock implementations. We only want to clear call history between tests, not the actual mock function implementations.

#### 2. Embed Mock Directly in Test File
**File**: `payment.test.js` and `payout.test.js`

```javascript
// CRITICAL: Must define mock BEFORE any requires
jest.mock('firebase-admin', () => {
  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => {
      // Return a fresh object each time with full Firestore API
      return {
        collection: jest.fn(function(collectionName) {
          return {
            doc: jest.fn(function(docId) {
              return {
                set: jest.fn().mockResolvedValue(undefined),
                update: jest.fn().mockResolvedValue(undefined),
                get: jest.fn().mockResolvedValue({...}),
                delete: jest.fn().mockResolvedValue(undefined),
              };
            }),
            add: jest.fn().mockResolvedValue({...}),
            where: jest.fn(function() {
              return {
                limit: jest.fn(function() {
                  return {
                    get: jest.fn().mockResolvedValue({...}),
                  };
                }),
                get: jest.fn().mockResolvedValue({...}),
              };
            }),
            get: jest.fn().mockResolvedValue({...}),
          };
        }),
      };
    }),
    credential: {
      cert: jest.fn(),
    },
  };
}, { virtual: true });
```

**Why**:
1. `jest.mock()` is called BEFORE `require('firebase-admin')`
2. Using `jest.fn(() => {...})` with arrow function returns proper mock
3. Returns fresh object each call (important for isolation)
4. Includes entire Firestore API chain

#### 3. BeforeEach Setup
**File**: `payment.test.js` and `payout.test.js`

```javascript
beforeEach(() => {
  // Don't use jest.clearAllMocks() - it clears implementations
  // Only clear timers
  jest.clearAllTimers();
  
  // Now call the mock (which still has its implementation)
  firestoreDb = getFirestoreDb();
});

// Helper function
const getFirestoreDb = () => admin.firestore();
```

**Why**:
- `jest.clearAllMocks()` clears implementations too
- `jest.clearAllTimers()` only clears timer state
- With `resetMocks: false`, mock implementations persist

## Why This Works

### Mock Lifecycle with resetMocks: false

```
Test 1 Start
  ├─ jest.mock('firebase-admin', ...) executed ✓
  ├─ admin = require('firebase-admin') ✓
  ├─ beforeEach: jest.clearAllTimers() (implementations persist) ✓
  ├─ admin.firestore() called ✓ returns object
  ├─ Tests use firestoreDb
  └─ Test 1 End (call history cleared, implementations persist)

Test 2 Start
  ├─ beforeEach: jest.clearAllTimers() (implementations still here!) ✓
  ├─ admin.firestore() called ✓ returns object
  ├─ Tests use firestoreDb
  └─ Test 2 End
```

### Why It Failed with resetMocks: true

```
Test 1 Start
  ├─ jest.mock('firebase-admin', ...) executed ✓
  ├─ admin = require('firebase-admin') ✓
  ├─ beforeEach: jest.clearAllMocks()
  │  └─ ⚠️ CLEARS mock implementations!
  ├─ admin.firestore() called ✗ returns undefined
  ├─ Tests fail
  └─ Test 1 End
```

## Complete Firebase Mock Example

```javascript
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  
  // This function returns the Firestore database object
  firestore: jest.fn(() => ({
    // Collections API
    collection: jest.fn(function(collectionName) {
      return {
        // Document API
        doc: jest.fn(function(docId) {
          return {
            set: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: docId,
              data: jest.fn(() => ({ id: docId })),
            }),
            delete: jest.fn().mockResolvedValue(undefined),
          };
        }),
        
        // Add document
        add: jest.fn().mockResolvedValue({
          id: 'mock-doc-id',
          ref: { update: jest.fn().mockResolvedValue(undefined) },
        }),
        
        // Query API
        where: jest.fn(function() {
          return {
            limit: jest.fn(function() {
              return {
                get: jest.fn().mockResolvedValue({
                  empty: false,
                  docs: [{ id: 'mock-id', data: jest.fn(() => ({})) }],
                }),
              };
            }),
            get: jest.fn().mockResolvedValue({
              empty: false,
              docs: [{ id: 'mock-id', data: jest.fn(() => ({})) }],
            }),
          };
        }),
        
        // Get collection
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ id: 'mock-id', data: jest.fn(() => ({})) }],
        }),
      };
    }),
  })),
  
  credential: {
    cert: jest.fn(),
  },
}), { virtual: true });
```

## Best Practices

### ✅ DO

1. Define `jest.mock()` BEFORE any requires
2. Use `jest.fn()` with implementations you need
3. Use `resetMocks: false` for persistent mocks
4. Use `jest.clearAllMocks()` ONLY if you want to clear implementations
5. Return fresh objects from mock functions to avoid state sharing
6. Document your mock structure in comments

### ❌ DON'T

1. Don't use `resetMocks: true` with complex mocks that need persistence
2. Don't call `jest.mock()` after `require()`
3. Don't forget to include all API methods tests will use
4. Don't reuse the same mock object - return fresh objects
5. Don't mix ES6 exports with CommonJS requires

## Troubleshooting

### "Cannot read properties of undefined (reading 'collection')"
**Cause**: `admin.firestore()` returns undefined
**Fix**: Change `resetMocks: false` or ensure mock has implementation

### "jest.mock is not a function"
**Cause**: jest.mock() called after require()
**Fix**: Move jest.mock() to top of file before any imports

### "Module not found: firebase-admin"
**Cause**: Using actual module instead of mock
**Fix**: Ensure jest.mock() is defined and has `{ virtual: true }` option

### "Mock implementation persisting between tests"
**Cause**: You want fresh state
**Fix**: Reset specific mocks in beforeEach:
```javascript
beforeEach(() => {
  admin.firestore.mockClear();  // Clear calls only
});
```

## Testing Firestore Operations

```javascript
// Test collection operations
test('should create payment collection', () => {
  const collection = firestoreDb.collection('payments');
  expect(collection).toBeDefined();
  expect(collection.add).toBeDefined();
});

// Test document operations
test('should update document', async () => {
  const doc = firestoreDb.collection('payments').doc('pay_123');
  await doc.update({ status: 'completed' });
  
  expect(doc.update).toHaveBeenCalledWith({
    status: 'completed'
  });
});

// Test queries
test('should query with where', async () => {
  const result = await firestoreDb
    .collection('payments')
    .where('status', '==', 'pending')
    .get();
  
  expect(result.docs).toHaveLength(1);
});
```

## References

- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [Firebase Admin SDK](https://firebase.google.com/docs/reference/admin)
