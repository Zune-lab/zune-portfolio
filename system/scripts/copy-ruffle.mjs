// Chép Ruffle (trình giả lập Flash) từ node_modules vào public/ruffle để phục vụ self-hosted (không phụ thuộc CDN).
// Chạy tự động trước `npm run dev` và `npm run build` (predev / prebuild). Thư mục đích nằm trong .gitignore.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const src = 'node_modules/@ruffle-rs/ruffle';
const dest = 'public/ruffle';

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const f of readdirSync(src)) {
  if (f.endsWith('.map')) continue; // bỏ sourcemap cho nhẹ
  cpSync(`${src}/${f}`, `${dest}/${f}`);
}
console.log(`✓ Ruffle -> ${dest}`);
