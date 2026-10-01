import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// thêm dòng bản quyền vào đầu mỗi file JS sau khi build (chạy sau bước minify nên không bị xoá)
const BANNER = '/*! zune-portfolio © 2026 Zune (https://github.com/Zune-lab/zune-portfolio) - MIT License */\n';
const copyrightBanner = () => ({
  name: 'copyright-banner',
  apply: 'build',
  generateBundle(_, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type === 'chunk') file.code = BANNER + file.code;
    }
  },
});

// base phải khớp đúng tên repo, vì site chạy ở
// https://zune-lab.github.io/zune-portfolio/ (subpath), không phải domain gốc.
// Thiếu dòng này, mọi asset (JS, CSS, ảnh) sau khi build sẽ trỏ nhầm ra
// zune-lab.github.io/ thay vì zune-lab.github.io/zune-portfolio/ -> 404 -> trắng trang.
export default defineConfig({
  base: '/zune-portfolio/',
  plugins: [react(), copyrightBanner()],
});
