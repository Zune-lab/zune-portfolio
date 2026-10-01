// SỔ ĐĂNG KÝ CÁC TRANG RIÊNG (mỗi trang có địa chỉ riêng).
//
//   home      -> /zune-portfolio/
//   <id>      -> /zune-portfolio/<id>      (about, projects, ...)
//   lab/<slug>-> /zune-portfolio/lab/<slug> (từng mục trong lab, khai báo ở src/config/lab-items.js)
//
// THÊM TRANG MỚI: tạo component rồi thêm 1 mục vào PAGES bên dưới. Nav chính, nav
// phụ, URL, tiêu đề tab trình duyệt và lệnh `cd`/`ls` trong terminal tự theo,
// không phải sửa chỗ nào khác. Mở thẳng địa chỉ trang mới trên GitHub Pages cũng
// chạy nhờ 404.html do scripts/spa-404.mjs tạo lúc build.
import About from '../components/about/About.jsx';
import Projects from '../projects/Projects.jsx';
import Lab from '../components/lab/Lab.jsx';
import { LAB_ITEMS, labItemOf } from './lab-items.js';

import { BASE, pathOf } from '../lib/paths.js';

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
    // mỗi mục lab là 1 "view" riêng (lab/<slug>) có địa chỉ thật, lấy từ src/config/lab-items.js
    children: LAB_ITEMS.map((i) => i.slug),
    sub: LAB_ITEMS.map((i) => ({ view: `lab/${i.slug}`, href: pathOf(`lab/${i.slug}`), label: i.file })),
  },
];

export const HOME_TITLE = 'Zune — Web Developer';

// "view" = 'home' | id trang | '<id>/<con>' (vd 'lab/snake'). topOf lấy phần trang cấp một.
export const topOf = (view) => view.split('/')[0];
export const pageOf = (id) => PAGES.find((p) => p.id === id);
export const pageOfView = (view) => pageOf(topOf(view));

export const titleOf = (view) => {
  const slug = view.split('/')[1];
  const item = slug && labItemOf(slug);
  if (topOf(view) === 'lab' && item) return `${item.file} — Zune`;
  return pageOfView(view)?.title ?? HOME_TITLE;
};

export const viewFromLocation = () => {
  const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : '';
  const name = rest.replace(/\/+$/, '');
  if (pageOf(name)) return name;
  // trang con (lab/<slug>): slug đúng -> view đó; slug lạ / thừa đoạn -> về lưới của trang cha
  const [top, child, ...more] = name.split('/');
  const page = pageOf(top);
  if (!page) return 'home';
  return page.children?.includes(child) && !more.length ? `${top}/${child}` : top;
};
