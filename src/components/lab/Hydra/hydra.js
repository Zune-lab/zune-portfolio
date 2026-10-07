import { TAU, clamp, lerp, pick, rand, randInt } from '../../../lib/math.js';

// Hydra: thân bò chậm dưới đất, nhiều cổ vươn lên. Mỗi cổ là một đường cong Bézier (gốc → đầu) có độ võng khi đầu ở gần,
// các đốt đuổi theo đường cong đó với độ trễ tăng dần về phía đầu nên cổ quất như roi. Mỗi đầu có tính cách riêng:
//   curious  nhìn theo con trỏ, nhanh
//   lazy     nhìn theo con trỏ, chậm rì
//   shy      né khi con trỏ lại gần, còn lại thì đung đưa
//   sleepy   gục xuống ngủ, chỉ dậy khi con trỏ chạm gần hoặc bị bấm
// Bấm vào khung: cả bọn lao tới điểm bấm và ngoạm.

const N = 16; // số đốt mỗi cổ
const HEAD = 1.45; // phóng to đầu so với bản vẽ gốc
const TYPES = ['curious', 'curious', 'curious', 'lazy', 'lazy', 'shy', 'sleepy', 'sleepy'];

// điểm trên Bézier bậc 2
const bez = (p0, p1, p2, k) => {
  const a = (1 - k) * (1 - k);
  const b = 2 * (1 - k) * k;
  const c = k * k;
  return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]];
};

function makeHead(i, n, baseX, baseY) {
  const slot = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5 … 0.5 dọc lưng
  const len = rand(120, 175);
  const type = pick(TYPES);
  const nodes = Array.from({ length: N + 1 }, (_, k) => ({ x: baseX + slot * k * 6, y: baseY - (len * k) / N }));
  return {
    slot,
    len,
    type,
    nodes,
    gx: baseX,
    gy: baseY - len,
    mouth: 0,
    asleep: type === 'sleepy',
    awake: 0,
    seed: rand(0, TAU),
    ox: slot * 120, // mỗi đầu nhắm lệch nhau một chút quanh con trỏ để không chụm thành một cục
    oy: (i % 2 ? -1 : 1) * 16,
    blink: rand(1, 4),
    lunge: 0,
  };
}

