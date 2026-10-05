// GitHub Pages chỉ phục vụ file có thật, nên với mỗi trang khai báo trong
// src/config/pages.js ta tạo dist/<id>/index.html (bản sao của index.html) -> mở thẳng
// hoặc F5 ở /<repo>/<id> vẫn trả 200. 404.html là dự phòng cho URL lạ.
// Thêm trang mới chỉ cần sửa src/config/pages.js, script này tự đọc danh sách id ở đó.
// Mỗi mục lab (src/config/lab-items.js, khóa `slug:`) cũng có dist/lab/<slug>/index.html riêng.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';

const ids = [...readFileSync('src/config/pages.js', 'utf8').matchAll(/^\s+id:\s*'([^']+)'/gm)].map((m) => m[1]);
if (!ids.length) throw new Error('spa-404: không tìm thấy id trang nào trong src/config/pages.js');

const labSlugs = [...readFileSync('src/config/lab-items.js', 'utf8').matchAll(/^\s+slug:\s*'([^']+)'/gm)].map((m) => m[1]);
if (!labSlugs.length) throw new Error('spa-404: không tìm thấy slug nào trong src/config/lab-items.js');
if (!ids.includes('lab')) throw new Error("spa-404: src/config/pages.js không có trang 'lab' nhưng lab-items.js có mục");

for (const id of [...ids, ...labSlugs.map((s) => `lab/${s}`)]) {
  mkdirSync(`dist/${id}`, { recursive: true });
  copyFileSync('dist/index.html', `dist/${id}/index.html`);
}
copyFileSync('dist/index.html', 'dist/404.html');
console.log(`✓ dist/{${ids.join(', ')}}/index.html + dist/lab/{${labSlugs.join(', ')}}/index.html + dist/404.html`);
