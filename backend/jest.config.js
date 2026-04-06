/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // setupFiles runs before Jest is initialized (no globals) — env vars only
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  // setupFilesAfterFramework runs after Jest is initialized — jest.mock() is valid here
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupAfterFramework.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/database/**',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
