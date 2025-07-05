import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Performance optimizations
    target: 'esnext',
    minify: 'esbuild', // Use esbuild instead of terser for now
    rollupOptions: {
      output: {
        // Code splitting for better performance
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          utils: ['axios', 'recharts', 'chart.js'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging (optional)
    sourcemap: false,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // Development optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@mui/icons-material'],
  },
});
