import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  fetch: 'readonly',
  FileReader: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
}

const nodeGlobals = {
  process: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  console: 'readonly',
  __dirname: 'readonly',
}

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: browserGlobals,
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-refresh/only-export-components': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    // Fichiers Node : plugin Vite, scripts, config
    files: ['plugins/**/*.js', 'scripts/**/*.{js,mjs}', '*.config.js', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
]
