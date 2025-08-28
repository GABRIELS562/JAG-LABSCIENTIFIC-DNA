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
        primary: {
          DEFAULT: '#0D488F',
          50: '#EBF4FF',
          100: '#DBF1FC',
          500: '#0D488F',
          600: '#0A3D7A',
          700: '#083366',
          800: '#062852',
          900: '#041D3E'
        },
        secondary: {
          DEFAULT: '#8EC74F',
          50: '#F7FCF0',
          100: '#ECF7E1',
          500: '#8EC74F',
          600: '#7BB33E',
          700: '#689F2D',
          800: '#558B1C',
          900: '#42770B'
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0B0F19'
        },
        background: '#F5F5F5',
        foreground: '#1A1A1A',
        muted: '#6B7280',
        border: '#E5E7EB',
        input: '#E5E7EB',
        ring: '#0D488F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionProperty: {
        'colors': 'color, background-color, border-color, text-decoration-color, fill, stroke',
      },
      transitionDuration: {
        '300': '300ms',
      },
    },
  },
  plugins: [],
};
