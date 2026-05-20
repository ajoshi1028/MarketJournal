/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0f",
          50: "#0e0e14",
          100: "#12121a",
          200: "#1a1a24",
          300: "#22222e",
          400: "#2a2a38",
        },
        accent: {
          DEFAULT: "#6366f1",
          light: "#818cf8",
          dark: "#4f46e5",
          glow: "rgba(99, 102, 241, 0.15)",
        },
        profit: { DEFAULT: "#22c55e", muted: "rgba(34, 197, 94, 0.15)" },
        loss: { DEFAULT: "#ef4444", muted: "rgba(239, 68, 68, 0.15)" },
      },
      fontFamily: {
        sans: [
          "var(--font-geist)",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "monospace",
        ],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.25)",
      },
    },
  },
  plugins: [],
};
