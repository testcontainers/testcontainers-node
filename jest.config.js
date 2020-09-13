module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalTeardown: '<rootDir>/src/test-teardown.ts'
};