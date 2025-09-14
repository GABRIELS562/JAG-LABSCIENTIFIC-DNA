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
    // Performance optimizations for production deployment
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Enhanced chunk splitting to prevent circular dependencies
        manualChunks(id) {
          // React core - highest priority
          if (id.includes('react') && !id.includes('react-router') && !id.includes('react-chartjs')) {
            return 'react-core';
          }

          // React Router - separate to prevent conflicts
          if (id.includes('react-router')) {
            return 'react-router';
          }

          // MUI components - group together for consistency
          if (id.includes('@mui/material') || id.includes('@mui/icons-material')) {
            return 'mui-components';
          }

          // Emotion styling - keep with MUI
          if (id.includes('@emotion')) {
            return 'mui-components';
          }

          // Chart libraries - separate due to size
          if (id.includes('recharts') || id.includes('chart.js') || id.includes('react-chartjs')) {
            return 'charts';
          }

          // Radix UI components
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }

          // Table components
          if (id.includes('@tanstack')) {
            return 'tanstack';
          }

          // Heavy utilities and libraries
          if (id.includes('tesseract.js') || id.includes('xlsx')) {
            return 'heavy-libs';
          }

          // Icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }

          // Utility libraries
          if (id.includes('date-fns') || id.includes('file-saver') ||
              id.includes('clsx') || id.includes('class-variance-authority') ||
              id.includes('tailwind-merge')) {
            return 'utils';
          }

          // Node modules default
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimized file naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId && facadeModuleId.includes('src/components/')) {
            return 'assets/components/[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
        entryFileNames: 'assets/entry-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          if (/css/i.test(ext)) {
            return 'assets/css/[name]-[hash].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      },
      // Prevent circular dependencies
      external: [],
      onwarn(warning, warn) {
        // Skip certain warnings
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          if (warning.message.includes('node_modules')) {
            return; // Ignore circular dependencies in node_modules
          }
        }
        warn(warning);
      }
    },
    // Optimize chunk size warning
    chunkSizeWarningLimit: 1000, // Increased for better performance
    // Environment-specific source maps
    sourcemap: process.env.NODE_ENV === 'development' ? true : false,
    // Asset optimization
    assetsInlineLimit: 8192, // Increased for better performance
    // CSS code splitting
    cssCodeSplit: true,
    // Report compressed size
    reportCompressedSize: false, // Disable for faster builds
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
