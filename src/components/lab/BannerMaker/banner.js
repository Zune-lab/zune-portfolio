// logic vẽ banner: tấm vải pixel cỡ tuỳ chọn, một màu nền + tối đa 6 lớp hoa văn xếp chồng,
// khung (hình dáng, bo góc, viền) cũng là một phần của ảnh nên lưu ra PNG giống hệt bản xem trước.
// file này không đụng tới DOM nên chạy được cả trong node để test.

export const MIN_SIZE = 12;
export const MAX_SIZE = 48;
export const MAX_LAYERS = 6;

// bảng 16 màu riêng của site
const DYE_LIST = [
  ['chalk', '#f2efe9'],
  ['ash', '#a3a7ad'],
  ['slate', '#4a5058'],
  ['ink', '#1b1d22'],
  ['bark', '#7a5238'],
  ['ember', '#c4352b'],
  ['tangerine', '#f08a24'],
  ['honey', '#f5c93a'],
  ['moss', '#7fb23a'],
  ['pine', '#2f6b3f'],
  ['teal', '#1f9c93'],
  ['sky', '#4cb4e6'],
  ['indigo', '#3b43b0'],
  ['grape', '#8a3fbf'],
  ['orchid', '#d556b8'],
  ['blush', '#f4a1b8'],
];

export const DYES = DYE_LIST.map(([id, hex]) => ({
  id,
  name: id,
  hex,
  rgb: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
}));

const DYE = Object.fromEntries(DYES.map((d) => [d.id, d]));

// một màu là id trong bảng 16 màu ('sky') hoặc mã hex tuỳ chọn ('#3ab0e6')
export const isCustom = (c) => typeof c === 'string' && c.startsWith('#');
const parseHex = (hex) => {
  const h = hex.length === 4 ? hex.replace(/[^#]/g, (d) => d + d) : hex;
  const rgb = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return rgb.every((n) => Number.isFinite(n)) ? rgb : [0, 0, 0];
};
const rgbOf = (c) => (isCustom(c) ? parseHex(c) : (DYE[c] ?? DYE.ink).rgb);
export const hexOf = (c) => (isCustom(c) ? c.toLowerCase() : (DYE[c] ?? DYE.ink).hex);
export const colorName = (c) => (isCustom(c) ? c.toLowerCase() : (DYE[c]?.name ?? c));

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const clampInt = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n)));

export const SHAPES = [
  { id: 'rect', name: 'rectangle' },
  { id: 'swallow', name: 'swallowtail' },
  { id: 'point', name: 'pennant' },
  { id: 'arch', name: 'arch' },
  { id: 'oval', name: 'oval' },
];

export const DEFAULT_FRAME = { w: 20, h: 40, shape: 'rect', radius: 0, border: 0, borderColor: 'ink' };

// hoa văn dạng bitmap (bug, cat, bolt...): '#' là pixel được tô, tự phóng to theo cỡ vải
const bitmap = (rows) => {
  const cols = rows[0].length;
  return (c) => {
    const s = Math.max(1, Math.min(Math.floor((c.w * 0.9) / cols), Math.floor((c.h * 0.8) / rows.length)));
    const ox = Math.round((c.w - cols * s) / 2);
    const oy = Math.round((c.h - rows.length * s) / 2);
    const bx = Math.floor((c.x - ox) / s);
    const by = Math.floor((c.y - oy) / s);
    return rows[by]?.[bx] === '#' ? 1 : 0;
  };
};

const BAND = 0.11; // nửa bề rộng sọc chéo, tính theo tỉ lệ vải
const diagDown = (c) => Math.abs(c.ny - c.nx) < BAND; // ↘
const diagUp = (c) => Math.abs(c.ny - (1 - c.nx)) < BAND; // ↙

