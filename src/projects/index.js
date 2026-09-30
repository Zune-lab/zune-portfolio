// Danh sách project — tự nạp mọi src/projects/<tên>/meta.js, không cần khai báo ở đâu nữa.
//
// THÊM PROJECT MỚI: chỉ cần tạo thư mục src/projects/<tên-file-bỏ-đuôi>/ gồm:
//   meta.js  -> export default { order, file, desc, color, href }   (order: thứ tự hiển thị)
//   Art.jsx  -> hình vẽ hiện trên card (tuỳ chọn; không có thì card hiện icon)
//   Art.css  -> style riêng cho hình vẽ (tuỳ chọn)
// Art.jsx cũng được nạp tự động theo tên thư mục (xem arts.js).
const modules = import.meta.glob('./*/meta.js', { eager: true });

export const projects = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
