import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base phải khớp đúng tên repo, vì site chạy ở
// https://zune-lab.github.io/zune-portfolio/ (subpath), không phải domain gốc.
// Thiếu dòng này, mọi asset (JS, CSS, ảnh) sau khi build sẽ trỏ nhầm ra
// zune-lab.github.io/ thay vì zune-lab.github.io/zune-portfolio/ -> 404 -> trắng trang.
export default defineConfig({
  base: '/zune-portfolio/',
  plugins: [react()],
});