// mỗi mask nhận c = { x, y, u, v, w, h, nx, ny, m }:
// (x, y) ô pixel, (u, v) tâm ô, (nx, ny) vị trí 0..1 trên vải, m = cạnh ngắn; trả về độ phủ 0..1
export const PATTERNS = [
  { id: 'stripe_bottom', name: 'bottom stripe', mask: (c) => c.ny >= 0.8 },
  { id: 'stripe_top', name: 'top stripe', mask: (c) => c.ny < 0.2 },
  { id: 'stripe_left', name: 'left stripe', mask: (c) => c.nx < 0.3 },
  { id: 'stripe_right', name: 'right stripe', mask: (c) => c.nx >= 0.7 },
  { id: 'stripe_center', name: 'center stripe', mask: (c) => c.nx >= 0.35 && c.nx < 0.65 },
  { id: 'stripe_middle', name: 'middle stripe', mask: (c) => c.ny >= 0.4 && c.ny < 0.6 },
  { id: 'stripe_down', name: 'diagonal ↘', mask: diagDown },
  { id: 'stripe_up', name: 'diagonal ↙', mask: diagUp },
  { id: 'small_stripes', name: 'small stripes', mask: (c) => c.x % 4 === 1 || c.x % 4 === 2 },
  { id: 'saltire', name: 'saltire ✕', mask: (c) => diagDown(c) || diagUp(c) },
  {
    id: 'cross',
    name: 'cross +',
    mask: (c) => Math.abs(c.u - c.w / 2) < c.m * 0.15 || Math.abs(c.v - c.h / 2) < c.m * 0.15,
  },
  {
    id: 'border',
    name: 'border',
    mask: (c) => {
      const b = Math.max(1, Math.round(c.m * 0.1));
      return c.x < b || c.x >= c.w - b || c.y < b || c.y >= c.h - b;
    },
  },
  { id: 'gradient_top', name: 'gradient ↓', mask: (c) => clamp01(1 - c.ny / 0.7) },
  { id: 'gradient_bottom', name: 'gradient ↑', mask: (c) => clamp01(1 - (1 - c.ny) / 0.7) },
  { id: 'circle', name: 'circle', mask: (c) => (c.u - c.w / 2) ** 2 + (c.v - c.h / 2) ** 2 <= (c.m * 0.325) ** 2 },
  { id: 'rhombus', name: 'rhombus', mask: (c) => Math.abs(c.nx - 0.5) / 0.4 + Math.abs(c.ny - 0.5) / 0.4 <= 1 },
  { id: 'half_top', name: 'half top', mask: (c) => c.ny < 0.5 },
  { id: 'half_bottom', name: 'half bottom', mask: (c) => c.ny >= 0.5 },
  { id: 'half_left', name: 'half left', mask: (c) => c.nx < 0.5 },
  { id: 'half_right', name: 'half right', mask: (c) => c.nx >= 0.5 },
  { id: 'corner_bl', name: 'corner ◣', mask: (c) => c.ny > c.nx },
  { id: 'corner_tr', name: 'corner ◥', mask: (c) => c.ny < c.nx },
  { id: 'corner_tl', name: 'corner ◤', mask: (c) => c.ny < 1 - c.nx },
  { id: 'corner_br', name: 'corner ◢', mask: (c) => c.ny > 1 - c.nx },
  { id: 'triangle_up', name: 'triangle ▲', mask: (c) => c.ny > 0.5 && Math.abs(c.nx - 0.5) <= c.ny - 0.5 },
  { id: 'triangle_down', name: 'triangle ▼', mask: (c) => c.ny < 0.5 && Math.abs(c.nx - 0.5) <= 0.5 - c.ny },
  {
    id: 'bricks',
    name: 'bricks',
    mask: (c) => c.y % 5 === 0 || (c.x + (Math.floor(c.y / 5) % 2) * 5) % 10 === 0,
  },
  {
    id: 'bug',
    name: 'bug',
    mask: bitmap([
      '..#...#..',
      '...#.#...',
      '..#####..',
      '.#######.',
      '#.#####.#',
      '..#####..',
      '#.#####.#',
      '...###...',
    ]),
  },
  {
    id: 'cat',
    name: 'cat',
    mask: bitmap([
      '#.......#',
      '##.....##',
      '#########',
      '##.###.##',
      '#########',
      '####.####',
      '.#######.',
    ]),
  },
  {
    id: 'moon',
    name: 'moon',
    mask: bitmap([
      '..####..',
      '.###....',
      '###.....',
      '###.....',
      '###.....',
      '.###....',
      '..####..',
    ]),
  },
  {
    id: 'bolt',
    name: 'bolt',
    mask: bitmap([
      '....##',
      '...##.',
      '..##..',
      '.#####',
      '...##.',
      '..##..',
      '.##...',
      '##....',
    ]),
  },
  {
    id: 'star',
    name: 'star',
    mask: bitmap([
      '....#....',
      '...###...',
      '#########',
      '.#######.',
      '..#####..',
      '..##.##..',
      '.##...##.',
    ]),
  },
  {
    id: 'heart',
    name: 'heart',
    mask: bitmap([
      '.###.###.',
      '#########',
      '#########',
      '#########',
      '.#######.',
      '..#####..',
      '...###...',
      '....#....',
    ]),
  },
];

