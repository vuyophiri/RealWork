import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the React frontend
// Configures React plugin and test environment settings
export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for DOM simulation in tests
    environment: 'jsdom',
    // Setup file for test configuration
    setupFiles: './src/tests/setupTests.js',
    // Enable global test functions (describe, it, expect)
    globals: true
  }
})
