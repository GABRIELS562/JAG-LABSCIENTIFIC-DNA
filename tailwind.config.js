/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./labdna-public/src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LabDNA Design System Colors
        primary: 'rgb(var(--color-primary))',
        secondary: 'rgb(var(--color-secondary))',
        accent: 'rgb(var(--color-accent))',
        
        // Background colors
        'bg-primary': 'rgb(var(--color-background-primary))',
        'bg-secondary': 'rgb(var(--color-background-secondary))',
        
        // Text colors
        'text-primary': 'rgb(var(--color-text-primary))',
        'text-secondary': 'rgb(var(--color-text-secondary))',
        
        // Pink palette
        pink: {
          50: 'rgb(var(--color-pink-light))',
          500: 'rgb(var(--color-pink-primary))',
          600: 'rgb(var(--color-pink-medium))',
          700: 'rgb(var(--color-pink-dark))',
          900: 'rgb(var(--color-pink-darker))',
        },
        
        // Cyan palette
        cyan: {
          50: 'rgb(var(--color-cyan-light))',
          500: 'rgb(var(--color-cyan))',
          600: 'rgb(var(--color-cyan-medium))',
          700: 'rgb(var(--color-cyan-dark))',
          900: 'rgb(var(--color-cyan-darker))',
        },
        
        // Gray palette
        gray: {
          50: 'rgb(var(--color-gray-lightest))',
          100: 'rgb(var(--color-light-blue))',
          200: 'rgb(var(--color-light-gray))',
          400: 'rgb(var(--color-medium-gray))',
          600: 'rgb(var(--color-dark-medium-gray))',
          800: 'rgb(var(--color-dark-gray))',
          900: 'rgb(var(--color-black))',
        }
      },
      fontFamily: {
        sans: ['Inter', 'HelveticaNeue', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)',
      },
      borderRadius: {
        'sm': 'var(--border-radius-sm)',
        'md': 'var(--border-radius-md)',
        'lg': 'var(--border-radius-lg)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      },
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'normal': 'var(--transition-normal)',
        'slow': 'var(--transition-slow)',
      },
      maxWidth: {
        'container': 'var(--section-max-width)',
      },
      spacing: {
        'container': 'var(--container-padding)',
      }
    },
  },
  plugins: [],
};
