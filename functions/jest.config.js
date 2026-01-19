// functions/jest.config.js
module.exports = {
  displayName: 'functions',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.js'],
  // Exclude integration tests from default run (they need emulator)
  testPathIgnorePatterns: process.env.FIRESTORE_EMULATOR_HOST ? [] : ['/integration\\.'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config.js',
    '!src/**/*.config.js',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Only setup mocks for unit tests, not integration tests
  setupFiles: process.env.FIRESTORE_EMULATOR_HOST ? [] : ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000,
  verbose: true,
  bail: false,
  clearMocks: true,
  resetMocks: false,  // Don't reset mocks, just clear call history
  restoreMocks: true,
};
