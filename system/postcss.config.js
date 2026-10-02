import { fileURLToPath } from 'node:url';

export default {
  plugins: {
    // tailwind.config.js nằm cạnh file này (system/), không ở thư mục gốc
    tailwindcss: { config: fileURLToPath(new URL('./tailwind.config.js', import.meta.url)) },
    autoprefixer: {},
  },
};
