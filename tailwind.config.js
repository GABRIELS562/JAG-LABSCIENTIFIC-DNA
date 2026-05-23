/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Lab Mode - Primary palette
        primary: {
          DEFAULT: '#00d4ff',
          50: '#e6fbff',
          100: '#ccf7ff',
          200: '#99efff',
          300: '#66e7ff',
          400: '#33dfff',
          500: '#00d4ff',
          600: '#00a8cc',
          700: '#007c99',
          800: '#005066',
          900: '#002433',
        },
        // Neon green/cyan secondary
        secondary: {
          DEFAULT: '#00ff88',
          50: '#e6fff2',
          100: '#ccffe6',
          200: '#99ffcc',
          300: '#66ffb3',
          400: '#33ff99',
          500: '#00ff88',
          600: '#00cc6d',
          700: '#009952',
          800: '#006636',
          900: '#00331b',
        },
        // Accent purple for DNA theme
        accent: {
          DEFAULT: '#a855f7',
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        // Dark backgrounds
        dark: {
          DEFAULT: '#0a0a0f',
          50: '#1a1a2e',
          100: '#16162a',
          200: '#12121f',
          300: '#0e0e18',
          400: '#0a0a12',
          500: '#08080e',
          600: '#06060a',
          700: '#040406',
          800: '#020203',
          900: '#000000',
        },
        // Surface colors for cards/panels
        surface: {
          DEFAULT: '#1a1a2e',
          light: '#252542',
          dark: '#12121f',
          border: '#2a2a4a',
        },
        // Gray scale for dark mode
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#0a0a0f',
        },
        // Semantic colors
        success: '#00ff88',
        warning: '#fbbf24',
        error: '#ef4444',
        info: '#00d4ff',

        background: '#0a0a0f',
        foreground: '#e5e7eb',
        muted: '#6b7280',
        border: '#2a2a4a',
        input: '#1a1a2e',
        ring: '#00d4ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0, 212, 255, 0.3)',
        'neon-lg': '0 0 40px rgba(0, 212, 255, 0.4)',
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'glow': '0 0 15px rgba(0, 212, 255, 0.2), 0 0 30px rgba(0, 212, 255, 0.1)',
        'inner-glow': 'inset 0 0 20px rgba(0, 212, 255, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-dark': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
        'gradient-surface': 'linear-gradient(135deg, #1a1a2e 0%, #252542 100%)',
        'gradient-neon': 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
        'gradient-purple': 'linear-gradient(135deg, #a855f7 0%, #00d4ff 100%)',
        'mesh-pattern': 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.03) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(0, 255, 136, 0.03) 0%, transparent 50%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(0, 212, 255, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
