import js from '@eslint/js';
import tsPlugin from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  // Configuration pour les fichiers de config JS
  {
    files: ['*.config.js', 'next.config.js', 'check-node.js'],
    languageOptions: {
      globals: {
        module: 'writable',
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        exports: 'writable',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      next: nextPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Règles React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Règles Next.js pour App Router
      'next/no-html-link-for-pages': 'error',
      'next/no-head-element': 'error',
      'next/no-page-custom-font': 'error',
      'next/no-sync-scripts': 'error',
      'next/no-img-element': 'warn',
      
      // Désactiver temporairement les règles trop strictes pour le développement
      '@typescript-eslint/no-explicit-any': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'dist/**',
      'build/**',
      'node_modules/**/*.d.ts',
    ],
  },
]; 