import { site } from '../config/site.js';

// Hồ sơ dạng danh sách. Danh tính, nơi ở, email, giờ giấc nằm ở src/config/site.js.
export const startYear = 2022;
export const mainStack = 'React + Tailwind';
export const learning = 'Next.js App Router';

export const aboutBlurb = `coding since ${startYear}. Favorite stack is ${mainStack}, and I'm currently learning the ${learning}.`;

export const stack = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Next.js', 'Tailwind CSS', 'Figma',
];

// skills.js ở trang About: nhóm lại từ `stack`; mục nào chưa xếp nhóm tự rơi vào "other"
export const skillGroups = [
  ['languages', ['HTML', 'CSS', 'JavaScript', 'TypeScript']],
  ['frameworks', ['React', 'Next.js', 'Tailwind CSS', 'Node.js']],
  ['design', ['Figma']],
];
// các kỹ năng đang học (hiện nhãn "learning" cạnh tên)
export const learningSkills = ['TypeScript', 'Next.js'];

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
  { hash: 'a9b0c1d', date: 'now', msg: `feat: building ${site.handle}` },
];
