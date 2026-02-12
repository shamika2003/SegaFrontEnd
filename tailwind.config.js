module.exports = {
  darkMode: "class", 
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}", // must include tsx
  ],
  theme: {
    extend: {},
  },
    plugins: [
    require("@headlessui/tailwindcss"),
    require("@tailwindcss/typography"),
  ],
};
