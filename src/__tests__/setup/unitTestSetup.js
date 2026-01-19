/**
 * Setup file for unit tests (Redux only, no Firebase needed)
 * This is imported before unit tests to skip Firebase setup
 */

// Suppress console warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

global.console.warn = (...args) => {
  if (
    args[0]?.includes?.('Firebase') ||
    args[0]?.includes?.('@firebase')
  ) {
    return; // Suppress Firebase warnings
  }
  originalWarn.call(console, ...args);
};

global.console.error = (...args) => {
  if (
    args[0]?.includes?.('Firebase') ||
    args[0]?.includes?.('@firebase')
  ) {
    return; // Suppress Firebase errors
  }
  originalError.call(console, ...args);
};
