// DANH SÁCH SKIN: "skin" là bộ giao diện của CẢ trang (màu, font, độ bo góc, hiệu ứng nền), độc lập với sáng/tối (data-theme).
//   <html data-skin="dracula" data-theme="dark">
// Thêm một skin mới = 3 bước:
//   1. thêm một mục vào SKINS bên dưới (id, nhãn, các chế độ hỗ trợ, màu mẫu cho bảng chọn);
//   2. viết khối `:root[data-skin='<id>'] { ... }` trong src/styles/skins.css (ghi đè các biến màu; skin có cả sáng lẫn tối thì
//      thêm khối `[data-theme='light']`);
//   3. (tuỳ chọn) hiệu ứng riêng: cũng viết trong src/styles/skins.css.
// Chạy `node system/scripts/check-skins.mjs` để kiểm tra độ tương phản chữ/nền của mọi skin.
//
// File này là dữ liệu thuần (không import React, không import.meta.env) vì ba nơi cùng đọc nó:
// component React, src/lib/skin.js và system/vite.config.js (điền token vào index.html để áp skin trước khi vẽ, không nháy).

export const DEFAULT_SKIN = 'zune';
export const SKIN_AUTO = 'auto'; // không phải skin thật: tự chọn skin theo buổi trong ngày (AUTO_BY_TOD)

// skin theo buổi (giờ VN, cùng mốc với data-tod ở src/config/site.js): sáng sớm / ban ngày / chiều tối / đêm
export const AUTO_BY_TOD = { dawn: 'nord', day: 'catppuccin', dusk: 'gruvbox', night: 'tokyo-night' };

const both = ['dark', 'light'];

