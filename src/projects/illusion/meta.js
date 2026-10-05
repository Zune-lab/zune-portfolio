import { repoUrl } from '../../config/site.js';

export default {
  order: 3, // thứ tự hiển thị (nhỏ đứng trước)
  file: 'illusion.css',
  desc: 'playing with visual illusions in pure CSS',
  color: 'var(--css-lang)',
  facts: [['type', 'visual illusion'], ['made with', 'pure CSS'], ['mood', 'stare at it for a while']], // hiện ở mục Featured trên trang chủ: [nhãn, giá trị]
  href: repoUrl('illusion'),
};
