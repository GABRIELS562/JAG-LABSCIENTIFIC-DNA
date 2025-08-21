// Minimal ESLint config for CI/CD - focuses on critical errors only
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'no-empty': 'off',
    'no-useless-escape': 'off',
    'no-unreachable': 'error',
    'no-debugger': 'error'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};