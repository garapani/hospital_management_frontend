module.exports = {
  displayName: 'staff-console',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: 'test-output/jest/coverage',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  // .mjs carve-out covers most ESM-only deps; @noble/ed25519 (pulled in transitively via
  // primeng's @primeui/license-manager) ships plain .js files using ESM `export` syntax, so it
  // needs its own carve-out too.
  transformIgnorePatterns: ['node_modules/(?!.*(\\.mjs$|@noble))'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
