/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255,252,248,0.40)',
          dark: 'rgba(18,15,25,0.50)',
        },
        accent: {
          DEFAULT: '#d2691e',
          soft: '#f4a460',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease forwards',
        'slide-up': 'slideUp 0.6s ease forwards',
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        'marquee': 'marquee 20s linear infinite',
        'gradient-move': 'gradientMove 15s ease infinite',
        'firefly-breathe': 'fireflyBreathe 3s ease-in-out infinite',
        'float-1': 'float1 20s ease-in-out infinite',
        'float-2': 'float2 25s ease-in-out infinite',
        'float-3': 'float3 22s ease-in-out infinite',
        'float-4': 'float4 28s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatSlow: {
          '0%,100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-30px) translateX(15px)' },
        },
        gradientMove: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fireflyBreathe: {
          '0%, 100%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        float1: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(10vw, -15vh)' },
          '66%': { transform: 'translate(-5vw, -20vh)' },
        },
        float2: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(-12vw, 10vh)' },
          '66%': { transform: 'translate(8vw, 15vh)' },
        },
        float3: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(15vw, 15vh)' },
          '66%': { transform: 'translate(-10vw, 5vh)' },
        },
        float4: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(-15vw, -10vh)' },
          '66%': { transform: 'translate(10vw, -15vh)' },
        },
      },
    },
  },
  plugins: [],
}
