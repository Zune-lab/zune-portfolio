// Nét vẽ dùng chung cho các sinh vật kinh dị trong lab (Parasite, Mother, Choir): khuôn mặt "gần giống người nhưng lệch",
// ngón tay có đốt và móng, bàn tay. Mọi thứ vẽ bằng canvas 2D, không ảnh.
//
// Nguyên tắc (rút từ tư liệu về uncanny valley): giống người nhưng sai một chút, KHÔNG đối xứng, mắt trên mặt hầu như đứng yên
// (mắt luôn nhìn thẳng ra màn hình, không chớp), cử động hàm to hơn mức cơ thể cho phép, và không để lộ hết trong ánh sáng.
import { TAU } from './math.js';

export const SKIN = '#d2cbbb';
export const FLESH = '#cfae9a';
export const FLESH_D = '#4b2b25';
export const BLOOD = '#7d1a1a';
export const BONE = '#ebe4d2';
const MOUTH = '#050304';

const qb = (p, a, c, b) => (1 - p) * (1 - p) * a + 2 * p * (1 - p) * c + p * p * b;

// Mặt nhìn thẳng. Tọa độ gốc ở tâm đầu, S = nửa bề ngang sọ.
//   jaw    0..1  hàm trật xuống (mặt dài ra tới 1.35 S, vượt xa giải phẫu thật)
//   eye    0..1  mở mắt (0 = nhắm, có thể kèm `rem`: nhãn cầu lăn dưới mí khi ngủ)
//   pupil  0..1  đồng tử (0 = chấm nhỏ, 1 = giãn to)
//   smile  0..1  khóe miệng kéo lên và rạch ngang má (nụ cười rộng hơn khuôn mặt)
//   aspect tỉ lệ cao/rộng của sọ (1.6 = dài, gầy)
export function drawFace(ctx, o) {
  const { x, y, S, jaw = 0, eye = 1, pupil = 0.4, smile = 0, tilt = 0, seed = 0, alpha = 1, aspect = 1.6, skin = SKIN, rem = 0, dim = 1 } = o;
  if (S < 1.2) return;
  const hh = S * aspect;
  const drop = jaw * 1.35 * S;
  const lw = Math.max(0.6, S * 0.045);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.globalAlpha *= alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // sọ + hàm
  ctx.beginPath();
  ctx.moveTo(-S, 0);
  ctx.ellipse(0, 0, S, hh, 0, Math.PI, TAU);
  ctx.bezierCurveTo(S, hh * 0.75, 0.62 * S, hh * 0.85 + drop * 0.5, 0.52 * S, hh + drop);
  ctx.quadraticCurveTo(0, hh + drop + S * 0.16, -0.52 * S, hh + drop);
  ctx.bezierCurveTo(-0.62 * S, hh * 0.85 + drop * 0.5, -S, hh * 0.75, -S, 0);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  const g = ctx.createLinearGradient(0, -hh, 0, hh + drop);
  g.addColorStop(0, 'rgba(0,0,0,0.05)');
  g.addColorStop(1, `rgba(0,0,0,${0.4 * dim})`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = lw;
  ctx.stroke();

  // má hóp
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * 0.64 * S, 0.5 * S + drop * 0.15, 0.3 * S, 0.55 * S, sx * 0.2, 0, TAU);
    ctx.fill();
  }

  // hốc mắt + mắt. Mắt phải to hơn và thấp hơn một chút (bất đối xứng).
  const eyes = [
    { cx: -0.46 * S, cy: -0.32 * S, k: 1 },
    { cx: 0.46 * S, cy: -0.27 * S, k: 1.14 },
  ];
  for (const e of eyes) {
    ctx.fillStyle = 'rgba(12,6,6,0.55)';
    ctx.beginPath();
    ctx.ellipse(e.cx, e.cy, 0.36 * S * e.k, 0.31 * S * e.k, 0, 0, TAU);
    ctx.fill();
    const r = 0.27 * S * e.k;
    if (eye > 0.06) {
      ctx.fillStyle = '#ece7da';
      ctx.beginPath();
      ctx.ellipse(e.cx, e.cy, r, r * eye, 0, 0, TAU);
      ctx.fill();
      if (S > 9) {
        ctx.strokeStyle = 'rgba(140,20,20,0.55)';
        ctx.lineWidth = Math.max(0.5, S * 0.012);
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU + seed;
          ctx.moveTo(e.cx + Math.cos(a) * r * 0.98, e.cy + Math.sin(a) * r * eye * 0.98);
          ctx.lineTo(e.cx + Math.cos(a + 0.2) * r * 0.5, e.cy + Math.sin(a + 0.2) * r * eye * 0.5);
        }
        ctx.stroke();
      }
      // đồng tử: một chấm đen nằm chính giữa, nhìn thẳng ra màn hình
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(e.cx, e.cy, S * (0.045 + 0.075 * pupil) * e.k, Math.min(S * (0.045 + 0.075 * pupil) * e.k, r * eye), 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.ellipse(e.cx, e.cy, r, r * eye, 0, 0, TAU);
      ctx.stroke();
    } else {
      // mắt nhắm: mí cong xuống, nhãn cầu lăn dưới mí (như đang mơ)
      if (rem) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(e.cx + rem * 0.12 * S, e.cy + 0.03 * S, 0.13 * S, 0.1 * S, 0, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = lw * 1.1;
      ctx.beginPath();
      ctx.moveTo(e.cx - r, e.cy);
      ctx.quadraticCurveTo(e.cx, e.cy + 0.2 * S * e.k, e.cx + r, e.cy);
      ctx.stroke();
      if (S > 10) {
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const u = -0.7 + k * 0.35;
          ctx.moveTo(e.cx + u * r, e.cy + 0.15 * S * (1 - u * u));
          ctx.lineTo(e.cx + u * r * 1.1, e.cy + 0.15 * S * (1 - u * u) + 0.1 * S);
        }
        ctx.stroke();
      }
    }
  }

  // mũi: hai khe nhỏ
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * 0.1 * S, 0.34 * S, 0.035 * S, 0.075 * S, sx * 0.3, 0, TAU);
    ctx.fill();
  }

  // miệng: hình thấu kính rộng gần hết bề ngang mặt; hàm trật thì trống hoác
  const my = 0.64 * S + drop * 0.04;
  const mw = (0.74 + smile * 0.22) * S;
  const cl = smile * 0.45 * S;
  const y0 = my - cl;
  const ucy = my + (0.1 + smile * 0.9) * S;
  const upperMid = qb(0.5, y0, ucy, y0);
  const D = 0.04 * S + jaw * 1.2 * S;
  const lcy = 2 * (upperMid + D) - y0;
  ctx.beginPath();
  ctx.moveTo(-mw, y0);
  ctx.quadraticCurveTo(0, ucy, mw, y0);
  ctx.quadraticCurveTo(0, lcy, -mw, y0);
  ctx.closePath();
  ctx.fillStyle = MOUTH;
  ctx.fill();
  if (D > 0.12 * S) {
    ctx.fillStyle = '#e9e3d3';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = Math.max(0.4, S * 0.012);
    const n = 12;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < n; i++) {
        const p = 0.08 + (0.84 * (i + (row ? 0.5 : 0))) / n;
        const px = qb(p, -mw, 0, mw);
        const py = row ? qb(p, y0, lcy, y0) : qb(p, y0, ucy, y0);
        const tl = Math.min(D * 0.42, S * (0.1 + 0.11 * Math.abs(Math.sin(i * 7.3 + seed + row))));
        const dir = row ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(px - S * 0.04, py);
        ctx.lineTo(px + S * 0.04, py);
        ctx.lineTo(px + (i % 3 === 0 ? S * 0.012 : 0), py + dir * tl);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.lineWidth = lw * 1.1;
  ctx.beginPath();
  ctx.moveTo(-mw, y0);
  ctx.quadraticCurveTo(0, ucy, mw, y0);
  ctx.stroke();
  if (smile > 0.3 || jaw > 0.55) {
    // rạch khóe miệng lên má
    const k = Math.max(smile, jaw * 0.7);
    ctx.beginPath();
    for (const sx of [-1, 1]) {
      ctx.moveTo(sx * mw, y0);
      ctx.lineTo(sx * (mw + 0.3 * S * k), y0 - 0.34 * S * k);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Ngón tay 3 đốt có nếp gấp ở khớp và móng. `curl` là độ cong mỗi khớp (radian); `w` là độ dày.
export function drawFinger(ctx, x, y, ang, len, curl, w, o = {}) {
  const flesh = o.flesh ?? FLESH;
  const edge = o.edge ?? FLESH_D;
  const segs = [1, 0.82, 0.62];
  const pts = [[x, y]];
  let a = ang;
  let px = x;
  let py = y;
  for (let i = 0; i < 3; i++) {
    a += curl * (0.6 + 0.4 * i);
    px += Math.cos(a) * len * segs[i];
    py += Math.sin(a) * len * segs[i];
    pts.push([px, py]);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [col, width] of [
    [edge, w + Math.max(1, w * 0.5)],
    [flesh, w],
  ]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  if (w > 2) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(0.6, w * 0.16);
    ctx.beginPath();
    for (let i = 1; i < 3; i++) {
      const dx = pts[i + 1][0] - pts[i - 1][0];
      const dy = pts[i + 1][1] - pts[i - 1][1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = (-dy / l) * w * 0.38;
      const ny = (dx / l) * w * 0.38;
      ctx.moveTo(pts[i][0] + nx, pts[i][1] + ny);
      ctx.lineTo(pts[i][0] - nx, pts[i][1] - ny);
    }
    ctx.stroke();
  }
  // móng
  const [tx, ty] = pts[3];
  const la = Math.atan2(pts[3][1] - pts[2][1], pts[3][0] - pts[2][0]);
  ctx.fillStyle = o.nail ?? '#e8dccd';
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(0.5, w * 0.12);
  ctx.beginPath();
  ctx.ellipse(tx - Math.cos(la) * w * 0.42, ty - Math.sin(la) * w * 0.42, w * 0.58, w * 0.4, la, 0, TAU);
  ctx.fill();
  ctx.stroke();
  return pts;
}

// Bàn tay: lòng bàn tay hình bầu dục + 5 ngón dài hơn bình thường. `ang` là hướng ngón giữa, `size` là bề ngang bàn.
// fingers[i] = độ cong riêng từng ngón (cho phép giật không đồng bộ).
export function drawHand(ctx, x, y, ang, size, spread, fingers, o = {}) {
  const flesh = o.flesh ?? FLESH;
  const edge = o.edge ?? FLESH_D;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.52, size * 0.46, 0, 0, TAU);
  ctx.fillStyle = flesh;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.stroke();
  ctx.restore();
  const lens = [0.62, 0.78, 0.86, 0.78, 0.55];
  const offs = [-0.9, -0.45, 0, 0.45, 0.9];
  for (let i = 0; i < 5; i++) {
    const a = ang + offs[i] * spread;
    const bx = x + Math.cos(ang) * size * 0.4 + Math.cos(ang + Math.PI / 2) * offs[i] * size * 0.4;
    const by = y + Math.sin(ang) * size * 0.4 + Math.sin(ang + Math.PI / 2) * offs[i] * size * 0.4;
    drawFinger(ctx, bx, by, a, size * lens[i], fingers[i] ?? 0, size * 0.15, o);
  }
}
