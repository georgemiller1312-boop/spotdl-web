/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#E6E1F7",
          deep: "#D6CEEF",
          surface: "#EFEBFB",
          ink: "#2B2440",
          soft: "#6E6590",
        },
        pine: {
          DEFAULT: "#2F6B4F",
          light: "#3E8965",
          dark: "#234F3A",
        },
        coral: {
          DEFAULT: "#FF6B5B",
          light: "#FF8C7F",
          dark: "#E1503F",
        },
        gold: "#E8A93B",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        "clay-raised": "9px 9px 18px #C4BADD, -9px -9px 18px #FFFFFF",
        "clay-raised-sm": "5px 5px 10px #C4BADD, -5px -5px 10px #FFFFFF",
        "clay-pressed": "inset 4px 4px 8px #C4BADD, inset -4px -4px 8px #FFFFFF",
        "clay-pressed-sm": "inset 3px 3px 6px #C4BADD, inset -3px -3px 6px #FFFFFF",
        "clay-pine": "9px 9px 18px #1E4A36, -9px -9px 18px #3F8B66",
        "clay-pine-pressed": "inset 4px 4px 8px #1E4A36, inset -4px -4px 8px #3F8B66",
      },
      borderRadius: {
        clay: "1.75rem",
        "clay-sm": "1.1rem",
      },
    },
  },
  plugins: [],
};
