/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        turkey: {
          50: '#fdf2f2',
          100: '#fce7e7',
          200: '#f9d0d0',
          300: '#f4a9a9',
          400: '#ec7878',
          500: '#e04e4e',
          600: '#cd3333',
          700: '#ab2727',
          800: '#8d2424',
          900: '#762424',
          950: '#3f0d0d',
        },
      },
    },
  },
  plugins: [],
};
