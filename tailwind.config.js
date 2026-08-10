/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        charcoal: "#180c04",
        parchment: "#f0ecd7",
        cream: "#fcfaee",
        espresso: "#180c04",
        gold: "#938977",
        /* 长卷主站色板（scroll） */
        paper: {
          DEFAULT: "#F0E7D3",
          deep: "#E6D9BE",
          "on-dark": "#EFE4CB",
        },
        ink: {
          DEFAULT: "#2A1E14",
          soft: "#5B4632",
        },
        umber: {
          DEFAULT: "#3E2C1D",
          deep: "#241810",
        },
        cinnabar: {
          DEFAULT: "#A83A2A",
          deep: "#7E2A1E",
        },
        ochre: "#A9803E",
        "gold-leaf": "#C9A35B",
        plum: "#C98D92",
        "plum-deep": "#A96B70",
        mist: "#8A8577",
        river: "#4E5A5E",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        brush: ["'Ma Shan Zheng'", "'KaiTi'", "'STKaiti'", "serif"],
        serif: ["'Noto Serif SC'", "'Songti SC'", "serif"],
        latin: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        brush: "0.12em",
        verse: "0.18em",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        subtle: "0px 2px 10px -3px rgba(168, 142, 113, 0.2)",
        elevated: "0px 8px 10px 0px rgba(168, 142, 113, 0.2)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
