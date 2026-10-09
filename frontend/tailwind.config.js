/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        signal: {
          blue: '#2c6bed',
          'blue-hover': '#2058cb',
          'blue-light': '#ebf2fe',
          dark: '#121212',
          'dark-surface': '#1c1c1e',
          'dark-sidebar': '#18181a',
          'dark-bubble-in': '#2c2c2e',
          'dark-border': '#2c2c2e',
          'light-bubble-in': '#e9e9eb',
          'light-sidebar': '#f8f9fa',
          'light-border': '#e5e7eb',
        }
      }
    },
  },
  plugins: [],
}

