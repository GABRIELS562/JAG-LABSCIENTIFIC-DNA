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
      // Force React to resolve to a single instance
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom")
    },
    // Ensure .jsx extensions are resolved
    extensions: ['.mjs', '.js', '.jsx', '.json', '.ts', '.tsx']
  },
  build: {
    // Performance optimizations for production deployment
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Use ES modules for proper React handling
        format: 'es',
        // Critical: Proper chunk splitting to ensure React loads first
        manualChunks: {
          // React MUST be in its own chunk that loads before anything else
          'react-core': ['react', 'react-dom', 'react/jsx-runtime'],
          // UI libraries that depend on React
          'ui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // Other React ecosystem
          'react-libs': ['react-router-dom', '@tanstack/react-table', 'lucide-react'],
          // Charts
          'charts': ['recharts', 'chart.js', 'react-chartjs-2'],
          // Heavy libraries
          'heavy': ['tesseract.js', 'xlsx']
        },
        // Ensure React core loads first
        chunkFileNames: (chunkInfo) => {
          // React core gets priority loading
          if (chunkInfo.name === 'react-core') {
            return `assets/00-[name]-[hash].js`;
          }
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: `assets/[name]-[hash].js`,
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
  // Development optimizations with explicit React handling
  optimizeDeps: {
    // Force pre-bundling of React to ensure single instance
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
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
    // Force React dependencies to be treated as ESM
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
});
