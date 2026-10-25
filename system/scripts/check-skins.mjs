// Kiểm tra độ tương phản (WCAG) của MỌI skin ở mọi chế độ: node system/scripts/check-skins.mjs
// Đọc bảng màu thẳng từ src/styles/skins/<id>.css và danh sách chế độ từ src/config/skins.js, nên thêm skin mới là tự được kiểm tra.
// Thoát với mã 1 nếu có cặp màu nào dưới ngưỡng (dùng được trong CI).
import { readdirSync, readFileSync } from 'node:fs';
import { SKINS } from '../../src/config/skins.js';

const skinsDir = new URL('../../src/styles/skins/', import.meta.url);
// mỗi skin một file trong src/styles/skins/ (bảng màu nằm trong <id>.css); gộp hết lại để quét
const css = readdirSync(skinsDir)
  .filter((f) => f.endsWith('.css') && f !== 'index.css')
  .map((f) => readFileSync(new URL(f, skinsDir), 'utf8'))
  .join('\n');

// các khối bảng màu: `:root[data-skin='x'] { ... }` (bản tối / bản duy nhất) và `:root[data-skin='x'][data-theme='light'] { ... }`
const blocks = {};
for (const m of css.matchAll(/:root\[data-skin='([a-z-]+)'\](\[data-theme='light'\])?\s*\{([^}]*)\}/g)) {
  const vars = {};
  for (const v of m[3].matchAll(/(--[a-z-]+):\s*(#[0-9a-fA-F]{3,6})\s*[;\s]/g)) vars[v[1]] = v[2];
  blocks[`${m[1]}${m[2] ? ':light' : ''}`] = vars;
}

const lum = (hex) => {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [màu trước, màu nền, ngưỡng, ý nghĩa]
const CHECKS = [
  ['--text', '--bg', 4.5, 'body text'],
  ['--text', '--panel', 4.5, 'text on cards'],
  ['--text', '--inset', 4.5, 'text in terminal'],
  ['--text-dim', '--bg', 4.5, 'secondary text'],
  ['--text-dim', '--panel', 4.5, 'secondary text on cards'],
  ['--text-dim', '--inset', 4.5, 'secondary text in terminal'],
  ['--amber', '--bg', 4.5, 'accent links'],
  ['--amber', '--panel', 4.5, 'accent on cards'],
  ['--on-amber', '--amber', 4.5, 'text on accent buttons'],
  ['--green', '--inset', 3, 'prompt / online dot'],
  ['--js', '--inset', 3, 'code tag'],
  ['--css-lang', '--inset', 3, 'code tag'],
  ['--line', '--bg', 1.15, 'border visible'],
];

let bad = 0;
let total = 0;
for (const skin of SKINS) {
  if (skin.id === 'zune') continue; // skin gốc: bảng màu nằm ở index.css, không thuộc phạm vi file này
  for (const mode of skin.modes) {
    const vars = mode === 'light' && skin.modes.length > 1 ? blocks[`${skin.id}:light`] : blocks[skin.id];
    if (!vars) {
      console.log(`✗ ${skin.id} (${mode}): no palette block found in src/styles/skins/`);
      bad++;
      continue;
    }
    for (const [fg, bg, min, what] of CHECKS) {
      total++;
      if (!vars[fg] || !vars[bg]) {
        console.log(`✗ ${skin.id} (${mode}): missing ${!vars[fg] ? fg : bg}`);
        bad++;
        continue;
      }
      const r = ratio(vars[fg], vars[bg]);
      if (r < min) {
        console.log(`✗ ${skin.id.padEnd(12)} ${mode.padEnd(5)} ${fg} ${vars[fg]} on ${bg} ${vars[bg]} = ${r.toFixed(2)} (< ${min}) ${what}`);
        bad++;
      }
    }
  }
}
console.log(bad ? `\n${bad} problem(s) in ${total} checks` : `all ${total} contrast checks pass`);
process.exit(bad ? 1 : 0);
