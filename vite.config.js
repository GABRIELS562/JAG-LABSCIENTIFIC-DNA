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
    target: 'esnext',
    minify: process.env.NODE_ENV === 'production' ? 'terser' : 'esbuild',
    rollupOptions: {
      output: {
        // Advanced code splitting strategy
        manualChunks(id) {
          // Core vendor libraries
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // Material-UI ecosystem
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui';
            }
            // Charts and visualization
            if (id.includes('recharts') || id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'charts';
            }
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'radix';
            }
            // TanStack ecosystem
            if (id.includes('@tanstack')) {
              return 'tanstack';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // Utility libraries
            if (id.includes('date-fns') || id.includes('file-saver') || id.includes('clsx') || id.includes('class-variance-authority')) {
              return 'utils';
            }
            // Heavy libraries that should be separate
            if (id.includes('tesseract.js')) {
              return 'tesseract';
            }
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            // Remaining vendor code
            return 'vendor';
          }
          
          // Feature-based chunking for app code
          if (id.includes('src/components/features/')) {
            const featurePath = id.split('src/components/features/')[1];
            const featureName = featurePath.split('/')[0].toLowerCase();
            return `feature-${featureName}`;
          }
          
          // Forms chunking
          if (id.includes('src/components/forms/')) {
            return 'forms';
          }
          
          // UI components chunking
          if (id.includes('src/components/ui/')) {
            return 'ui-components';
          }
          
          // Common components
          if (id.includes('src/components/common/')) {
            return 'common';
          }
        },
      },
    },
    // Optimize chunk size warning
    chunkSizeWarningLimit: 500,
    // Disable source maps in production for smaller bundles
    sourcemap: process.env.NODE_ENV === 'development',
    // Asset optimization
    assetsInlineLimit: 4096,
    // Advanced Terser options for production
    terserOptions: process.env.NODE_ENV === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2,
        ecma: 2020,
        arguments: true,
        booleans: true,
        collapse_vars: true,
        comparisons: true,
        computed_props: true,
        conditionals: true,
        dead_code: true,
        evaluate: true,
        expression: true,
        hoist_funs: true,
        hoist_props: true,
        hoist_vars: false,
        if_return: true,
        join_vars: true,
        loops: true,
        negate_iife: true,
        properties: true,
        reduce_funcs: true,
        reduce_vars: true,
        sequences: true,
        side_effects: true,
        switches: true,
        typeofs: true,
        unused: true,
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
      },
    } : {},
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
