import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node', // Use node environment for performance tests
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 30000, // 30 seconds for performance tests
    hookTimeout: 10000, // 10 seconds for setup/teardown
    include: ['src/test/performance/**/*.test.ts'],
    exclude: [
      'node_modules/',
      'dist/',
      '.next/',
      'coverage/',
    ],
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/performance-results.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})