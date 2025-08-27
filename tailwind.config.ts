import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./client/**/*.{ts,tsx}",
    "./public/**/*.html"
  ],
  prefix: "",
  // Performance optimizations
  corePlugins: {
    // Disable unused core plugins for better performance
    preflight: true,
    container: true,
    accessibility: false, // Enable only if needed
    backdropBlur: true,
    backdropBrightness: false,
    backdropContrast: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropOpacity: true,
    backdropSaturate: false,
    backdropSepia: false
  },
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
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        // Performance optimized animations
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-10px)" }
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" }
        },
        "slide-down": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" }
        },
        "zoom-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "zoom-in": "zoom-in 0.2s ease-out",
        "shimmer": "shimmer 2s infinite"
      },
      // Performance utilities
      willChange: {
        'transform-opacity': 'transform, opacity',
        'scroll': 'scroll-position'
      },
      contain: {
        'layout': 'layout',
        'style': 'style', 
        'paint': 'paint',
        'size': 'size',
        'strict': 'strict'
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Performance optimization plugin
    function({ addUtilities, addComponents, theme }) {
      // GPU acceleration utilities
      addUtilities({
        '.gpu': {
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px'
        },
        '.hardware-accelerate': {
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform'
        },
        // Optimized scrolling
        '.smooth-scroll': {
          '-webkit-overflow-scrolling': 'touch',
          'scroll-behavior': 'smooth',
          'overscroll-behavior': 'contain'
        },
        // Memory efficient transforms
        '.transform-3d': {
          transform: 'translate3d(0, 0, 0)'
        },
        // Performance containment
        '.contain-layout': {
          contain: 'layout'
        },
        '.contain-style': {
          contain: 'style'
        },
        '.contain-paint': {
          contain: 'paint'
        },
        '.contain-strict': {
          contain: 'strict'
        }
      });
      
      // High-performance components
      addComponents({
        '.glassmorphism': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: theme('borderRadius.lg')
        },
        '.shimmer-effect': {
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            animation: 'shimmer 2s infinite'
          }
        }
      });
    }
  ],
  // Experimental features for better performance
  experimental: {
    optimizeUniversalDefaults: true
  },
} satisfies Config;

// Development mode optimizations
if (process.env.NODE_ENV === 'development') {
  // Only include commonly used utilities in dev
  (module.exports as Config).safelist = [
    'bg-white/5',
    'bg-black/10',
    'backdrop-blur-sm',
    'backdrop-blur-md',
    'backdrop-blur-lg',
    'border-white/10',
    'text-white',
    'text-gray-400',
    'hover:bg-white/5',
    'animate-pulse',
    'animate-spin',
    'glassmorphism'
  ];
}
