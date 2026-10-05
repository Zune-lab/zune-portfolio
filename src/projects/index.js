// Danh sách project — tự nạp mọi src/projects/<tên>/meta.js, không cần khai báo ở đâu nữa.
//
// THÊM PROJECT MỚI: tạo thư mục src/projects/<tên-file-bỏ-đuôi>/ gồm:
//   meta.js  -> export default { order, file, desc, color, href, tags?, featured?, facts?, shot? }
//               tags: ['css','game'] -> hiện thành chip lọc (--css) và ô tìm kiếm; featured: true -> lên trang chủ
//               (không đánh dấu project nào thì trang chủ lấy 3 project đầu theo order)
//   Art.jsx / Art.css -> hình vẽ trên màn hình máy (tuỳ chọn). Art được nạp LƯỜI: chỉ tải khi project đó được xem,
//               nên 20 hay 200 project thì bundle đầu vẫn nhẹ. Nơi dùng <Art/> phải bọc <Suspense>.
// Chỉ chạy trong Vite (import.meta.glob); script chụp ảnh tự quét meta.js nên không import file này.
import { lazy } from 'react';

const modules = import.meta.glob('./*/meta.js', { eager: true });

export const projects = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

export const tags = [...new Set(projects.flatMap((p) => p.tags ?? []))].sort();

export const featured = (() => {
  const f = projects.filter((p) => p.featured);
  return (f.length ? f : projects).slice(0, 3);
})();

const artLoaders = import.meta.glob('./*/Art.jsx');
export const arts = Object.fromEntries(
  Object.entries(artLoaders).map(([path, load]) => [path.split('/')[1], lazy(load)]),
);
