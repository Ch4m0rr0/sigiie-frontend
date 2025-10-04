module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./src/**/*.component.html",
    "./src/**/*.component.ts",
    "./src/app/**/*.{html,ts}",
    "./src/app/features/**/*.{html,ts}",
    "./src/app/shared/**/*.{html,ts}",
    "./src/app/pages/**/*.{html,ts}",
    "./src/**/*.html",
    "./src/**/*.ts"
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-scale': 'fade-scale 0.5s ease-out',
      },
    },
  },
  plugins: [],
};
