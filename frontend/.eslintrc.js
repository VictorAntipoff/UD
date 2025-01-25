module.exports = {
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', {
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_'
    }]
  }
}; 