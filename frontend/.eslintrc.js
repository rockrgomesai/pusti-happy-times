module.exports = {
  extends: ['next/core-web-vitals', 'next/typescript'],
  ignorePatterns: [
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'create-demo-users.js',
    'update-passwords.js',
    'fix-passwords.js',
    'generate-passwords.js',
  ],
};
