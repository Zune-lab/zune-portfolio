// NGUỒN DUY NHẤT cho mọi thứ "của riêng chủ site". Fork repo này thì chỉ cần sửa file này (cộng src/data/profile.js, socials.js
// và meta.js của từng project), không phải đi tìm từng chỗ trong component.
//
// File này là dữ liệu thuần (không import.meta.env, không import React) vì ba nơi cùng đọc nó:
//   - component React (qua import thường)
//   - system/vite.config.js: `base`, dòng bản quyền trong bundle, và điền các {{token}} trong index.html (title, og, theme key...)
//   - system/scripts/*.mjs chạy bằng Node
//
// Chia việc với src/data/profile.js: site.js = danh tính, nơi ở, giờ giấc, repo, và các câu chữ nhỏ rải trong giao diện;
// profile.js = nội dung "hồ sơ" dạng danh sách dài (stack, nhóm kỹ năng, git log).
export const site = {
  // --- danh tính
  name: 'Zune', // tên hiển thị: tiêu đề hero, tiêu đề tab, meta
  realName: 'Vuong', // tên thật, chỉ dùng cho nhãn đọc màn hình của chữ ký (Signature); chữ cái đầu là hình SVG vẽ tay (chữ V)
  id: 'zune', // định danh viết thường: prompt terminal, zune.sav, `const zune`, tiền tố khoá localStorage
  handle: 'zune.dev', // tên thương hiệu dạng domain: logo nav, preloader, sâu chữ ở hero, screensaver, og:site_name
  year: 2026, // năm bản quyền

  // --- công việc, nơi ở, liên hệ
  role: 'Web Developer',
  location: 'Ho Chi Minh City',
  country: 'VN',
  host: 'hcmc', // tên máy ở prompt terminal: zune@hcmc
  email: 'nguyenhaivuong06@gmail.com',

  // --- giờ giấc: trạng thái online/offline và tông nền (data-tod) đều suy ra từ đây, không cần backend
  timezone: 'Asia/Ho_Chi_Minh', // tên IANA
  // giờ bắt đầu mỗi buổi, theo giờ của `timezone`, phải tăng dần: dawn < day < dusk < night.
  // online = từ `day` tới trước `night`; còn lại (dawn + night) là offline
  schedule: { dawn: 5, day: 8, dusk: 17, night: 23 },

  // --- nơi host: https://<githubUser>.github.io/<repo>/
  githubUser: 'Zune-lab',
  repo: 'zune-portfolio',

  // --- SEO (meta description, og:description)
  description: "Zune's portfolio: a web developer building small, playful things with React.",

  // --- câu chữ riêng rải trong giao diện
  content: {
    phrases: ['I code for fun.', 'I fix 3am bugs.', 'I play with CSS.', 'I make tiny pages.'], // dòng tự gõ ở hero (câu đầu cũng là aria-label của tiêu đề)
    heroIntro: 'I love messing around with CSS and building tiny pages just to see if they work.',
    heroNote: '// introvert by default. say hi anyway →',
    mood: 'chillax guys. code for fun, ship small weird things.', // `cat mood.txt` trong terminal
    teaLine: 'tea > coffee. always.', // `cat tea.txt`
    funFact: 'debugging CSS all night and never getting bored', // about.js
    drink: 'tea', // about.js: coffee_or_tea
    classes: ['Bug Summoner', 'CSS Wizard', 'Tea Enjoyer', 'Introvert (lvl 99)'], // bấm dòng "class" ở thẻ sav để đổi (ngoài ra là `role` thật)
  },
};

// --- giá trị suy ra (đừng sửa tay, chỉnh các trường ở trên)
export const githubUrl = `https://github.com/${site.githubUser}`;
export const repoUrl = (name = site.repo) => `${githubUrl}/${name}`; // repo của project con: repoUrl('illusion')
export const pagesOrigin = `https://${site.githubUser.toLowerCase()}.github.io`;
export const siteUrl = `${pagesOrigin}/${site.repo}/`;
export const base = `/${site.repo}/`; // Vite `base`: phải khớp tên repo vì site chạy ở subpath (nếu dùng domain riêng thì đổi thành '/')
export const title = `${site.name} — ${site.role}`;
// khoá localStorage / sessionStorage: storageKey('theme') -> 'zune-theme' (cùng giá trị cũ nên không mất cài đặt của người dùng)
export const storageKey = (name) => `${site.id}-${name}`;
