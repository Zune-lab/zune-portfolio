import { TAU, angDiff, clamp, lerp, rand, randInt } from '../../../lib/math.js';

// Gloop: vật thể mềm làm từ một vòng M điểm nối nhau bằng lò xo. Không có "xương", chỉ có:
//   - lò xo hướng tâm kéo mỗi điểm về bán kính mong muốn (điểm quay mặt về con trỏ thì mong muốn dài hơn -> chân giả)
//   - lò xo giữa các điểm kề nhau giữ cho màng không đứt
//   - lực kéo chỉ tác dụng lên các điểm phía trước, phần thân còn lại bị lôi theo, nên nó bò (không trượt) như amip
// Những con mắt trôi lềnh bềnh trong chất nhờn (lò xo mềm nên lắc lư theo nhịp bò) và luôn nhìn về con trỏ.

const M = 28;

export function makeGloop(w, h) {
  const R = rand(40, 56);
  const eyeN = randInt(1, 5);
  const d0 = 2 * R * Math.sin(Math.PI / M);

  const nodes = Array.from({ length: M }, (_, i) => {
    const a = (i / M) * TAU;
    return { x: w * 0.35 + Math.cos(a) * R, y: h * 0.5 + Math.sin(a) * R, vx: 0, vy: 0 };
  });
  const c = { x: w * 0.35, y: h * 0.5 };

  // mắt xếp thành vòng quanh nhân (ít mắt thì gần tâm hơn), cỡ mắt giảm nhẹ khi nhiều mắt để không chen nhau
  const eyes = Array.from({ length: eyeN }, (_, i) => ({
    phi: (i / eyeN) * TAU + rand(-0.25, 0.25),
    rho: eyeN === 1 ? 0 : eyeN === 2 ? 0.34 : rand(0.5, 0.6),
    r: R * rand(0.14, 0.17) * (1 - 0.05 * eyeN),
    x: c.x,
    y: c.y,
    blink: rand(1, 4),
    wide: 0,
    seed: rand(0, TAU),
  }));

  // không bào: bong bóng nhỏ trôi trong thân, trễ so với tâm
  const vacs = Array.from({ length: 5 }, () => {
    const a = rand(0, TAU);
    const r = Math.sqrt(Math.random()) * 0.65;
    return { u: Math.cos(a) * r, v: Math.sin(a) * r, x: c.x, y: c.y, r: rand(2.2, 5), seed: rand(0, TAU) };
  });
  const nucleus = { x: c.x, y: c.y };

  // vệt nhớt để lại phía sau
  const trail = [];
  let trailAcc = 0;

  let frame = 0;
  let seen = 0;
  const seed = rand(0, TAU);

  return {
    label: `${eyeN} ${eyeN === 1 ? 'eye' : 'eyes'} · click to make it bloop`,
    step(api) {
      const { ctx, w, h, t, dt, colors, aim, mouse } = api;

      // tâm = trung bình các điểm
      let cx = 0;
      let cy = 0;
      for (const p of nodes) {
        cx += p.x;
        cy += p.y;
      }
      c.x = cx / M;
      c.y = cy / M;

      const dx = aim.x - c.x;
      const dy = aim.y - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ta = Math.atan2(dy, dx);
      const ext = clamp((dist - R * 0.7) / (R * 1.6), 0, 1); // con trỏ nằm trong thân: đứng yên, không với nữa
      if (ext > 0.05) frame += angDiff(ta, frame) * Math.min(1, 4 * dt);

      // bấm: thân phình ra rồi dội lại, mắt mở to
      if (mouse.clicks !== seen) {
        seen = mouse.clicks;
        for (const p of nodes) {
          const ex = p.x - c.x;
          const ey = p.y - c.y;
          const l = Math.hypot(ex, ey) || 1;
          const k = rand(110, 190);
          p.vx += (ex / l) * k;
          p.vy += (ey / l) * k;
        }
        for (const e of eyes) e.wide = 0.5;
      }

      // ---- vật lý (chia nhỏ bước để lò xo cứng vẫn ổn định) ----
      const sub = 3;
      const sdt = dt / sub;
      for (let s = 0; s < sub; s++) {
        for (let i = 0; i < M; i++) {
          const p = nodes[i];
          const prev = nodes[(i + M - 1) % M];
          const next = nodes[(i + 1) % M];
          let ax = 0;
          let ay = 0;

          // hướng tâm
          const rx = p.x - c.x;
          const ry = p.y - c.y;
          const rl = Math.hypot(rx, ry) || 1;
          const a = Math.atan2(ry, rx);
          const face = Math.max(0, Math.cos(a - ta));
          // thùy gợn chậm xoay quanh thân (làm nó ra dáng amip, không bao giờ tròn đều) + chân giả phía trước + đuôi co lại
          const lobes = 0.1 * Math.sin(3 * a + t * 1.3 + seed) + 0.06 * Math.sin(5 * a - t * 1.9);
          const target = R * (1 + lobes + 0.8 * face ** 3 * ext - 0.12 * (1 - face) * ext);
          const kr = 120 * (target - rl);
          ax += (rx / rl) * kr;
          ay += (ry / rl) * kr;

          // lò xo với hai điểm kề (chống đứt màng, và chống dồn cục)
          for (const q of [prev, next]) {
            const ex = q.x - p.x;
            const ey = q.y - p.y;
            const el = Math.hypot(ex, ey) || 1e-6;
            const kn = 420 * (el - d0);
            ax += (ex / el) * kn;
            ay += (ey / el) * kn;
          }

          // chân giả: chỉ phần quay mặt về con trỏ bị kéo, phần sau bị lôi theo
          const pull = 520 * face ** 2 * ext;
          ax += (dx / dist) * pull;
          ay += (dy / dist) * pull;

          p.vx += ax * sdt;
          p.vy += ay * sdt;
        }
        const damp = Math.exp(-3.2 * sdt);
        for (const p of nodes) {
          p.vx *= damp;
          p.vy *= damp;
          p.x += p.vx * sdt;
          p.y += p.vy * sdt;
          // tường: dội lại nhẹ
          if (p.x < 4) {
            p.x = 4;
            p.vx = Math.abs(p.vx) * 0.3;
          } else if (p.x > w - 4) {
            p.x = w - 4;
            p.vx = -Math.abs(p.vx) * 0.3;
          }
          if (p.y < 4) {
            p.y = 4;
            p.vy = Math.abs(p.vy) * 0.3;
          } else if (p.y > h - 4) {
            p.y = h - 4;
            p.vy = -Math.abs(p.vy) * 0.3;
          }
        }
      }

      // vệt nhớt: cứ bò được ~14px thì để lại một chấm, mờ dần
      trailAcc += Math.hypot(c.x - (trail.at(-1)?.x ?? c.x), c.y - (trail.at(-1)?.y ?? c.y));
      if (!trail.length || trailAcc > 14) {
        trail.push({ x: c.x, y: c.y, age: 0 });
        trailAcc = 0;
      }
      for (const q of trail) q.age += dt;
      while (trail.length && trail[0].age > 4.5) trail.shift();

      // ---- thành phần bên trong: trôi trễ theo tâm ----
      const ca = Math.cos(frame);
      const sa = Math.sin(frame);
      const k6 = Math.min(1, 5 * dt);
      nucleus.x = lerp(nucleus.x, c.x + Math.cos(t * 0.8) * 3 + ca * R * 0.12 * ext, k6);
      nucleus.y = lerp(nucleus.y, c.y + Math.sin(t * 0.9) * 3 + sa * R * 0.12 * ext, k6);
      for (const v of vacs) {
        const ox = (v.u + Math.sin(t * 0.7 + v.seed) * 0.08) * R;
        const oy = (v.v + Math.cos(t * 0.6 + v.seed) * 0.08) * R;
        v.x = lerp(v.x, c.x + ox + ca * R * 0.15 * ext, Math.min(1, 3 * dt));
        v.y = lerp(v.y, c.y + oy + sa * R * 0.15 * ext, Math.min(1, 3 * dt));
      }
      for (const e of eyes) {
        const tx = c.x + Math.cos(e.phi + frame * 0.6) * e.rho * R + ca * R * 0.25 * ext;
        const ty = c.y + Math.sin(e.phi + frame * 0.6) * e.rho * R + sa * R * 0.25 * ext;
        e.x = lerp(e.x, tx, Math.min(1, 7 * dt));
        e.y = lerp(e.y, ty, Math.min(1, 7 * dt));
        e.wide = Math.max(0, e.wide - dt);
        e.blink -= dt;
        if (e.blink < -0.1) e.blink = rand(1.5, 5);
      }

      // ================= VẼ =================
      // vệt nhớt
      ctx.fillStyle = colors.dim;
      for (const q of trail) {
        ctx.globalAlpha = Math.max(0, 0.4 * (1 - q.age / 4.5));
        ctx.beginPath();
        ctx.arc(q.x, q.y, 2.2, 0, TAU);
        ctx.fill();
      }

      // đường cong mượt qua các điểm của màng
      const blob = (scale) => {
        const P = (p) => [c.x + (p.x - c.x) * scale, c.y + (p.y - c.y) * scale];
        const a0 = P(nodes[M - 1]);
        const b0 = P(nodes[0]);
        ctx.beginPath();
        ctx.moveTo((a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2);
        for (let i = 0; i < M; i++) {
          const p = P(nodes[i]);
          const q = P(nodes[(i + 1) % M]);
          ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        }
        ctx.closePath();
      };
      blob(1);
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = colors.amber;
      ctx.fill();

      // màng trong (đứt nét)
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = colors.dim;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      blob(0.86);
      ctx.stroke();
      ctx.setLineDash([]);

      // không bào + nhân
      ctx.globalAlpha = 0.8;
      for (const v of vacs) {
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.r, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors.amber;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(nucleus.x, nucleus.y, R * 0.2, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = colors.amber;
      ctx.beginPath();
      ctx.arc(nucleus.x + 1, nucleus.y - 1, 2, 0, TAU);
      ctx.fill();

      // màng ngoài
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.7;
      blob(1);
      ctx.stroke();

      // mắt (vẽ cuối, nổi trên cùng)
      for (const e of eyes) {
        const er = e.r * (1 + e.wide * 0.8);
        const blinking = e.blink < 0;
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = colors.ink;
        if (blinking) {
          ctx.beginPath();
          ctx.moveTo(e.x - er, e.y);
          ctx.lineTo(e.x + er, e.y);
          ctx.stroke();
          continue;
        }
        ctx.fillStyle = colors.panel;
        ctx.beginPath();
        ctx.arc(e.x, e.y, er, 0, TAU);
        ctx.fill();
        ctx.stroke();
        const ex = aim.x - e.x;
        const ey = aim.y - e.y;
        const el = Math.hypot(ex, ey) || 1;
        const off = Math.min(er * 0.45, el * 0.15);
        ctx.fillStyle = colors.amber;
        ctx.beginPath();
        ctx.arc(e.x + (ex / el) * off, e.y + (ey / el) * off, er * 0.42, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}
