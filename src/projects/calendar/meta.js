import { repoUrl } from '../../config/site.js';

export default {
  order: 5, // thứ tự hiển thị (nhỏ đứng trước)
  file: 'calendar.js',
  desc: 'a compact little calendar app, built by hand',
  color: 'var(--js)',
  href: repoUrl('calender'),
  manualShot: true, // trang có màn login -> tự chụp tay (sau khi đăng nhập), lưu public/previews/calendar.png
};
