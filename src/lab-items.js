// SỔ ĐĂNG KÝ CÁC MỤC TRONG LAB (mỗi mục có địa chỉ riêng /zune-portfolio/lab/<slug>).
//
// THÊM MỤC MỚI: tạo component trong src/components/lab/ rồi thêm 1 object vào LAB_ITEMS.
// Thẻ ở lưới, bộ lọc, nút random, prev/next, nav phụ `ls lab/`, tiêu đề tab và
// dist/lab/<slug>/index.html (scripts/spa-404.mjs) đều tự theo, không phải sửa chỗ nào khác.
//
// LƯU Ý: dùng khóa `slug:` (không dùng `id:`), vì scripts/spa-404.mjs đọc file này bằng regex
// `slug: '...'` ở đầu dòng, mỗi dòng như vậy sẽ thành 1 thư mục dist/lab/<slug>/.
//
//   slug   -> đường dẫn: /zune-portfolio/lab/<slug>
//   file   -> tên "file" hiện ở nav, tiêu đề tab và đầu trang
//   (icon  -> lấy theo slug trong components/lab/LabIcon.jsx)
//   kind   -> nhãn lọc: 'game' | 'toy' | 'tool'
//   frame  -> (tùy chọn) khung 340px có nền riêng, cho mục chỉ là hiệu ứng CSS/canvas
//   Component -> lazy-load: chỉ tải mã của mục đang mở
import { lazy } from 'react';

export const LAB_KINDS = ['game', 'toy', 'tool'];

export const LAB_ITEMS = [
  {
    slug: 'reptile',
    file: 'reptile.js',
    name: 'Reptile',
    kind: 'toy',
    blurb: 'A procedural lizard with a random number of legs. Hit the button for a new one.',
    Component: lazy(() => import('./components/lab/Reptile.jsx')),
  },
  {
    slug: 'cat',
    file: 'cat.css',
    name: 'Upside-down cat',
    kind: 'toy',
    blurb: 'A cat running upside-down. Pure CSS animation, no JavaScript state.',
    frame: { background: '#ff9a2e' },
    Component: lazy(() => import('./components/lab/Cat.jsx')),
  },
  {
    slug: 'ghost',
    file: 'ghost.css',
    name: 'Floating ghost',
    kind: 'toy',
    blurb: 'A floating CSS ghost. Poke it, flip day and night, find the hidden lines.',
    frame: {},
    Component: lazy(() => import('./components/lab/Ghost.jsx')),
  },
  {
    slug: 'banner-maker',
    file: 'banner-maker.js',
    name: 'Banner maker',
    kind: 'tool',
    blurb: 'Stack patterns and dyes into a banner, then copy the code.',
    Component: lazy(() => import('./components/lab/BannerMaker.jsx')),
  },
  {
    slug: 'bug-squash',
    file: 'bug-squash.js',
    name: 'Bug squash',
    kind: 'game',
    blurb: 'Squash bugs for 30 seconds. Beat your best score.',
    Component: lazy(() => import('./components/lab/BugSquash.jsx')),
  },
  {
    slug: 'memory-match',
    file: 'memory-match.js',
    name: 'Memory match',
    kind: 'game',
    blurb: 'Flip cards and match the code symbols in the fewest moves.',
    Component: lazy(() => import('./components/lab/MemoryMatch.jsx')),
  },
  {
    slug: 'snake',
    file: 'snake.js',
    name: 'Snake',
    kind: 'game',
    blurb: 'Classic snake on an 18×18 grid. Keyboard or on-screen pad.',
    Component: lazy(() => import('./components/lab/Snake.jsx')),
  },
];

export const labItemOf = (slug) => LAB_ITEMS.find((i) => i.slug === slug);
