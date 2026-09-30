// GitHub Pages chỉ phục vụ file có thật, nên với mỗi trang khai báo trong
// src/pages.js ta tạo dist/<id>/index.html (bản sao của index.html) -> mở thẳng
// hoặc F5 ở /zune-portfolio/<id> vẫn trả 200. 404.html là dự phòng cho URL lạ.
// Thêm trang mới chỉ cần sửa src/pages.js, script này tự đọc danh sách id ở đó.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';

const ids = [...readFileSync('src/pages.js', 'utf8').matchAll(/^\s+id:\s*'([^']+)'/gm)].map((m) => m[1]);
if (!ids.length) throw new Error('spa-404: không tìm thấy id trang nào trong src/pages.js');

for (const id of ids) {
  mkdirSync(`dist/${id}`, { recursive: true });
  copyFileSync('dist/index.html', `dist/${id}/index.html`);
}
copyFileSync('dist/index.html', 'dist/404.html');
console.log(`✓ dist/{${ids.join(', ')}}/index.html + dist/404.html`);
