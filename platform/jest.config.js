module.exports = {
  projects: [
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/tests/unit/backend/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.ts']
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/tests/unit/frontend/**/*.test.{js,ts,tsx}'],
      preset: 'jest-expo',
      setupFilesAfterEnv: [
        '@testing-library/jest-native/extend-expect',
        '<rootDir>/tests/setup/frontend.ts'
      ],
      moduleNameMapping: {
  '^@/(.*)$': '<rootDir>/app/$1'
}
    }
  ],}