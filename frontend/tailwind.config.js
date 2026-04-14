/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Surface backgrounds (light theme)
        surface: {
          0: '#FAFBFE',
          1: '#FFFFFF',
          2: '#F1F5F9',
          3: '#E8ECF4',
        },
        // Ink (text)
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Aurora palette
        aurora: {
          purple: '#8B5CF6',
          indigo: '#6366F1',
          cyan: '#06B6D4',
          teal: '#14B8A6',
          pink: '#EC4899',
          rose: '#F43F5E',
          gold: '#F59E0B',
          amber: '#EAB308',
        },
        // Semantic (preserved + enhanced)
        accent: {
          50: '#eef2ff',
          100: '#e0e7ff',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 20px 40px -10px rgba(0,0,0,0.06)',
        'card-hover': '0 1px 3px rgba(0,0,0,0.04), 0 30px 60px -10px rgba(0,0,0,0.12)',
        'accent': '0 8px 32px -4px rgba(99, 102, 241, 0.35)',
        'float': '0 32px 64px -12px rgba(15, 23, 42, 0.12)',
        'glow-purple': '0 0 20px -4px rgba(139, 92, 246, 0.3)',
        'glow-cyan': '0 0 20px -4px rgba(6, 182, 212, 0.3)',
        'glow-pink': '0 0 20px -4px rgba(236, 72, 153, 0.3)',
        'glow-gold': '0 0 20px -4px rgba(245, 158, 11, 0.3)',
        'glass': '0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
        'sidebar': '4px 0 24px -2px rgba(0,0,0,0.04)',
      },
      backdropBlur: {
        '2xl': '40px',
        '3xl': '64px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'aurora-1': 'auroraFloat 12s ease-in-out infinite',
        'aurora-2': 'auroraFloat2 15s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.3s ease both',
        'slide-in-left': 'slideInLeft 0.4s ease both',
        'scale-in': 'scaleIn 0.3s ease both',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'gradient': 'gradientShift 4s ease infinite',
      },
    },
  },
  plugins: [],
}
