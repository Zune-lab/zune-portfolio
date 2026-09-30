// Tự nạp mọi src/projects/<tên>/Art.jsx, khoá theo tên thư mục (= tên file project bỏ đuôi).
// Chỉ chạy trong trình duyệt/Vite (import.meta.glob) nên tách riêng khỏi index.js.
const modules = import.meta.glob('./*/Art.jsx', { eager: true });

export const arts = Object.fromEntries(
  Object.entries(modules).map(([path, m]) => [path.split('/')[1], m.default]),
);
