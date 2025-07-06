// tests/setup/consoleSuppression.js
// Suppress console warnings and errors during tests

const originalWarn = console.warn;
const originalError = console.error;

// Suppress specific warnings
console.warn = (...args) => {
  const message = args[0];
  
  // Suppress EXPO_OS warnings
  if (typeof message === 'string' && message.includes('EXPO_OS is not defined')) {
    return;
  }
  
  // Suppress other common warnings you want to ignore
  if (typeof message === 'string' && message.includes('babel-preset-expo')) {
    return;
  }
  
  // Allow other warnings to pass through
  originalWarn(...args);
};

// Suppress specific errors
console.error = (...args) => {
  const message = args[0];
  
  // Suppress expected error messages from tests
  if (typeof message === 'string' && message.includes('Error assigning route:')) {
    return;
  }
  
  // Allow other errors to pass through
  originalError(...args);
}; 