import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import globals from 'globals' ;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    ignores: ['**/dist/**', '**/build/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json'
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.browser
      }
    },
    
    plugins: {
      '@typescript-eslint': typescript
    },
    
    rules: {
      // Catch undefined variables like __dirname
      'no-undef': 'error',
      
      // TypeScript specific rules
      ...typescript.configs.recommended.rules,

      "@typescript-eslint/no-explicit-any": ["off"],

      // Additional rules to catch CommonJS in ES modules
      'no-restricted-globals': [
        'error',
        {
          name: '__dirname',
          message: 'Use import.meta.url instead of __dirname in ES modules'
        },
        {
          name: '__filename', 
          message: 'Use import.meta.url instead of __filename in ES modules'
        },
        {
          name: 'require',
          message: 'Use import instead of require in ES modules'
        },
        {
          name: 'exports',
          message: 'Use export instead of exports in ES modules'
        },
        {
          name: 'module',
          message: 'module is not available in ES modules'
        }
      ]
    }
  },
  
  {
    // JavaScript files configuration (if you have any)
    files: ['**/*.js', '**/*.jsx'],
    
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    
    rules: {
      'no-undef': 'error',
      'no-restricted-globals': [
        'error',
        {
          name: '__dirname',
          message: 'Use import.meta.url instead of __dirname in ES modules'
        },
        {
          name: '__filename',
          message: 'Use import.meta.url instead of __filename in ES modules'
        },
        {
          name: 'require',
          message: 'Use import instead of require in ES modules'
        }
      ]
    }
  }
];