import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '0px',
      sm: '600px',
      // => @media (min-width: 640px) { ... }

      md: '900px',
      // => @media (min-width: 768px) { ... }

      lg: '1200px',
      // => @media (min-width: 1024px) { ... }

      xl: '1536px',
      // => @media (min-width: 1280px) { ... }
    },
    colors: {
      primary: {
        DEFAULT: 'rgb(252, 106, 3)',
        light: 'rgb(252, 135, 53)',
        dark: 'rgb(176, 74, 2)',
      },
      secondary: {
        DEFAULT: 'rgb(3, 149, 252)',
        light: 'rgb(53, 170, 252)',
        dark: 'rgb(2, 104, 176)',
      },
      success: {
        DEFAULT: 'rgb(0, 221, 131)',
        light: 'rgb(51, 227, 155)',
        dark: 'rgb(0, 154, 91)',
      },
      info: {
        DEFAULT: 'rgb(3, 149, 252)',
        light: 'rgb(53, 170, 252)',
        dark: 'rgb(2, 104, 176)',
      },
      warning: {
        DEFAULT: 'rgb(253, 89, 1)',
        light: 'rgb(253, 122, 51)',
        dark: 'rgb(177, 62, 0)',
      },
      error: {
        DEFAULT: 'rgb(221, 38, 43)',
        light: 'rgb(227, 81, 85)',
        dark: 'rgb(154, 26, 30)',
      },
      disabled: {
        DEFAULT: 'rgba(58, 58, 58, 0.7)',
        light: 'rgb(255, 255, 255, 0.7)',
        dark: 'rgba(0, 0, 0, 0.7)',
      },
      contrast: {
        primary: 'rgba(255, 255, 255, 1)',
        secondary: 'rgba(255, 255, 255, 0.7)',
      },
    },
    extend: {
      backgroundImage: {
        'gradient-primary': 'linear-gradient(45deg, #FCBD02 30%, #147970 90%)',
        'gradient-secondary': 'linear-gradient(45deg, #0395fc 30%, #fc6a03 90%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
