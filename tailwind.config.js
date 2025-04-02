/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#2B3141",
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#C4A962",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#343D54",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#FF5757",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#4A5369",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#C4A962",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#2B3141",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#343D54",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 