/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neu: {
          light: {
            bg: '#edf2f9',
            surface: '#ebf1f8',
            hover: '#e2ebf5',
            border: '#dbe4f0',
            text: '#2d3748',
            muted: '#718096',
            highlight: '#ffffff',
            shadow: '#c5d2e2'
          },
          dark: {
            bg: '#12151b',
            surface: '#181c24',
            hover: '#202530',
            border: '#2a313d',
            text: '#f1f5f9',
            muted: '#94a3b8',
            highlight: '#252b38',
            shadow: '#0d0f14'
          },
          accent: {
            orange: '#ff6a3d',
            amber: '#f59e0b',
            cyan: '#06b6d4',
            emerald: '#10b981',
            purple: '#8b5cf6',
            rose: '#f43f5e'
          }
        }
      },
      boxShadow: {
        // Light Neumorphism
        'neu-flat': '8px 8px 18px #c8d5e5, -8px -8px 18px #ffffff',
        'neu-sm': '4px 4px 10px #cad7e7, -4px -4px 10px #ffffff',
        'neu-lg': '14px 14px 28px #c2d0e2, -14px -14px 28px #ffffff',
        'neu-inset': 'inset 4px 4px 8px #c8d5e5, inset -4px -4px 8px #ffffff',
        'neu-inset-sm': 'inset 2px 2px 5px #cad7e7, inset -2px -2px 5px #ffffff',
        'neu-dial': '10px 10px 22px #c2d0e2, -10px -10px 22px #ffffff, inset 2px 2px 4px #ffffff, inset -2px -2px 4px #cad7e7',

        // Dark Neumorphism
        'neu-dark-flat': '7px 7px 16px #0d0f14, -7px -7px 16px #232936',
        'neu-dark-sm': '4px 4px 10px #0d0f14, -4px -4px 10px #212733',
        'neu-dark-lg': '12px 12px 26px #0b0d11, -12px -12px 26px #272e3d',
        'neu-dark-inset': 'inset 4px 4px 8px #0d0f14, inset -4px -4px 8px #232936',
        'neu-dark-inset-sm': 'inset 2px 2px 5px #0d0f14, inset -2px -2px 5px #212733',
        'neu-dark-dial': '10px 10px 22px #0c0e12, -10px -10px 22px #262c3a, inset 2px 2px 4px #232936, inset -2px -2px 4px #0d0f14',
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px'
      }
    },
  },
  plugins: [],
}
