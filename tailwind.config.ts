import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-yellow': '#FED700',
        brand: {
          bg: '#FAF9F6',
          surface: '#FFFFFF',
          subtle: '#F5F3EF',
          primary: '#1E2229',
          'primary-hover': '#2D323C',
          accent: '#E06D53',
          'accent-hover': '#C85A42',
          'accent-light': '#FDF2EE',
          border: '#E7E5E4',
          'border-subtle': '#F0EFEA',
          dark: '#18181B',
          muted: '#71717A',
          cream: '#FFFDF9',
        }
      }
    },
  },  
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms"), require("daisyui")],
};
export default config;
