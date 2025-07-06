// jest.integration.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts', '<rootDir>/tests/setup/consoleSuppression.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '\\.(css|less)$': '<rootDir>/tests/__mocks__/styleMock.js',
    '^react-native/Libraries/Animated/NativeAnimatedHelper$': '<rootDir>/tests/mocks/NativeAnimatedHelper.ts'
  },
  moduleDirectories: ['node_modules', 'tests/mocks'],
  testMatch: ['**/tests/integration/**/*.test.[jt]s?(x)'],
  testTimeout: 10000, // Integration tests might need more time
  verbose: true,
  // Suppress console warnings and errors during tests
  silent: false
}; 