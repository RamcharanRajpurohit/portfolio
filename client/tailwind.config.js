/** @type {import('tailwindcss').Config} */
module.exports ={
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      backgroundColor: {
        base: 'rgb(var(--bg) / <alpha-value>)',
        btnp :'rgb(var(--btn-bg) / <alpha-value>)',
      },
      textColor: {
        base: 'rgb(var(--text) / <alpha-value>)',
      },

    },
  },
}
