/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0e1117",
        surface: "#161b22",
        greenCandle: "#00ff7f",
        redCandle: "#ff4c4c",
      },
    },
  },
  plugins: [],
}
