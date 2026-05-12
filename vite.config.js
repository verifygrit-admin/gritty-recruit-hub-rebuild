import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.js',
      'tests/unit/**/*.test.jsx',
      'tests/integration/**/*.test.js',
    ],
    setupFiles: ['tests/setup.js'],
  },
});
