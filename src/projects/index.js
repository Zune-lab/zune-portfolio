// Danh sách project — tự nạp mọi src/projects/<tên>/meta.js, không cần khai báo ở đâu nữa.
//
// THÊM PROJECT MỚI: chỉ cần tạo thư mục src/projects/<tên-file-bỏ-đuôi>/ gồm:
//   meta.js  -> export default { order, file, desc, color, href }   (order: thứ tự hiển thị)
//               + shot: true khi đã có public/previews/<tên>.png (ảnh nền lúc hover; chụp bằng npm run previews)
//   Art.jsx  -> hình vẽ hiện trên card (tuỳ chọn; không có thì card hiện icon)
//   Art.css  -> style riêng cho hình vẽ (tuỳ chọn)
// Art.jsx cũng được nạp tự động, khoá theo tên thư mục (= tên file project bỏ đuôi).
// Chỉ chạy trong Vite (import.meta.glob); script chụp ảnh tự quét meta.js nên không import file này.
const modules = import.meta.glob('./*/meta.js', { eager: true });

export const projects = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

const artModules = import.meta.glob('./*/Art.jsx', { eager: true });

export const arts = Object.fromEntries(
  Object.entries(artModules).map(([path, m]) => [path.split('/')[1], m.default]),
);
