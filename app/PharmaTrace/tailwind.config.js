/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy:   "#1A3A5C",
        blue:   "#2E6DA4",
        "blue-light": "#DCE6F0",
        bg:     "#F7F9FC",
        pharma: {
          green:  "#27AE60",
          red:    "#C0392B",
          orange: "#E67E22",
          purple: "#8E44AD",
        },
      },
    },
  },
  plugins: [],
};
