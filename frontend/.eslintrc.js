module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended'
  ],
  rules: {
    'no-restricted-imports': ['off'],
    '@typescript-eslint/no-explicit-any': ['off'],
    'react/react-in-jsx-scope': ['off']
  },
  ignorePatterns: ['dist', 'node_modules', '*.d.ts']
}; 