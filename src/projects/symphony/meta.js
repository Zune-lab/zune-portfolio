import { repoUrl } from '../../config/site.js';

export default {
  order: 2, // thứ tự hiển thị (nhỏ đứng trước)
  tags: ['sound', 'js'],
  file: 'symphony.js',
  desc: 'experiments with sound and interaction on the web',
  color: 'var(--js)',
  facts: [['type', 'sound toy'], ['made with', 'audio + JS'], ['mood', 'press things, hear things']], // hiện ở mục Featured trên trang chủ: [nhãn, giá trị]
  href: repoUrl('symphony'),
};
