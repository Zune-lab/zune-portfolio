export const role = 'Web Developer';
export const location = 'Ho Chi Minh City';

export const aboutBlurb = 'coding since 2022. Favorite stack is React + Tailwind, and I\'m currently learning the Next.js App Router.';

export const stack = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Next.js', 'Tailwind CSS', 'Figma',
];

// Nhật ký cuộc đời, từ lúc sinh ra tới giờ (cũ -> mới). Hiện ở About > log.sh.
// Mỗi mục: hash (chuỗi hex 7 ký tự, tự đặt cho vui), date ('YYYY' | 'YYYY-MM' | 'now'),
// msg (kiểu commit message: feat:/fix:/chore:/refactor:...).
export const gitLog = [
  { hash: '9f3a1c0', date: 'day-0', msg: 'init: born (no consent was asked)' },
  { hash: 'a1b2c3d', date: '2022-01', msg: 'chore: started learning HTML/CSS' },
  { hash: 'd4e5f6a', date: '2022-06', msg: 'feat: wrote my first line of JavaScript' },
  { hash: '3c8e2f1', date: '2022-09', msg: 'fix: introvert mode enabled by default' },
  { hash: 'b7c8d9e', date: '2023-03', msg: 'feat: got to know React' },
  { hash: 'e0f1a2b', date: '2023-11', msg: 'feat: build a-dumb-gift, a-gift-for-u' },
  { hash: '6d1a9b4', date: '2024-01', msg: 'revert: "rewrite everything in one night"' },
  { hash: 'c3d4e5f', date: '2024-05', msg: 'feat: tried symphony (audio + JS)' },
  { hash: '4e7b0c2', date: '2024-08', msg: 'fix: 3am CSS bug. it was a missing semicolon' },
  { hash: 'f6a7b8c', date: '2025-01', msg: 'refactor: learning TypeScript' },
  { hash: '8a2d5e7', date: '2025-09', msg: 'wip: unlock full personality (requires 6+ months of friendship)' },
  { hash: 'a9b0c1d', date: 'now', msg: 'feat: building zune.dev' },
];
