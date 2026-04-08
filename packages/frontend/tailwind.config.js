/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#fcf8ff',
          100: '#f3e6f9',
          200: '#e5ccf2',
          300: '#d1a7e7',
          400: '#b77cd8',
          500: '#9d56c5',
          600: '#8f40b8',
          700: '#753094',
          800: '#64297d',
          900: '#522076',
        },
        blue: {
          50: '#f6f7fb',
          100: '#eaedf5',
          200: '#d5dbe9',
          300: '#b2c0d8',
          400: '#8a9ec3',
          500: '#5c78bb',
          600: '#39548e',
          700: '#304778',
          800: '#283b63',
          900: '#233353',
        },
        cyan: {
          400: '#4fb2d3',
          500: '#2596be',
          600: '#1e7b9d',
          700: '#186481',
        }
      }
    },
  },
  plugins: [],
}