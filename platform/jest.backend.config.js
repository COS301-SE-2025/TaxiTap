// platform/jest.config.js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Only look for tests in platform/tests/unit/backend
  roots: ['<rootDir>/tests/unit/backend'],

  // Only match .test.ts files
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],

  // Transform TS → JS with ts-jest
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      useESM: true
    }]
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],

  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Transform node_modules that use ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(convex|@convex|@testing-library)/)'
  ],

  // Mock Convex generated files
  moduleNameMapper: {
    '^../../_generated/server$': '<rootDir>/tests/mocks/convex-server.ts',
    '^convex/values$': '<rootDir>/tests/mocks/convex-values.ts'
  }
};
