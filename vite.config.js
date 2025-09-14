import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - generates stats.html in root
    visualizer({
      filename: "bundle-analysis.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Performance optimizations
    target: 'es2015', // Changed from esnext for better compatibility
    minify: 'esbuild', // Use esbuild for both dev and prod to avoid terser issues
    rollupOptions: {
      output: {
        // Simplified chunk splitting to avoid circular dependencies
        manualChunks: {
          // Core React - must be loaded first
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // MUI and Emotion together to avoid initialization issues
          'mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // Charts libraries
          'charts': ['recharts', 'chart.js', 'react-chartjs-2'],
          // Radix UI components
          'radix': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-toast'],
          // Table components
          'tanstack': ['@tanstack/react-table'],
          // Icons
          'icons': ['lucide-react'],
          // Utilities
          'utils': ['date-fns', 'file-saver', 'clsx', 'class-variance-authority', 'tailwind-merge'],
          // Heavy libraries
          'tesseract': ['tesseract.js'],
          'xlsx': ['xlsx']
        },
        // Prevent vendor chunk from being too large
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
    },
    // Optimize chunk size warning
    chunkSizeWarningLimit: 500,
    // Disable source maps in production for smaller bundles
    sourcemap: process.env.NODE_ENV === 'development',
    // Asset optimization
    assetsInlineLimit: 4096,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    watch: {
      // Ignore backend and Osiris workspace files to prevent infinite reloads
      ignored: [
        '**/backend/**',
        '**/node_modules/**',
        '**/logs/**',
        '**/reports/**',
        '**/uploads/**',
        '**/*.log',
        '**/*.db',
        '**/*.db-*'
      ]
    },
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
    include: [
      'react', 
      'react-dom', 
      '@mui/material', 
      '@mui/icons-material',
      'react-router-dom',
      '@emotion/react',
      '@emotion/styled',
      'clsx',
      'date-fns'
    ],
    exclude: [
      // Exclude heavy libraries from pre-bundling
      'tesseract.js',
      'xlsx'
    ],
  },
});
