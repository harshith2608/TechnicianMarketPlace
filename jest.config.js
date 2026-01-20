module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.js',
    '<rootDir>/src/__tests__/setup/firebase-emulator-setup.js',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js',
    '!src/setupTests.js',
    '!src/__tests__/**',
  ],
  // Coverage thresholds - disabled for now, will enable as coverage improves
  // Recommended growth path: 5% → 10% → 15% → 25% → 40%
  // To enable thresholds, uncomment below and adjust values
  /*
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5,
    },
  },
  */
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js',
  ],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/.expo/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((react-native|@react-native-async-storage|@react-navigation|firebase|crypto-js|@babel)/)?)',
    'node_modules/expo',
  ],
  testTimeout: 30000, // Increased timeout for Firebase operations
  forceExit: true, // Force Jest to exit after tests (needed for gRPC connections)
  detectOpenHandles: false, // Don't detect open handles that gRPC leaves
};
