module.exports = {
  root: false,
  env: {
    node: true,
    es2022: true,
    commonjs: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs'
  },
  globals: {
    process: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    Buffer: 'readonly',
    console: 'readonly',
    module: 'writable',
    require: 'readonly',
    exports: 'writable',
    global: 'readonly'
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-useless-catch': 'off'
  }
};