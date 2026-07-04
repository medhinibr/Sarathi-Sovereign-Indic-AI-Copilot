/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          slate: {
            50: "#f8fafc",
            100: "#f1f5f9",
            200: "#e2e8f0",
            700: "#334155",
            800: "#1e293b",
            900: "#0f172a",
            950: "#020617"
          },
          indigo: {
            DEFAULT: "#6366f1",
            dark: "#4f46e5",
            light: "#818cf8"
          },
          teal: {
            DEFAULT: "#0d9488",
            dark: "#0f766e",
            light: "#14b8a6"
          },
          amber: {
            DEFAULT: "#d97706",
            dark: "#b45309",
            light: "#f59e0b"
          }
        }
      }
    },
  },
  plugins: [],
}
