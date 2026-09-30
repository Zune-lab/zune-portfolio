// GitHub Pages chỉ phục vụ file có thật. Mở thẳng /zune-portfolio/projects (hoặc F5
// khi đang ở đó) sẽ không có file nào tên "projects" -> Pages trả về 404.html.
// Nên ta chép index.html thành 404.html: trang lỗi chính là app, app đọc URL và tự
// hiện đúng tab. Chạy sau `vite build` (xem script "build" trong package.json).
import { copyFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'dist/404.html');
console.log('✓ dist/404.html (SPA fallback cho GitHub Pages)');
