import { repoUrl } from '../../config/site.js';

export default {
  order: 1, // thứ tự hiển thị (nhỏ đứng trước)
  tags: ['gift', 'html'],
  file: 'a-dumb-gift.js',
  desc: 'a small gift, hand-coded, runs straight in the browser',
  color: 'var(--js)',
  facts: [['type', 'gift page'], ['runs', 'straight in the browser'], ['mood', 'dumb but cute']], // hiện ở mục Featured trên trang chủ: [nhãn, giá trị]
  href: repoUrl('a-dumb-gift'),
};
