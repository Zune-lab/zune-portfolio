import { repoUrl } from '../../config/site.js';

export default {
  order: 6, // thứ tự hiển thị (nhỏ đứng trước)
  file: 'a-gift-for-u.css',
  desc: 'another gift page, focused on CSS details',
  color: 'var(--css-lang)',
  facts: [['type', 'gift page'], ['focus', 'CSS details']],
  href: repoUrl('a-gift-for-u'),
};
