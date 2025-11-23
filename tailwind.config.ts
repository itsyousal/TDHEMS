// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        // Brand Colors - Bakery themed
        "dough-brown": {
          50: "#F9F7F5",
          100: "#F3EFEB",
          200: "#E7DFD7",
          300: "#DBCFC3",
          400: "#CFBFAF",
          500: "#8B4513", // Primary: Saddle Brown
          600: "#654321", // Primary Dark
          700: "#4A3218",
          800: "#3D2815",
          900: "#301F0D",
        },

        "gold-accent": {
          50: "#FFFBF0",
          100: "#FFF7E0",
          200: "#FFEFCC",
          300: "#FFE79D",
          400: "#FFDF6E",
          500: "#FFD700", // Secondary: Gold
          600: "#DAA520", // Secondary Dark
          700: "#B8922E",
          800: "#8B7530",
          900: "#6B5B2D",
        },

        // Semantic Colors
        "semantic-success": "#10B981",
        "semantic-warning": "#F59E0B",
        "semantic-error": "#EF4444",
        "semantic-info": "#3B82F6",

        // Neutral Palette
        "neutral-bg": "#FFFFFF",
        "neutral-surface": "#F9FAFB",
        "neutral-border": "#E5E7EB",
        "neutral-muted": "#9CA3AF",
        "neutral-text-primary": "#111827",
        "neutral-text-secondary": "#6B7280",

        // Dark Mode (optional future use)
        "dark-bg": "#0F172A",
        "dark-surface": "#1E293B",
        "dark-border": "#334155",
        "dark-text-primary": "#F1F5F9",
      },

      typography: {
        DEFAULT: {
          css: {
            color: "#111827",
            a: {
              color: "#8B4513",
              "&:hover": {
                color: "#654321",
              },
            },
          },
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        // Type Scale
        "display-lg": ["2.25rem", { lineHeight: "2.5rem", fontWeight: "700" }], // Heading 1
        "display-md": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "600" }], // Heading 2
        "display-sm": ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }], // Heading 3
        "heading-lg": ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }], // Heading 4
        "heading-md": ["1.125rem", { lineHeight: "1.75rem", fontWeight: "600" }], // Heading 5
        "body-lg": ["1rem", { lineHeight: "1.5rem", fontWeight: "400" }], // Body Large
        "body-base": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }], // Body
        "body-sm": ["0.75rem", { lineHeight: "1rem", fontWeight: "400" }], // Body Small
        "caption": ["0.75rem", { lineHeight: "1rem", fontWeight: "500", letterSpacing: "0.05em", textTransform: "uppercase" }],
      },

      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "3rem",
        "3xl": "4rem",
      },

      borderRadius: {
        "xs": "0.25rem",
        "sm": "0.375rem", // 6px
        "md": "0.5rem", // 8px
        "lg": "0.75rem",
        "xl": "1rem",
      },

      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      },

      animation: {
        slideIn: "slideIn 150ms ease-out",
        slideOut: "slideOut 150ms ease-in",
        fadeIn: "fadeIn 150ms ease-out",
        fadeOut: "fadeOut 150ms ease-in",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        bounce: "bounce 1s infinite",
      },

      keyframes: {
        slideIn: {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        slideOut: {
          from: { transform: "translateX(0)", opacity: "1" },
          to: { transform: "translateX(100%)", opacity: "0" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".5" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-25%)" },
        },
      },

      maxWidth: {
        container: "1920px",
      },

      gridTemplateColumns: {
        "12": "repeat(12, minmax(0, 1fr))",
      },

      transitionDuration: {
        150: "150ms",
        200: "200ms",
        300: "300ms",
      },

      transitionTimingFunction: {
        "ease-out": "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },

  plugins: [
    require("@tailwindcss/typography"),
  ],

  safelist: [
    // Status colors
    { pattern: /^(bg|text|border)-(semantic-(success|warning|error|info))$/ },
    // Grid columns
    { pattern: /^grid-cols-(1|2|3|4|6|12)$/ },
    // Common patterns
    { pattern: /^(p|m|w|h)-\d+$/ },
  ],
};

export default config;
