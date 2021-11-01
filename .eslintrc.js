// https://github.com/eslint-plugin-promise@^5.0.0 typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/README.md

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    '@typescript-eslint/no-empty-function': 0,
  },
};

// module.exports = {
//   extends: ['standard-with-typescript', 'prettier'],
//   parserOptions: {
//     project: './tsconfig.json',
//   },
//   rules: {
//     '@typescript-eslint/explicit-function-return-type': 1,
//     '@typescript-eslint/strict-boolean-expressions': 1,
//     '@typescript-eslint/prefer-readonly': 0,
//     '@typescript-eslint/array-type': 1,
//     '@typescript-eslint/no-non-null-assertion': 0,
//   },
// };
