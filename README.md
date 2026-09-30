# zune.dev — React + Tailwind

Chuyển đổi từ bản HTML/CSS/JS thuần sang React (Vite) + Tailwind CSS.

## Chạy thử

```bash
npm install
npm run dev
```

## Cấu trúc

- `src/App.jsx` — ghép toàn bộ trang, quản lý theme (dark/light) + preloader + back-to-top
- `src/components/` — mỗi section/thành phần một file
- `src/projects/` — mọi thứ về project: `Projects.jsx` + `ProjectCard` (giao diện) và mỗi project một thư mục `<tên>/` (`meta.js`, `Art.jsx`, `Art.css`). Thêm project mới = tạo thư mục mới, không cần sửa file nào khác
- `src/data.js` — nội dung (dự án, mạng xã hội, stack, git log) — sửa ở đây là đủ
- `src/index.css` — biến màu theo theme + các animation phức tạp (torch 3D, preloader, hiệu ứng wipe...) mà Tailwind utility thuần không diễn tả gọn được

## Các animation từ uiverse.io đã dùng

- **torch.html** → `ThemeToggleTorch.jsx` — công tắc sáng/tối trong nav
- **contact.html** → `ContactButton.jsx` — nút "contact" ở hero
- **back-to-top.html** → `BackToTop.jsx`
- **next.html** → `ScrollArrow.jsx` — nút cuộn xuống ở hero
- **loading.html** (banter loader) → `Preloader.jsx`
- Mẫu nút social (github/x/whatsapp/discord/fb.html) → gộp thành 1 component
  `SocialButton.jsx` dùng chung cho cả 7 mạng xã hội (kể cả instagram, zalo vốn
  không có file riêng, dùng chung pattern brand-color-reveal)

## Đã bỏ qua (không khớp với thiết kế hiện tại)

- `light.html` — công tắc sáng/tối kiểu khác, trùng chức năng với torch
- `card-hover.html` — card gradient cam-hồng, không hợp tông màu terminal/amber của trang
- `feedback.html` — layout feedback card nền trắng, không hợp theme tối; trang đã có form riêng
- `ui.html` — thẻ logo uiverse.io, không liên quan nội dung trang
- `spotify.html`, `social.html` (squircle dock) — trang không có link Spotify, và
  các nút social riêng lẻ đã khớp thiết kế gốc hơn bản dock gộp
