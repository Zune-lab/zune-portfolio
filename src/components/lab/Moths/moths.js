import { TAU, clamp, pick, rand, randInt } from '../../../lib/math.js';

// Moths: con trỏ là ngọn đèn. Bướm đêm bay xoắn quanh đèn (tự lao vào rồi bật ra), cánh sáng lên khi lại gần.
// Bấm = tắt đèn: cả đàn bay vào đậu ở mép khung, cánh xếp lại. Bấm lần nữa: đèn bật, cả đàn bay lên.

function makeMoth(w, h) {
  const edge = pick(['top', 'top', 'left', 'right', 'bottom']);
  return {
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-40, 40),
    vy: rand(-40, 40),
    ang: rand(0, TAU),
    size: rand(6, 9),
    ph: rand(0, TAU),
    flap: rand(15, 21),
    orbit: rand(35, 105),
    dir: Math.random() < 0.5 ? -1 : 1,
    speed: rand(70, 115),
    seed: rand(0, TAU),
    spots: randInt(0, 2),
    dive: 0,
    nextDive: rand(3, 9),
    state: 'fly',
    wake: 0,
    edge,
    fx: rand(0.06, 0.94), // vị trí đậu theo tỉ lệ dọc mép (không phụ thuộc kích thước khung)
  };
}

// canvas tự chuẩn hoá mọi màu CSS về '#rrggbb' (hoặc 'rgba(...)') khi gán vào fillStyle -> đọc lại để biết sáng hay tối
const isLight = (c) => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c) || /(\d+)\D+(\d+)\D+(\d+)/.exec(c);
  if (!m) return false;
  const [r, g, b] = m.slice(1, 4).map((v) => (v.length === 2 && c[0] === '#' ? parseInt(v, 16) : Number(v)));
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
};

function restPoint(m, w, h) {
  const pad = 9;
  switch (m.edge) {
    case 'top':
      return { x: m.fx * w, y: pad, ang: -Math.PI / 2 };
    case 'bottom':
      return { x: m.fx * w, y: h - pad, ang: Math.PI / 2 };
    case 'left':
      return { x: pad, y: m.fx * h, ang: Math.PI };
    default:
      return { x: w - pad, y: m.fx * h, ang: 0 };
  }
}

