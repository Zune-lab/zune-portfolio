import { TAU, angDiff, clamp, rand, randInt } from '../../../lib/math.js';

// Sứa: chuông co bóp theo nhịp, mỗi lần co đẩy cả con tiến một đoạn rồi trôi theo quán tính.
// Xúc tu là các chuỗi verlet gắn ở mép chuông, kéo lê phía sau như trong nước thật.
// Quanh nó có "sinh vật phù du" sáng lên màu hổ phách khi sứa bơi ngang qua.

const SEGS = 14;

function makeTentacle(side, len, kind, x, y, ang) {
  const seg = len / SEGS;
  const nodes = Array.from({ length: SEGS }, (_, i) => {
    const px = x - Math.cos(ang) * seg * i;
    const py = y - Math.sin(ang) * seg * i;
    return { x: px, y: py, px, py };
  });
  return { side, seg, kind, nodes, seed: rand(0, TAU) };
}

export function makeJellyfish(w, h) {
  const R = rand(24, 36);
  const nThin = randInt(7, 12);
  const nArms = randInt(2, 4);
  const j = { x: w * 0.3, y: h * 0.5, vx: 0, vy: 0, ang: 0, phase: rand(0, 1), s: 0 };

  const tentacles = [];
  for (let i = 0; i < nThin; i++) {
    const side = nThin === 1 ? 0 : -0.92 + (1.84 * i) / (nThin - 1);
    tentacles.push(makeTentacle(side, rand(70, 125), 'thin', j.x, j.y, j.ang));
  }
  for (let i = 0; i < nArms; i++) {
    const side = nArms === 1 ? 0 : -0.35 + (0.7 * i) / (nArms - 1);
    tentacles.push(makeTentacle(side, rand(100, 150), 'arm', j.x, j.y, j.ang));
  }

  // sinh vật phù du: chấm trôi chậm, sáng lên khi sứa lại gần
  const plankton = Array.from({ length: 28 }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    vy: rand(3, 10),
    tw: rand(0, TAU),
  }));

  let seen = 0;
  let panic = 0;
  let from = { x: 0, y: 0 };

  return {
    label: `${nThin + nArms} tentacles · click to startle it`,
    step(api) {
      const { ctx, w, h, t, dt, colors, aim, mouse } = api;
      const f = Math.min(dt * 60, 3);

      // bấm = dọa: co bóp dồn dập và bỏ chạy khỏi chỗ vừa bấm
      if (mouse.clicks !== seen) {
        seen = mouse.clicks;
        panic = 1.3;
        from = { x: mouse.x, y: mouse.y };
        j.phase = 0;
        j.s = 0;
      }
      panic = Math.max(0, panic - dt);
      const scared = panic > 0;

      const dx = aim.x - j.x;
      const dy = aim.y - j.y;
      const dist = Math.hypot(dx, dy) || 1;
      // bỏ chạy khỏi chỗ bị dọa nhưng cong dần về giữa khung (không đâm đầu vào tường); ở gần con trỏ thì dựng chuông lên
      // trời để xúc tu rủ xuống; ở xa thì quay đầu về phía con trỏ
      let want;
      if (scared) {
        const ax = j.x - from.x;
        const ay = j.y - from.y;
        const al = Math.hypot(ax, ay) || 1;
        const bx = w / 2 - j.x;
        const by = h / 2 - j.y;
        const bl = Math.hypot(bx, by) || 1;
        want = Math.atan2(ay / al + (by / bl) * 0.8, ax / al + (bx / bl) * 0.8);
      } else {
        want = dist > 70 ? Math.atan2(dy, dx) : -Math.PI / 2;
      }
      const turn = scared ? 7 : 2.4;
      j.ang += angDiff(want, j.ang) * Math.min(1, turn * dt);

      // nhịp co bóp: co nhanh (0 → 1), giãn chậm (1 → 0). Chỉ lúc đang co mới có lực đẩy
      const rate = scared ? 2.2 : 0.55 + 0.5 * clamp(dist / 220, 0, 1);
      j.phase = (j.phase + rate * dt) % 1;
      const s = j.phase < 0.28 ? Math.sin((j.phase / 0.28) * (Math.PI / 2)) : Math.cos(((j.phase - 0.28) / 0.72) * (Math.PI / 2));
      const ds = Math.max(0, s - j.s);
      j.s = s;
      const power = (scared ? 170 : 125) * (scared ? 1 : clamp(dist / 90, 0.25, 1));
      j.vx += Math.cos(j.ang) * ds * power;
      j.vy += Math.sin(j.ang) * ds * power;
      const drag = Math.exp(-(1.5 + (!scared && dist < 70 ? 1.5 : 0)) * dt);
      j.vx *= drag;
      j.vy *= drag;
      j.x += j.vx * dt;
      j.y += j.vy * dt;
      // tường: kẹp cứng trong khung (chừa chỗ cho chuông), triệt vận tốc đâm vào tường
      const mx = R + 6;
      const my = R + 6;
      if (j.x < mx || j.x > w - mx) {
        j.x = clamp(j.x, mx, w - mx);
        j.vx *= -0.2;
      }
      if (j.y < my || j.y > h - my) {
        j.y = clamp(j.y, my, h - my);
        j.vy *= -0.2;
      }

      const wb = R * (1 - 0.24 * s);
      const hb = R * 0.82 * (1 + 0.14 * s);
      const ca = Math.cos(j.ang);
      const sa = Math.sin(j.ang);
      const wx = (al, sd) => j.x + al * ca - sd * sa;
      const wy = (al, sd) => j.y + al * sa + sd * ca;
      const rimAlong = (sd) => -1 + Math.sin((sd / wb) * 7 + t * 6) * 1.6;

      // ---- sinh vật phù du (vẽ trước, nằm sau sứa) ----
      for (const p of plankton) {
        p.y += p.vy * dt;
        p.x += Math.sin(t * 0.6 + p.tw) * 5 * dt;
        const pdx = p.x - j.x;
        const pdy = p.y - j.y;
        const d = Math.hypot(pdx, pdy);
        const glow = clamp(1 - d / (R * 3.4), 0, 1);
        if (glow > 0) {
          p.x += j.vx * 0.5 * glow * dt;
          p.y += j.vy * 0.5 * glow * dt;
        }
        if (p.y > h + 4) {
          p.y = -4;
          p.x = rand(0, w);
        }
        if (p.x < -4) p.x = w + 4;
        else if (p.x > w + 4) p.x = -4;
        ctx.globalAlpha = 0.28 + 0.7 * glow;
        ctx.fillStyle = glow > 0.04 ? colors.amber : colors.dim;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 + 1.3 * glow, 0, TAU);
        ctx.fill();
      }

      // ---- xúc tu ----
      for (const tc of tentacles) {
        const sd = tc.side * wb;
        const nodes = tc.nodes;
        nodes[0].x = wx(rimAlong(sd), sd);
        nodes[0].y = wy(rimAlong(sd), sd);
        for (let i = 1; i < SEGS; i++) {
          const n = nodes[i];
          const k = i / SEGS;
          const vx = (n.x - n.px) * 0.92; // nước cản mạnh: xúc tu không quất như dây thừng
          const vy = (n.y - n.py) * 0.92;
          n.px = n.x;
          n.py = n.y;
          // (verlet: lực ở đây là GIA TỐC cộng thẳng vào vị trí mỗi khung, nên phải rất nhỏ)
          // sóng nước ngang + lực kéo ngược hướng chuông để xúc tu luôn rủ ra phía sau
          const wave = Math.sin(t * 2.2 - i * 0.55 + tc.seed) * 0.05 * k * (scared ? 2.2 : 1);
          const back = 0.02 * k * f;
          n.x += vx - ca * back - sa * wave * f;
          n.y += vy - sa * back + ca * wave * f;
          // độ cứng uốn: kéo đốt này về đường thẳng nối dài của hai đốt trước (gốc mạnh, ngọn mềm).
          // Với đốt đầu tiên, "đốt trước nữa" là hướng thẳng ra sau chuông.
          const p1 = nodes[i - 1];
          const ex = i === 1 ? p1.x - ca * tc.seg : 2 * p1.x - nodes[i - 2].x;
          const ey = i === 1 ? p1.y - sa * tc.seg : 2 * p1.y - nodes[i - 2].y;
          const stiff = 0.28 - 0.2 * k;
          n.x += (ex - n.x) * stiff;
          n.y += (ey - n.y) * stiff;
        }
        for (let it = 0; it < 2; it++) {
          for (let i = 1; i < SEGS; i++) {
            const a = nodes[i - 1];
            const n = nodes[i];
            const ex = n.x - a.x;
            const ey = n.y - a.y;
            const d = Math.hypot(ex, ey) || 1e-6;
            n.x = a.x + (ex / d) * tc.seg;
            n.y = a.y + (ey / d) * tc.seg;
          }
        }

        const arm = tc.kind === 'arm';
        ctx.globalAlpha = arm ? 0.95 : 0.7;
        ctx.strokeStyle = arm ? colors.ink : colors.dim;
        ctx.lineWidth = arm ? 1.7 : 1;
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        for (let i = 1; i < SEGS - 1; i++) {
          ctx.quadraticCurveTo(nodes[i].x, nodes[i].y, (nodes[i].x + nodes[i + 1].x) / 2, (nodes[i].y + nodes[i + 1].y) / 2);
        }
        ctx.lineTo(nodes[SEGS - 1].x, nodes[SEGS - 1].y);
        ctx.stroke();

        // đốm phát sáng chạy dọc xúc tu
        if (!arm) {
          const gi = Math.floor((((t * (scared ? 7 : 3.2) + tc.seed) / TAU) % 1) * SEGS);
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = colors.amber;
          ctx.beginPath();
          ctx.arc(nodes[clamp(gi, 0, SEGS - 1)].x, nodes[clamp(gi, 0, SEGS - 1)].y, 1.4, 0, TAU);
          ctx.fill();
        }
      }

      // ---- chuông ----
      const dome = (scale) => {
        ctx.beginPath();
        for (let i = 0; i <= 28; i++) {
          const th = -Math.PI / 2 + (Math.PI * i) / 28;
          const al = hb * Math.cos(th) * scale;
          const sd = wb * Math.sin(th) * scale;
          if (i === 0) ctx.moveTo(wx(al, sd), wy(al, sd));
          else ctx.lineTo(wx(al, sd), wy(al, sd));
        }
      };
      dome(1);
      ctx.globalAlpha = scared ? 0.22 : 0.07;
      ctx.fillStyle = colors.amber;
      ctx.fill();

      // ống dẫn xuyên tâm + vòng trong: mờ, đứt nét
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = colors.dim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const th of [-1.15, -0.42, 0.42, 1.15]) {
        ctx.moveTo(wx(hb * 0.3, 0), wy(hb * 0.3, 0));
        ctx.lineTo(wx(hb * 0.9 * Math.cos(th), wb * 0.9 * Math.sin(th)), wy(hb * 0.9 * Math.cos(th), wb * 0.9 * Math.sin(th)));
      }
      ctx.stroke();
      ctx.setLineDash([3, 4]);
      dome(0.62);
      ctx.stroke();
      ctx.setLineDash([]);

      // viền chuông + mép gợn sóng
      ctx.globalAlpha = 1;
      ctx.strokeStyle = scared ? colors.amber : colors.ink;
      ctx.lineWidth = 1.5;
      dome(1);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const sd = -wb + (2 * wb * i) / 24;
        if (i === 0) ctx.moveTo(wx(rimAlong(sd), sd), wy(rimAlong(sd), sd));
        else ctx.lineTo(wx(rimAlong(sd), sd), wy(rimAlong(sd), sd));
      }
      ctx.stroke();
    },
  };
}
