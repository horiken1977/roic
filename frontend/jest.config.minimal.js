const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

// Minimal Jest config for CI
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  testTimeout: 10000,
  maxWorkers: 1,
  forceExit: true,
  passWithNoTests: true,
  bail: true,
  verbose: false,
  silent: true,
}

module.exports = createJestConfig(customJestConfig)