export function makeMoths(w, h) {
  const n = randInt(4, 9);
  const moths = Array.from({ length: n }, () => makeMoth(w, h));
  let lamp = true;
  let seen = 0;
  let glowLevel = 1; // 0..1, mượt khi bật/tắt đèn

  const draw = (ctx, m, colors, glow) => {
    const s = m.size;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.ang);
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1.2;

    const wing = (path) => {
      ctx.beginPath();
      path();
      ctx.closePath();
      ctx.fillStyle = colors.panel;
      ctx.globalAlpha = 1;
      ctx.fill();
      if (glow > 0.02) {
        ctx.fillStyle = colors.amber;
        ctx.globalAlpha = 0.5 * glow;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.stroke();
    };

    if (m.state === 'rest') {
      // cánh xếp lại thành hình tam giác dẹt, thở nhè nhẹ
      const br = 1 + Math.sin(m.seed + performance.now() / 700) * 0.04;
      wing(() => {
        ctx.moveTo(0.5 * s, 0);
        ctx.lineTo(-2.3 * s * br, 1.15 * s);
        ctx.lineTo(-3 * s * br, 0);
        ctx.lineTo(-2.3 * s * br, -1.15 * s);
      });
      ctx.beginPath();
      ctx.moveTo(-0.3 * s, 0);
      ctx.lineTo(-2.7 * s * br, 0);
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      const f = 0.18 + 0.82 * Math.abs(Math.sin(m.ph));
      for (const sg of [-1, 1]) {
        // cánh sau (vẽ trước)
        wing(() => {
          ctx.moveTo(-0.4 * s, sg * 0.3 * s);
          ctx.quadraticCurveTo(-0.9 * s, sg * 2.2 * s * f, -2.3 * s, sg * 1.6 * s * f);
          ctx.quadraticCurveTo(-2.5 * s, sg * 0.7 * s * f, -1.7 * s, sg * 0.2 * s);
        });
        // cánh trước
        wing(() => {
          ctx.moveTo(0.5 * s, sg * 0.35 * s);
          ctx.quadraticCurveTo(0.3 * s, sg * 2.6 * s * f, -1.4 * s, sg * 2.2 * s * f);
          ctx.quadraticCurveTo(-1.7 * s, sg * 0.9 * s * f, -0.9 * s, sg * 0.3 * s);
        });
        if (m.spots > 0) {
          ctx.fillStyle = colors.amber;
          for (let k = 0; k < m.spots; k++) {
            ctx.beginPath();
            ctx.arc((-0.2 - k * 0.8) * s, sg * (1.2 + k * 0.2) * s * f, 0.28 * s, 0, TAU);
            ctx.fill();
          }
        }
      }
    }

    // thân, đầu, râu
    ctx.fillStyle = colors.ink;
    ctx.beginPath();
    ctx.ellipse(-0.7 * s, 0, 1.5 * s, 0.38 * s, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.95 * s, 0, 0.38 * s, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1.1 * s, 0.15 * s);
    ctx.quadraticCurveTo(1.8 * s, 0.4 * s, 2.1 * s, 1 * s);
    ctx.moveTo(1.1 * s, -0.15 * s);
    ctx.quadraticCurveTo(1.8 * s, -0.4 * s, 2.1 * s, -1 * s);
    ctx.stroke();
    ctx.restore();
  };

  return {
    label: `${n} moths · your cursor is the lamp · click to switch it off`,
    step(api) {
      const { ctx, w, h, t, dt, colors, aim, mouse } = api;

      if (mouse.clicks !== seen) {
        seen = mouse.clicks;
        lamp = !lamp;
        if (lamp) {
          for (const m of moths) m.wake = rand(0, 0.9);
        }
      }
      glowLevel += ((lamp ? 1 : 0) - glowLevel) * Math.min(1, 5 * dt);

      // ---- bướm ----
      for (const m of moths) {
        if (lamp && m.state === 'rest') {
          m.wake -= dt;
          if (m.wake <= 0) {
            m.state = 'fly';
            const dx = aim.x - m.x;
            const dy = aim.y - m.y;
            const dl = Math.hypot(dx, dy) || 1;
            m.vx = (dx / dl) * 130 + rand(-30, 30);
            m.vy = (dy / dl) * 130 + rand(-30, 30);
          }
        }
        if (m.state === 'rest') {
          const r = restPoint(m, w, h);
          m.x = r.x;
          m.y = r.y;
          m.ang = r.ang;
          continue;
        }

        m.ph += m.flap * dt;
        let dvx;
        let dvy;
        if (lamp) {
          const dx = aim.x - m.x;
          const dy = aim.y - m.y;
          const d = Math.hypot(dx, dy) || 1;
          const ux = dx / d;
          const uy = dy / d;
          // xoắn quanh đèn: thành phần tiếp tuyến + hút/đẩy về bán kính ưa thích (dao động chậm)
          m.nextDive -= dt;
          if (m.nextDive <= 0) {
            m.dive = 0.7;
            m.nextDive = rand(5, 11);
          }
          m.dive = Math.max(0, m.dive - dt);
          const rPref = m.dive > 0 ? 4 : m.orbit * (0.6 + 0.4 * Math.cos(t * 0.45 + m.seed));
          const radial = clamp((d - rPref) * 2.4, -100, 170);
          const flutter = (Math.sin(t * 9 + m.seed * 3) + Math.sin(t * 14.3 + m.seed)) * 22;
          dvx = -uy * m.dir * m.speed + ux * radial + -uy * flutter;
          dvy = ux * m.dir * m.speed + uy * radial + ux * flutter;
          // chạm đèn thì nảy ra
          if (d < 9) {
            m.vx -= ux * 220;
            m.vy -= uy * 220;
            m.dive = 0;
          }
        } else {
          // đèn tắt: bay thẳng vào chỗ đậu, chậm dần khi tới nơi
          const r = restPoint(m, w, h);
          const dx = r.x - m.x;
          const dy = r.y - m.y;
          const d = Math.hypot(dx, dy) || 1;
          const sp = Math.min(150, d * 2.6 + 18);
          dvx = (dx / d) * sp + Math.sin(t * 8 + m.seed) * 14;
          dvy = (dy / d) * sp + Math.cos(t * 9 + m.seed) * 14;
          if (d < 3.5) {
            m.state = 'rest';
            continue;
          }
        }
        const k = Math.min(1, 3.5 * dt);
        m.vx += (dvx - m.vx) * k;
        m.vy += (dvy - m.vy) * k;
        m.x = clamp(m.x + m.vx * dt, 6, w - 6);
        m.y = clamp(m.y + m.vy * dt, 6, h - 6);
        const sp = Math.hypot(m.vx, m.vy);
        if (sp > 8) {
          const want = Math.atan2(m.vy, m.vx);
          let dA = want - m.ang;
          dA -= TAU * Math.floor(dA / TAU + 0.5);
          m.ang += dA * Math.min(1, 9 * dt);
        }
      }

      // ================= VẼ =================
      // đèn: quầng sáng + lõi (tắt đèn thì chỉ còn vòng mờ và cả khung tối đi)
      const flick = lamp ? 1 + Math.sin(t * 31) * 0.015 + Math.sin(t * 13) * 0.02 : 1;
      if (glowLevel > 0.01) {
        const r = 120 * flick;
        const g = ctx.createRadialGradient(aim.x, aim.y, 0, aim.x, aim.y, r);
        // theme sáng: amber của theme là nâu đậm (để đọc chữ), làm quầng sáng thành vệt bẩn -> dùng vàng đèn thật.
        // Điểm cuối phải CÙNG màu với alpha 0: 'transparent' là đen trong suốt, nội suy sang nó sẽ có viền xám quanh quầng.
        ctx.fillStyle = colors.panel;
        const light = isLight(ctx.fillStyle);
        g.addColorStop(0, light ? 'rgb(255, 176, 32)' : 'rgb(255, 200, 87)');
        g.addColorStop(1, light ? 'rgba(255, 176, 32, 0)' : 'rgba(255, 200, 87, 0)');
        ctx.globalAlpha = (light ? 0.42 : 0.3) * glowLevel;
        ctx.fillStyle = g;
        ctx.fillRect(aim.x - r, aim.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      if (glowLevel < 0.99) {
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.32 * (1 - glowLevel);
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = colors.amber;
      ctx.fillStyle = colors.amber;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, 4.5 * flick, 0, TAU);
      if (lamp) ctx.fill();
      else ctx.stroke();
      if (lamp) {
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + t * 0.3;
          ctx.moveTo(aim.x + Math.cos(a) * 8, aim.y + Math.sin(a) * 8);
          ctx.lineTo(aim.x + Math.cos(a) * 12, aim.y + Math.sin(a) * 12);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // bướm: vẽ sau đèn; cánh sáng lên theo khoảng cách tới đèn
      for (const m of moths) {
        const glow = lamp ? clamp(1 - Math.hypot(aim.x - m.x, aim.y - m.y) / 150, 0, 1) : 0;
        draw(ctx, m, colors, glow * glowLevel);
      }
    },
  };
}
