// Chụp ảnh preview cho từng project -> public/previews/<tên>.png
//
// Cài 1 lần (KHÔNG lưu vào package.json, để CI/deploy không phải cài thêm):
//              npm i --no-save playwright && npx playwright install chromium
//              (chạy lại `npm install` sau này sẽ gỡ playwright -> cài lại lệnh trên khi cần chụp)
// Chạy:        npm run previews              (chụp hết)
//              npm run previews symphony     (chỉ project có tên chứa "symphony")
//
// Danh sách project tự quét từ src/projects/<tên>/meta.js (không phụ thuộc index.js,
// vì index.js dùng import.meta.glob của Vite mà Node không hiểu).
//
// Link trang chạy thật lấy từ trường `site` trong meta.js (tuỳ chọn); không có thì đoán
// https://<githubUser>.github.io/<tên-repo>/ (tên repo lấy từ href, githubUser từ src/config/site.js). Trang trả về
// lỗi (404...) thì BỎ QUA, không ghi ảnh rác.

import { chromium } from 'playwright';
import { mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pagesOrigin } from '../../src/config/site.js';

const PROJECTS_DIR = new URL('../../src/projects/', import.meta.url);

async function loadProjects() {
  const entries = await readdir(fileURLToPath(PROJECTS_DIR), { withFileTypes: true });
  const list = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    try {
      const m = await import(new URL(`${e.name}/meta.js`, PROJECTS_DIR).href);
      list.push(m.default);
    } catch {
      // thư mục không có meta.js -> bỏ qua
    }
  }
  return list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}
const projects = await loadProjects();

const OUT = new URL('../../public/previews/', import.meta.url);
const VIEWPORT = { width: 1280, height: 720 }; // đúng khung "desktop ảo" của card
const SETTLE_MS = 1500; // chờ animation vào trang chạy xong rồi mới chụp
const filter = process.argv[2];

const siteOf = (p) => p.site || `${pagesOrigin}/${p.href.split('/').filter(Boolean).pop()}/`;
const slugOf = (file) => file.replace(/\.[^.]+$/, '');

await mkdir(fileURLToPath(OUT), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
let ok = 0;

for (const p of projects) {
  if (filter && !p.file.includes(filter)) continue;
  if (p.manualShot) {
    console.log(`- ${p.file}  chụp tay (manualShot), bỏ qua`);
    continue;
  }
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
