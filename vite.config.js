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
        // Fixed chunk splitting to ensure React ecosystem coherence
        manualChunks: {
          // Core React - Must be loaded first, contains all React hooks
          'react-core': ['react', 'react-dom'],

          // React ecosystem - Depends on react-core
          'react-ecosystem': [
            'react-router-dom',
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
            '@radix-ui/react-dialog',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@tanstack/react-table',
            'lucide-react'
          ],

          // Charts - Heavy libraries
          'charts': ['recharts', 'chart.js', 'react-chartjs-2'],

          // Heavy utilities
          'heavy-libs': ['tesseract.js', 'xlsx'],

          // Utilities
          'utils': ['date-fns', 'file-saver', 'clsx', 'class-variance-authority', 'tailwind-merge']
        },
        // Stable chunk naming for reliable loading
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId && facadeModuleId.includes('src/components/')) {
            return `assets/components/[name]-[hash].js`;
          }
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: `assets/entry-[hash].js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash].[ext]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash].[ext]`;
          }
          return `assets/[name]-[hash].[ext]`;
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
    // Build-time constants for cache invalidation
    define: {
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
      __BUILD_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
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
