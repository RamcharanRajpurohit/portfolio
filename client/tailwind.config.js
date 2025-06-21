/** @type {import('tailwindcss').Config} */
module.exports ={
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
theme: {
  extend: {
    backgroundColor: {
      base: 'rgb(var(--bg) / <alpha-value>)',
      btnp: 'rgb(var(--btn-bg) / <alpha-value>)',
      primary: 'rgb(var(--btn) / <alpha-value>)',
      secondary: 'rgb(var(--secondary) / <alpha-value>)',
      tertiary: 'rgb(var(--tertiary) / <alpha-value>)',
    },
    textColor: {
      base: 'rgb(var(--text) / <alpha-value>)',
      heading: 'rgb(var(--headline) / <alpha-value>)',
      paragraph: 'rgb(var(--paragraph) / <alpha-value>)',
      btn: 'rgb(var(--btn-text) / <alpha-value>)',
      highlight: 'rgb(var(--highlight) / <alpha-value>)',
      secondary: 'rgb(var(--secondary) / <alpha-value>)',
    },
    borderColor: {
      stroke: 'rgb(var(--stroke) / <alpha-value>)',
    },
    screens:{
      wrap:'900px',// new break point
    }
  }
}

}
