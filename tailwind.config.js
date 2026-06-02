/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./preview.html"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0B0B0D',
          charcoal: '#16161F',
          card: '#1F1F2E',
          neon: '#39FF14',
          cyan: '#00F0FF',
          red: '#FF3E3E',
          orange: '#FF8A00'
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-glow': '0 0 15px rgba(57, 255, 20, 0.4)',
        'cyan-glow': '0 0 15px rgba(0, 240, 255, 0.4)',
        'red-glow': '0 0 15px rgba(255, 62, 62, 0.4)',
      }
    },
  },
  plugins: [],
}
