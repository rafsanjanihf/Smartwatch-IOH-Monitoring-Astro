/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}', './node_modules/flowbite/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#FF0000',
        secondary: '#00A3E0',
        background: '#F5F6F8',
      },
    },
  },
  plugins: [require('flowbite/plugin')],
};
