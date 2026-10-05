import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { site, base, siteUrl, githubUrl, repoUrl, title, storageKey } from '../src/config/site.js';

// thêm dòng bản quyền vào đầu mỗi file JS sau khi build (chạy sau bước minify nên không bị xoá)
const BANNER = `/*! ${site.repo} © ${site.year} ${site.name} (${repoUrl()}) - MIT License */\n`;
const copyrightBanner = () => ({
  name: 'copyright-banner',
  apply: 'build',
  generateBundle(_, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type === 'chunk') file.code = BANNER + file.code;
    }
  },
});

// điền {{token}} trong index.html từ src/config/site.js (title, meta, og, khoá theme...): sửa thông tin ở một chỗ, cả dev lẫn build.
// Token lạ (gõ sai tên) thì báo lỗi ngay thay vì để nguyên chuỗi {{...}} lọt lên trang.
const TOKENS = {
  name: site.name,
  handle: site.handle,
  year: site.year,
  repo: site.repo,
  title,
  description: site.description,
  siteUrl,
  githubUrl,
  repoUrl: repoUrl(),
  themeKey: storageKey('theme'),
};
const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const siteHtml = () => ({
  name: 'site-html',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) =>
      html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (!(key in TOKENS)) throw new Error(`index.html: unknown token {{${key}}} (see TOKENS in system/vite.config.js)`);
        return escapeHtml(TOKENS[key]);
      }),
  },
});

// base phải khớp đúng tên repo (site.repo), vì site chạy ở https://<githubUser>.github.io/<repo>/ (subpath), không phải domain gốc.
// Thiếu dòng này, mọi asset (JS, CSS, ảnh) sau khi build sẽ trỏ nhầm ra gốc domain thay vì subpath -> 404 -> trắng trang.
export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), siteHtml(), copyrightBanner()],
});
