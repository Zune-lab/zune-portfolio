// Chụp ảnh preview cho từng project -> public/previews/<tên>.png
//
// Cài 1 lần:   npm i -D playwright && npx playwright install chromium
// Chạy:        node scripts/make-previews.mjs            (chụp hết)
//              node scripts/make-previews.mjs symphony   (chỉ project có tên chứa "symphony")
//
// Link trang chạy thật lấy từ `site` trong data.js; không có thì đoán
// https://zune-lab.github.io/<tên-repo>/ (tên repo lấy từ href). Trang trả về
// lỗi (404...) thì BỎ QUA, không ghi ảnh rác.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/data.js';

const OUT = new URL('../public/previews/', import.meta.url);
const VIEWPORT = { width: 1280, height: 720 }; // đúng khung "desktop ảo" của card
const SETTLE_MS = 1500; // chờ animation vào trang chạy xong rồi mới chụp
const filter = process.argv[2];

const siteOf = (p) => p.site || `https://zune-lab.github.io/${p.href.split('/').filter(Boolean).pop()}/`;
const slugOf = (file) => file.replace(/\.[^.]+$/, '');

await mkdir(fileURLToPath(OUT), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
let ok = 0;

for (const p of projects) {
  if (filter && !p.file.includes(filter)) continue;
  const url = siteOf(p);
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    if (!res || res.status() >= 400) {
      console.log(`✗ ${p.file}  ${url}  -> HTTP ${res ? res.status() : 'none'}, bỏ qua`);
      continue;
    }
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({ path: fileURLToPath(new URL(`${slugOf(p.file)}.png`, OUT)), type: 'png' });
    console.log(`✓ ${p.file}  <- ${url}`);
    ok++;
  } catch (e) {
    console.log(`✗ ${p.file}  ${url}  -> ${e.message.split('\n')[0]}`);
  }
}

await browser.close();
console.log(`\nXong: ${ok} ảnh trong public/previews/`);
