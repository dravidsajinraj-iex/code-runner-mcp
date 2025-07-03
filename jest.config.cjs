module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1.ts'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  testTimeout: 30000
};