export function makeHydra(w, h) {
  const n = randInt(2, 7);
  const R = clamp(24 + n * 3.5, 30, 50); // thân to dần theo số đầu
  const gy = Math.round(h * 0.83); // mặt đất
  const body = { x: w * 0.5, vx: 0, face: 1, bob: 0 };

  const heads = Array.from({ length: n }, (_, i) => makeHead(i, n, body.x, gy));

  // 4 chân ngắn: bước luân phiên, mỗi lần chỉ một chân nhấc
  const feet = [-0.62, -0.25, 0.25, 0.62].map((off) => ({ off, x: body.x + off * R, lift: 0, from: 0, to: 0, t: 1 }));

  // đuôi lê trên đất
  const tail = Array.from({ length: 11 }, (_, i) => ({ x: body.x - R - i * 8, y: gy - 6 }));

  let seen = 0;
  const bodyH = R * 0.62;
  const domeY = (dx) => gy - bodyH * Math.sqrt(Math.max(0, 1 - (dx / R) ** 2));

  return {
    label: `${n} heads · they don't agree · click to bite`,
    step(api) {
      const { ctx, w, t, dt, colors, aim, mouse } = api;
      const clicked = mouse.clicks !== seen;
      if (clicked) seen = mouse.clicks;

      // ---- thân: lững thững đi theo con trỏ theo chiều ngang ----
      const want = clamp((aim.x - body.x) * 0.9, -62, 62);
      const still = Math.abs(aim.x - body.x) < R * 1.1;
      body.vx = lerp(body.vx, still ? 0 : want, Math.min(1, 3 * dt));
      body.x = clamp(body.x + body.vx * dt, R + 14, w - R - 14);
      if (Math.abs(body.vx) > 6) body.face = Math.sign(body.vx);
      const moving = Math.abs(body.vx) > 6;
      body.bob = moving ? Math.sin(t * 7) * 1.3 : lerp(body.bob, 0, Math.min(1, 6 * dt));
      const by = gy + body.bob;

      // ---- chân ----
      const stepping = feet.some((f) => f.t < 1);
      for (const f of feet) {
        if (f.t < 1) {
          f.t = Math.min(1, f.t + dt / 0.2);
          f.x = lerp(f.from, f.to, f.t);
          f.lift = Math.sin(f.t * Math.PI) * 7;
        } else {
          f.lift = 0;
          const home = body.x + f.off * R;
          if (!stepping && Math.abs(f.x - home) > 20) {
            f.from = f.x;
            f.to = home + body.face * 12;
            f.t = 0;
          }
        }
      }

      // ---- đuôi ----
      const tr = { x: body.x - body.face * (R - 2), y: by - 5 };
      tail[0].x = tr.x;
      tail[0].y = tr.y;
      for (let i = 1; i < tail.length; i++) {
        const a = tail[i - 1];
        const p = tail[i];
        p.y = lerp(p.y, gy - 3 - Math.sin(t * 2 + i * 0.5) * 2 * (i / tail.length), Math.min(1, 5 * dt));
        const ex = p.x - a.x;
        const ey = p.y - a.y;
        const d = Math.hypot(ex, ey) || 1e-6;
        p.x = a.x + (ex / d) * 8;
        p.y = a.y + (ey / d) * 8;
      }

      // ---- cổ + đầu ----
      for (const hd of heads) {
        const root = [body.x + hd.slot * R * 1.5, domeY(hd.slot * R * 1.5) + body.bob + 3];
        const reach = hd.len * 0.96;
        const tip = hd.nodes[N];

        if (clicked) {
          hd.lunge = 0.55;
          hd.asleep = false;
          hd.awake = 6;
          hd.lungeTo = [mouse.x, mouse.y];
        }
        hd.lunge = Math.max(0, hd.lunge - dt);

        // chọn mục tiêu theo tính cách
        let tx = aim.x + hd.ox;
        let ty = aim.y + hd.oy;
        let rate = 7;
        const dTip = Math.hypot(aim.x - tip.x, aim.y - tip.y);
        if (hd.lunge > 0) {
          [tx, ty] = hd.lungeTo;
          rate = 22;
        } else if (hd.type === 'lazy') {
          rate = 1.6;
        } else if (hd.type === 'shy') {
          const dr = Math.hypot(aim.x - root[0], aim.y - root[1]);
          if (dr < reach * 1.5) {
            // lùi ra xa con trỏ
            const ux = (root[0] - aim.x) / (dr || 1);
            tx = root[0] + ux * reach * 0.8;
            ty = root[1] - reach * 0.55;
            rate = 5;
          } else {
            tx = root[0] + Math.sin(t * 0.8 + hd.seed) * reach * 0.6;
            ty = root[1] - reach * 0.75;
            rate = 2;
          }
        } else if (hd.type === 'sleepy') {
          if (hd.asleep && dTip < 55) {
            hd.asleep = false;
            hd.awake = 6;
          }
          if (hd.asleep) {
            tx = root[0] + (hd.slot >= 0 ? 1 : -1) * reach * 0.55;
            ty = gy - 5;
            rate = 2.2;
          } else {
            hd.awake -= dt;
            if (hd.awake <= 0 && dTip > 140) hd.asleep = true;
          }
        }

        // khung hẹp (điện thoại): giữ đầu trong khung, không thò ra ngoài rồi bị cắt
        hd.gx = lerp(hd.gx, clamp(tx, 16, w - 16), Math.min(1, rate * dt));
        hd.gy = lerp(hd.gy, clamp(ty, 16, api.h - 16), Math.min(1, rate * dt));
        let vx = hd.gx - root[0];
        let vy = hd.gy - root[1];
        let d = Math.hypot(vx, vy) || 1;
        if (d > reach) {
          vx = (vx / d) * reach;
          vy = (vy / d) * reach;
          d = reach;
        }
        const p0 = root;
        const p2 = [root[0] + vx, root[1] + vy];
        // độ võng: đầu càng gần gốc thì cổ càng cong lên như cổ thiên nga
        const slack = Math.max(0, hd.len - d);
        let nx = -vy / d;
        let ny = vx / d;
        if (ny > 0) {
          nx = -nx;
          ny = -ny;
        }
        const bow = slack * 0.5 + Math.sin(t * 1.3 + hd.seed) * 7;
        const p1 = [(p0[0] + p2[0]) / 2 + nx * bow + hd.slot * 18, (p0[1] + p2[1]) / 2 + ny * bow - slack * 0.1];

        hd.nodes[0].x = root[0];
        hd.nodes[0].y = root[1];
        for (let k = 1; k <= N; k++) {
          const nd = hd.nodes[k];
          const [bx, by2] = bez(p0, p1, p2, k / N);
          // gốc cổ bám nhanh, càng gần đầu càng trễ -> cổ uốn như roi
          const r = (hd.lunge > 0 ? 26 : 14) - 9 * (k / N);
          nd.x = lerp(nd.x, bx, Math.min(1, r * dt));
          nd.y = lerp(nd.y, by2, Math.min(1, r * dt));
        }

        // miệng: há khi con trỏ gần đầu hoặc đang cắn
        const mTarget = hd.asleep ? 0 : hd.lunge > 0 ? 1 : clamp(1 - dTip / 100, 0, 1) * 0.8;
        hd.mouth = lerp(hd.mouth, mTarget, Math.min(1, 14 * dt));
        hd.blink -= dt;
        if (hd.blink < -0.12) hd.blink = rand(2, 5);
      }

      // ================= VẼ =================
      // mặt đất
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = colors.dim;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.moveTo(0, gy + 12);
      ctx.lineTo(api.w, gy + 12);
      ctx.stroke();
      ctx.setLineDash([]);

      // chân
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const f of feet) {
        const hipX = body.x + f.off * R * 0.8;
        const kneeX = (hipX + f.x) / 2 + body.face * 3;
        ctx.moveTo(hipX, by - 2);
        ctx.lineTo(kneeX, gy + 4 - f.lift * 0.6);
        ctx.lineTo(f.x + body.face * 3, gy + 12 - f.lift);
        ctx.moveTo(f.x + body.face * 3, gy + 12 - f.lift);
        ctx.lineTo(f.x + body.face * 8, gy + 12 - f.lift);
      }
      ctx.stroke();

      // đuôi: nét thân + gai nhỏ
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(tail[0].x, tail[0].y);
      for (let i = 1; i < tail.length; i++) ctx.lineTo(tail[i].x, tail[i].y);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < tail.length - 1; i++) {
        const a = tail[i - 1];
        const b = tail[i + 1];
        const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const k = (4.5 * (1 - i / tail.length)) / l;
        ctx.moveTo(tail[i].x, tail[i].y);
        ctx.lineTo(tail[i].x - (b.y - a.y) * k, tail[i].y + (b.x - a.x) * k);
      }
      ctx.stroke();

      // thân: vòm + vảy
      ctx.beginPath();
      ctx.ellipse(body.x, by, R, bodyH, 0, Math.PI, TAU);
      ctx.closePath();
      ctx.fillStyle = colors.panel;
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let r = 0; r < 3; r++) {
        for (let c = -3 + (r % 2) * 0.5; c <= 3; c++) {
          const sx = body.x + c * (R / 3.6);
          const sy = by - 6 - r * (bodyH / 3.2);
          if (Math.abs(sx - body.x) > R * 0.85 || sy < domeY(sx - body.x) + 6) continue;
          ctx.moveTo(sx - 3, sy - 1);
          ctx.quadraticCurveTo(sx, sy + 3, sx + 3, sy - 1);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // cổ + đầu (đầu xa nhất vẽ trước để đầu gần che lên)
      for (const hd of [...heads].sort((a, b) => a.nodes[N].y - b.nodes[N].y)) {
        const nodes = hd.nodes;
        // xương sườn dọc cổ
        ctx.strokeStyle = colors.dim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 1; k < N; k++) {
          const a = nodes[k - 1];
          const b = nodes[k + 1];
          const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const rib = 7 - 4.5 * (k / N);
          const px = -(b.y - a.y) / l;
          const py = (b.x - a.x) / l;
          ctx.moveTo(nodes[k].x - px * rib, nodes[k].y - py * rib);
          ctx.lineTo(nodes[k].x + px * rib, nodes[k].y + py * rib);
        }
        ctx.stroke();
        // trục sống lưng
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        for (let k = 1; k < N - 1; k++) {
          ctx.quadraticCurveTo(nodes[k].x, nodes[k].y, (nodes[k].x + nodes[k + 1].x) / 2, (nodes[k].y + nodes[k + 1].y) / 2);
        }
        ctx.lineTo(nodes[N].x, nodes[N].y);
        ctx.stroke();

        // đầu: hàm trên cố định, hàm dưới xoay quanh khớp
        const a = nodes[N - 2];
        const b = nodes[N];
        let ang = Math.atan2(b.y - a.y, b.x - a.x);
        // luôn quay mặt về phía con trỏ của chính nó (không lật ngửa): nếu cổ chúc xuống thì lật mặt
        const flip = Math.cos(ang) < 0 ? -1 : 1;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const P = (u, v) => [b.x + (u * ca - v * flip * sa) * HEAD, b.y + (u * sa + v * flip * ca) * HEAD];
        const open = hd.mouth * 0.75;
        const hc = Math.cos(open);
        const hs = Math.sin(open);
        const jaw = (u, v) => {
          // xoay quanh khớp hàm (4, 3.5)
          const du = u - 4;
          const dv = v - 3.5;
          return P(4 + du * hc - dv * hs, 3.5 + du * hs + dv * hc);
        };
        ctx.fillStyle = colors.panel;
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = 1.5;
        // hàm dưới
        ctx.beginPath();
        let q = jaw(2, 3.5);
        ctx.moveTo(q[0], q[1]);
        for (const [u, v] of [[10, 5], [18, 3.6], [21, 1.2]]) {
          q = jaw(u, v);
          ctx.lineTo(q[0], q[1]);
        }
        ctx.stroke();
        // hàm trên + sọ
        ctx.beginPath();
        q = P(-3, -4.5);
        ctx.moveTo(q[0], q[1]);
        for (const [u, v] of [[6, -6.5], [15, -3.6], [21, -0.6], [21, 1.2], [12, 1.4], [3, 3.5], [-3, 4.5]]) {
          q = P(u, v);
          ctx.lineTo(q[0], q[1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // sừng
        ctx.beginPath();
        q = P(-1, -5);
        ctx.moveTo(q[0], q[1]);
        q = P(-9, -10);
        ctx.lineTo(q[0], q[1]);
        q = P(-1, 5);
        ctx.moveTo(q[0], q[1]);
        q = P(-9, 10);
        ctx.lineTo(q[0], q[1]);
        ctx.stroke();
        // mắt
        const closed = hd.asleep || hd.blink < 0;
        const e = P(7, -2.4);
        ctx.strokeStyle = colors.amber;
        ctx.fillStyle = colors.amber;
        if (closed) {
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          const e2 = P(5, -2.4);
          ctx.moveTo(e2[0], e2[1]);
          ctx.lineTo(e[0] + (e[0] - e2[0]) * 0.4, e[1] + (e[1] - e2[1]) * 0.4);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(e[0], e[1], 1.7 * HEAD, 0, TAU);
          ctx.fill();
        }
        // zzz
        if (hd.asleep) {
          const zt = (t * 0.7 + hd.seed) % 1;
          ctx.globalAlpha = 1 - zt;
          ctx.fillStyle = colors.dim;
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.fillText('z', b.x + 10 + zt * 8, b.y - 14 - zt * 16);
          ctx.globalAlpha = 1;
        }
      }
      ctx.strokeStyle = colors.ink;
    },
  };
}
