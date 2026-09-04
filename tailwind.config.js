/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clinic: {
          bg: "#0b0f19",
          card: "rgba(17, 24, 39, 0.75)",
          cardHover: "rgba(31, 41, 55, 0.85)",
          border: "rgba(255, 255, 255, 0.08)",
          subtle: "rgba(255, 255, 255, 0.04)",
        },
        brand: {
          primary: "#4f46e5",
          light: "#6366f1",
          teal: "#06b6d4",
          dark: "#3730a3",
        },
        status: {
          requested: "#f59e0b",
          confirmed: "#3b82f6",
          checkedin: "#10b981",
          completed: "#8b5cf6",
          noshow: "#ef4444",
          cancelled: "#64748b",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 25px rgba(99, 102, 241, 0.25)",
        "glow-cyan": "0 0 25px rgba(6, 182, 212, 0.2)",
        "glow-red": "0 0 25px rgba(244, 63, 94, 0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out forwards",
        "slide-left": "slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-right": "slideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-subtle": "pulseSubtle 2s infinite ease-in-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideLeft: {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideRight: {
          from: { opacity: "0", transform: "translateX(-100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.96)" },
        },
      },
    },
  },
  plugins: [],
};