// swatch: 4 màu [nền, bảng, nhấn, chữ] cho ô xem trước trong bảng chọn; skin có cả hai chế độ thì khai báo cho từng chế độ.
//   modes: chế độ được hỗ trợ. 1 chế độ = skin "khoá": bật skin thì data-theme bị ép theo, công tắc đèn pin không đổi được.
//   unlock (tuỳ chọn): skin ẩn, cần đạt điều kiện mới dùng được: { game: <khoá kỷ lục>, min: <điểm>, hint: <gợi ý> }.
export const SKINS = [
  {
    id: 'zune',
    group: 'original',
    label: 'zune',
    note: 'the original amber terminal',
    modes: both,
    swatch: { dark: ['#0a0c10', '#10141b', '#ffc857', '#dce1e8'], light: ['#f6f3ec', '#ffffff', '#8f5d08', '#1c1b18'] },
  },

  // ---- theme của trình soạn code
  {
    id: 'dracula',
    group: 'editor',
    label: 'dracula',
    note: 'purple on charcoal',
    modes: ['dark'],
    swatch: { dark: ['#282a36', '#2f3242', '#bd93f9', '#f8f8f2'] },
  },
  {
    id: 'monokai',
    group: 'editor',
    label: 'monokai',
    note: 'hot pink, olive night',
    modes: ['dark'],
    swatch: { dark: ['#272822', '#2f302a', '#ff6a9c', '#f8f8f2'] },
  },
  {
    id: 'nord',
    group: 'editor',
    label: 'nord',
    note: 'arctic, calm, frosty blue',
    modes: both,
    swatch: { dark: ['#2e3440', '#353c4a', '#88c0d0', '#eceff4'], light: ['#eceff4', '#ffffff', '#476d9a', '#2e3440'] },
  },
  {
    id: 'gruvbox',
    group: 'editor',
    label: 'gruvbox',
    note: 'warm retro orange',
    modes: both,
    swatch: { dark: ['#282828', '#32302f', '#fe8019', '#ebdbb2'], light: ['#fbf1c7', '#fdf6d8', '#af3a03', '#3c3836'] },
  },
  {
    id: 'solarized',
    group: 'editor',
    label: 'solarized',
    note: 'the precision teal classic',
    modes: both,
    swatch: { dark: ['#002b36', '#073642', '#35b5ab', '#93a1a1'], light: ['#fdf6e3', '#fffbf0', '#1a7872', '#4a6068'] },
  },
  {
    id: 'catppuccin',
    group: 'editor',
    label: 'catppuccin',
    note: 'mocha / latte, soft mauve',
    modes: both,
    swatch: { dark: ['#1e1e2e', '#262637', '#cba6f7', '#cdd6f4'], light: ['#eff1f5', '#ffffff', '#8839ef', '#4c4f69'] },
  },
  {
    id: 'tokyo-night',
    group: 'editor',
    label: 'tokyo night',
    note: 'neon city blue',
    modes: both,
    swatch: { dark: ['#1a1b26', '#1f2335', '#7aa2f7', '#c0caf5'], light: ['#e1e2e7', '#eceef3', '#34548a', '#343b58'] },
  },

  // ---- đổi cả không khí của trang (màu + font + bo góc + hiệu ứng)
  {
    id: 'crt',
    group: 'special',
    label: 'crt green',
    note: 'phosphor monitor, scanlines',
    modes: ['dark'],
    swatch: { dark: ['#030b05', '#06140a', '#c8ffd9', '#4dff88'] },
  },
  {
    id: 'crt-amber',
    group: 'special',
    label: 'crt amber',
    note: 'the other phosphor, 1982',
    modes: ['dark'],
    swatch: { dark: ['#0c0700', '#140d02', '#ffe0a0', '#ffb000'] },
  },
  {
    id: 'gameboy',
    group: 'special',
    label: 'game boy',
    note: 'four shades of green',
    modes: ['light'],
    swatch: { light: ['#9bbc0f', '#8bac0f', '#0f380f', '#0f380f'] },
  },
  {
    id: 'cyberpunk',
    group: 'special',
    label: 'cyberpunk',
    note: 'magenta + cyan, neon glow',
    modes: ['dark'],
    swatch: { dark: ['#0a0612', '#130b22', '#ff2bd6', '#eae6ff'] },
  },
  {
    id: 'blueprint',
    group: 'special',
    label: 'blueprint',
    note: 'white lines on drafting blue',
    modes: ['dark'],
    swatch: { dark: ['#0e3a7d', '#114489', '#9fe8ff', '#eaf3ff'] },
  },
  {
    id: 'paper',
    group: 'special',
    label: 'paper',
    note: 'notebook, typewriter, red pen',
    modes: ['light'],
    swatch: { light: ['#f5f0e1', '#fffdf6', '#b3261e', '#1f2430'] },
  },
  {
    id: 'retro-os',
    group: 'special',
    label: 'retro os',
    note: 'grey windows, beveled, navy bar',
    modes: ['light'],
    swatch: { light: ['#c0c0c0', '#c0c0c0', '#000080', '#000000'] },
  },

  // ---- skin ẩn: mở khoá bằng cách chơi game ở /lab (hoặc gõ mã Konami)
  {
    id: 'matrix',
    group: 'secret',
    label: 'matrix',
    note: 'digital rain',
    modes: ['dark'],
    swatch: { dark: ['#000000', '#021006', '#ccffd8', '#00ff41'] },
    unlock: { game: 'snake-best', min: 12, hint: 'score 12+ in snake (lab)' },
  },
  {
    id: 'vaporwave',
    group: 'secret',
    label: 'vaporwave',
    note: 'sunset grid, a e s t h e t i c',
    modes: ['dark'],
    swatch: { dark: ['#1b0b36', '#2a1252', '#ff71ce', '#ffe6ff'] },
    unlock: { game: 'bugsquash-best', min: 18, hint: 'squash 18+ bugs in bug-squash (lab)' },
  },
];

export const GROUP_LABEL = {
  original: 'default',
  editor: 'editor themes',
  special: 'whole-site skins',
  secret: 'secret',
};

const byId = new Map(SKINS.map((s) => [s.id, s]));

export const skinById = (id) => byId.get(id);
export const isSkinId = (id) => byId.has(id);

// chế độ bị khoá của skin (skin chỉ có 1 chế độ): 'dark' | 'light'; skin có cả hai thì null
export const lockedMode = (id) => {
  const s = byId.get(id);
  return s && s.modes.length === 1 ? s.modes[0] : null;
};

// màu mẫu hiển thị cho skin ở chế độ `theme` hiện tại (skin khoá thì dùng chế độ duy nhất của nó)
export const swatchOf = (skin, theme) => skin.swatch[skin.modes.length === 1 ? skin.modes[0] : theme] ?? Object.values(skin.swatch)[0];

// dùng cho index.html (qua system/vite.config.js): chuỗi đơn giản, không có dấu nháy nên an toàn khi chèn vào <script>
export const skinIdsToken = () => SKINS.map((s) => s.id).join(',');
export const skinLocksToken = () =>
  SKINS.filter((s) => s.modes.length === 1)
    .map((s) => `${s.id}:${s.modes[0]}`)
    .join(',');
