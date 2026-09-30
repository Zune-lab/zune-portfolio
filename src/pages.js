// SỔ ĐĂNG KÝ CÁC TRANG RIÊNG (mỗi trang có địa chỉ riêng).
//
//   home      -> /zune-portfolio/
//   <id>      -> /zune-portfolio/<id>      (about, projects, ...)
//
// THÊM TRANG MỚI: tạo component rồi thêm 1 mục vào PAGES bên dưới. Nav chính, nav
// phụ, URL, tiêu đề tab trình duyệt và lệnh `cd`/`ls` trong terminal tự theo,
// không phải sửa chỗ nào khác. Mở thẳng địa chỉ trang mới trên GitHub Pages cũng
// chạy nhờ 404.html do scripts/spa-404.mjs tạo lúc build.
import About from './components/about/About.jsx';
import Projects from './projects/Projects.jsx';
import Lab from './components/lab/Lab.jsx';

export const PAGES = [
  {
    id: 'about', // = đường dẫn: /zune-portfolio/about
    label: 'about.js', // chữ hiện ở nav
    title: 'about.js — Zune', // tiêu đề tab trình duyệt
    Component: About,
    // mục con hiện ở nav phụ khi đứng trong trang này (cuộn trong trang, không đổi trang)
    sub: [
      { href: '#about-intro', label: 'about.js' },
      { href: '#about-journey', label: 'log.sh' },
      { href: '#about-skills', label: 'skills.js' },
    ],
  },
  {
    id: 'projects',
    label: 'projects/',
    title: 'projects/ — Zune',
    Component: Projects,
    sub: [],
  },
  {
    id: 'lab',
    label: 'lab.css',
    title: 'lab.css — Zune',
    Component: Lab,
    sub: [
      { href: '#lab-reptile', label: 'reptile.js' },
      { href: '#lab-cat', label: 'cat.css' },
      { href: '#lab-playground', label: 'playground.css' },
      { href: '#lab-game', label: 'bug-squash.js' },
    ],
  },
];

export const HOME_TITLE = 'Zune — Web Developer';

// Site chạy ở subpath (BASE_URL = '/zune-portfolio/'), mọi đường dẫn nối sau nó.
export const BASE = import.meta.env.BASE_URL;
export const pathOf = (id) => (id === 'home' ? BASE : `${BASE}${id}`);
export const pageOf = (id) => PAGES.find((p) => p.id === id);

export const viewFromLocation = () => {
  const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : '';
  const name = rest.replace(/\/+$/, '');
  return pageOf(name) ? name : 'home';
};