export const PATTERN = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));

// pixel nào nằm trong khung: hình dáng + bo góc (mỗi pixel hoặc có hoặc không, không làm mịn)
function frameMask(w, h, shape, radius) {
  const m = Math.min(w, h);
  const r = (clampInt(radius, 0, 50) / 100) * m;
  const inside = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x + 0.5;
      const v = y + 0.5;
      const cx = Math.min(Math.max(u, r), w - r);
      const cy = Math.min(Math.max(v, r), h - r);
      let ok = (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
      const dx = Math.abs(u - w / 2) / (w / 2);
      if (ok && shape === 'swallow') ok = v <= h - 0.22 * h * (1 - dx);
      else if (ok && shape === 'point') ok = v <= h * 0.5 || dx <= (h - v) / (h * 0.5);
      else if (ok && shape === 'arch') {
        const rr = Math.min(w / 2, h);
        ok = v >= rr || (u - w / 2) ** 2 + (v - rr) ** 2 <= rr * rr;
      } else if (shape === 'oval') ok = dx ** 2 + ((v - h / 2) / (h / 2)) ** 2 <= 1;
      inside[y * w + x] = ok ? 1 : 0;
    }
  }
  return inside;
}

// trộn từng lớp lên nền rồi cắt theo khung, trả về RGBA w*h (Uint8ClampedArray), ngoài khung trong suốt.
// paint là hình vẽ tay phủ lên trên cùng: [{ color, cells: [[x, y], ...] }]
export function renderBanner(base, layers, frame = DEFAULT_FRAME, paint = []) {
  const f = { ...DEFAULT_FRAME, ...frame };
  const w = clampInt(f.w, MIN_SIZE, MAX_SIZE);
  const h = clampInt(f.h, MIN_SIZE, MAX_SIZE);
  const bw = clampInt(f.border, 0, 4);
  const inside = frameMask(w, h, f.shape, f.radius);
  const out = new Uint8ClampedArray(w * h * 4);
  const baseRgb = rgbOf(base);
  const borderRgb = rgbOf(f.borderColor);
  const stack = layers.map((l) => ({ mask: PATTERN[l.pattern].mask, rgb: rgbOf(l.color) }));
  const m = Math.min(w, h);
  const isOut = (x, y) => x < 0 || y < 0 || x >= w || y >= h || !inside[y * w + x];

  // pixel nằm trong khung và cách mép khung không quá bw ô thì là viền
  const onBorder = (x, y) => {
    for (let dy = -bw; dy <= bw; dy++) {
      for (let dx = -bw; dx <= bw; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= bw && isOut(x + dx, y + dy)) return true;
      }
    }
    return false;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside[y * w + x]) continue;
      const i = (y * w + x) * 4;
      if (bw > 0 && onBorder(x, y)) {
        [out[i], out[i + 1], out[i + 2]] = borderRgb;
        out[i + 3] = 255;
        continue;
      }
      let [r, g, b] = baseRgb;
      const u = x + 0.5;
      const v = y + 0.5;
      const c = { x, y, u, v, w, h, nx: u / w, ny: v / h, m };
      for (const layer of stack) {
        const a = Number(layer.mask(c));
        if (a > 0) {
          r += (layer.rgb[0] - r) * a;
          g += (layer.rgb[1] - g) * a;
          b += (layer.rgb[2] - b) * a;
        }
      }
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }

  // hình vẽ tay nằm trên cùng, chỉ hiện trong khung; ô nằm ngoài vải được giữ lại nhưng không vẽ
  for (const { color, cells } of paint) {
    const rgb = rgbOf(color);
    for (const [x, y] of cells) {
      if (x < 0 || y < 0 || x >= w || y >= h || !inside[y * w + x]) continue;
      const i = (y * w + x) * 4;
      [out[i], out[i + 1], out[i + 2]] = rgb;
      out[i + 3] = 255;
    }
  }
  return out;
}
