import { repoUrl } from '../../config/site.js';

export default {
  order: 1, // chỉnh số này để đổi chỗ trong danh sách
  tags: ['sound', 'game', 'js'],
  file: 'hem-beat.js',
  desc: 'an Incredibox-style beat maker with Vietnamese street sounds, all synthesized',
  color: 'var(--js)',
  facts: [['type', 'music game'], ['made with', 'Web Audio + JS'], ['mood', 'invite the neighbours, light up the alley']],
  href: repoUrl('hem-beat'),
};
