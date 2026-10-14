import { TAU, angDiff, clamp, pick, rand, randInt } from '../../../lib/math.js';

// Moths: con trỏ là ngọn đèn. Bướm đêm bay xoắn quanh đèn (tự lao vào rồi bật ra), cánh sáng lên khi lại gần.
// Bấm = tắt đèn: cả đàn bay vào đậu ở mép khung, cánh xếp lại. Bấm lần nữa: đèn bật, cả đàn bay lên.
// Thêm: bay gần đèn thì rơi phấn cánh; lao trúng đèn thì bắn tia lửa + choáng quay mòng mòng; đậu trong tối thì chớp mắt, giật râu.
// Thế giới có chuyện riêng: một cây nến cố định (bấm vào để thổi tắt/thắp lại, một nửa đàn mê nến hơn mê đèn),
// lắc đèn thật nhanh thì cả đàn hoảng loạn, và thỉnh thoảng một con dơi lao vào săn đàn bướm.

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
    fan: Math.random() < 0.5, // "phe nến": thích nến hơn đèn
    t: 0, // đang theo ánh sáng nào khi cả đèn lẫn nến cùng bật: 0 = đèn, 1 = nến
    nextPick: rand(3, 9),
    scare: 0, // >0: đang hoảng, bay tránh điểm (sx, sy)
    sx: 0,
    sy: 0,
    dizzy: 0, // >0: vừa bị đèn giật, đang choáng (giây còn lại)
    spin: 0, // tốc độ xoay khi choáng (rad/s)
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
  let zaps = 0; // số lần bướm lao trúng đèn
  let bump = 0; // 0..1, đèn chớp lên khi vừa giật bướm
  let bumpC = 0; // như bump nhưng cho nến
  const dust = []; // phấn cánh
  const sparks = []; // tia lửa
  const smoke = []; // khói nến
  let smokeFor = 0;
  let smokeAcc = 0;

  moths.forEach((m) => (m.t = m.fan ? 1 : 0));
  if (!moths.some((m) => m.fan)) moths[0].fan = true;

  // cây nến đứng ở đáy khung; vị trí theo tỉ lệ nên đổi kích thước khung vẫn đúng chỗ
  const candle = { fx: rand(0.15, 0.85), on: true, level: 1 };
  const lampL = { x: 0, y: 0, c: false }; // ánh sáng 1: con trỏ
  const candL = { x: 0, y: 0, c: true }; // ánh sáng 2: ngọn nến

  let clock = 0;
  let shake = 0; // tốc độ con trỏ (px/s) đã làm mượt
  let prevAx = null;
  let prevAy = null;
  let startleCd = 0;
  let startledUntil = -1;

  let bat = null;
  let batTimer = rand(12, 20);

  // mỗi con bướm đang bị ánh sáng nào hút (null = không có gì để theo -> bay vào đậu)
  const lightFor = (m) => {
    if (lamp && candle.on) return m.t === 1 ? candL : lampL;
    if (lamp) return lampL;
    if (candle.on && m.fan) return candL;
    return null;
  };

  const glowAt = (ctx, x, y, r, alpha, light) => {
    // điểm cuối phải CÙNG màu với alpha 0: 'transparent' là đen trong suốt, nội suy sang nó sẽ có viền xám quanh quầng
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, light ? 'rgb(255, 176, 32)' : 'rgb(255, 200, 87)');
    g.addColorStop(1, light ? 'rgba(255, 176, 32, 0)' : 'rgba(255, 200, 87, 0)');
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };

  const zap = (m, onCandle) => {
    zaps++;
    if (onCandle) bumpC = 1;
    else bump = 1;
    m.dizzy = rand(0.8, 1.2);
    m.spin = rand(9, 14) * (Math.random() < 0.5 ? -1 : 1);
    m.dive = 0;
    for (let i = 0; i < 9; i++) {
      sparks.push({ x: m.x, y: m.y, a: rand(0, TAU), sp: rand(70, 150), life: 0, max: rand(0.25, 0.5) });
    }
    // giật mạnh thì rụng một ít phấn
    for (let i = 0; i < 6; i++) spawnDust(m.x, m.y, 1.6);
  };

  function spawnDust(x, y, spread = 1) {
    if (dust.length > 90) return;
    dust.push({
      x,
      y,
      vx: rand(-9, 9) * spread,
      vy: rand(-4, 14) * spread,
      life: 0,
      max: rand(1.6, 3.2),
      r: rand(0.6, 1.5),
      sw: rand(0, TAU),
    });
  }

  const draw = (ctx, m, colors, glow, dark) => {
    const s = m.size;
    const now = performance.now();
    // thỉnh thoảng giật râu + run cánh khi đang đậu (mỗi con lệch pha nhau)
    const tw = m.state === 'rest' ? Math.max(0, Math.sin(now / 1700 + m.seed * 2) - 0.6) * 2.5 : 0;
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
      const br = 1 + Math.sin(m.seed + now / 700) * 0.04 + Math.sin(now / 35) * 0.05 * tw;
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
    const aw = 1 + 0.35 * tw * Math.sin(now / 55 + m.seed);
    ctx.moveTo(1.1 * s, 0.15 * s);
    ctx.quadraticCurveTo(1.8 * s, 0.4 * s, 2.1 * s, 1 * s * aw);
    ctx.moveTo(1.1 * s, -0.15 * s);
    ctx.quadraticCurveTo(1.8 * s, -0.4 * s, 2.1 * s, -1 * s * (2 - aw));
    ctx.stroke();
    // trong bóng tối, bướm đậu có hai chấm mắt sáng (thỉnh thoảng chớp)
    if (m.state === 'rest' && dark > 0.05) {
      const blink = Math.sin(m.seed * 5 + now / 2300) > 0.96 ? 0 : 1;
      ctx.fillStyle = colors.amber;
      ctx.globalAlpha = 0.9 * dark * blink;
      for (const sg of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(1.15 * s, sg * 0.2 * s, 0.14 * s + 0.4, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  const drawBat = (ctx, b, colors) => {
    const s = 11;
    const f = 0.3 + 0.7 * Math.abs(Math.sin(b.ph));
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang);
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1.3;
    for (const sg of [-1, 1]) {
      const Y = (v) => sg * v * s * f;
      ctx.beginPath();
      ctx.moveTo(0.3 * s, Y(0.3));
      ctx.quadraticCurveTo(0.4 * s, Y(2.4), -0.5 * s, Y(4));
      // mép sau hình vỏ sò
      ctx.quadraticCurveTo(-0.5 * s, Y(3.2), -1.4 * s, Y(2.9));
      ctx.quadraticCurveTo(-1.05 * s, Y(2.1), -1.7 * s, Y(1.5));
      ctx.quadraticCurveTo(-1.1 * s, Y(0.9), -1.5 * s, Y(0.35));
      ctx.closePath();
      ctx.fillStyle = colors.panel;
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(0.1 * s, Y(0.4));
      ctx.lineTo(-1.4 * s, Y(2.9));
      ctx.moveTo(0.1 * s, Y(0.4));
      ctx.lineTo(-1.7 * s, Y(1.5));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = colors.ink;
    ctx.beginPath();
    ctx.ellipse(-0.6 * s, 0, 1.3 * s, 0.45 * s, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.9 * s, 0, 0.5 * s, 0, TAU);
    ctx.fill();
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(1.0 * s, sg * 0.3 * s);
      ctx.lineTo(1.5 * s, sg * 0.85 * s);
      ctx.lineTo(1.3 * s, sg * 0.2 * s);
      ctx.fill();
    }
    ctx.fillStyle = colors.amber;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(1.2 * s, sg * 0.2 * s, 0.13 * s + 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  // thân nến + ngọn lửa (quầng sáng vẽ riêng ở step, sau lớp tối)
  const drawCandle = (ctx, colors, w, h, t) => {
    const cx = candle.fx * w;
    const base = h - 16;
    const top = base - 24;
    ctx.strokeStyle = colors.ink;
    ctx.fillStyle = colors.panel;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.rect(cx - 4, top, 8, 24);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 10, base);
    ctx.lineTo(cx + 10, base);
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top - 3);
    ctx.stroke();
    // sáp chảy
    ctx.beginPath();
    ctx.moveTo(cx + 4, top + 1);
    ctx.lineTo(cx + 4, top + 7 + (candle.on ? Math.sin(t * 0.5) * 1 : 0));
    ctx.stroke();
    if (candle.level > 0.02) {
      const fl = 1 + Math.sin(t * 23 + cx) * 0.08 + Math.sin(t * 9) * 0.1 + bumpC * 0.3;
      const sway = Math.sin(t * 7 + cx * 0.1) * 1.3;
      ctx.beginPath();
      ctx.moveTo(cx, top - 3);
      ctx.quadraticCurveTo(cx - 4.5, top - 8, cx + sway, top - 3 - 12 * fl * candle.level);
      ctx.quadraticCurveTo(cx + 4.5, top - 8, cx, top - 3);
      ctx.fillStyle = colors.amber;
      ctx.globalAlpha = candle.level;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  const HINTS = [
    'your cursor is the lamp',
    'click to switch the lamp off',
    'click the candle to blow it out',
    'shake the lamp to scare them',
  ];

  return {
    label: `${n} moths · your cursor is the lamp · click to switch it off`,
    caption: () => {
      if (bat) return `${n} moths · something is hunting them`;
      if (clock < startledUntil) return `${n} moths · you scared them`;
      if (!lamp) {
        return candle.on
          ? `${n} moths · lamp off, the candle is still lit · click it to blow it out`
          : `${n} moths · lights out · click anywhere to switch the lamp back on`;
      }
      const hint = HINTS[Math.floor(clock / 6) % HINTS.length];
      return `${n} moths${zaps ? ` · zapped ${zaps}×` : ''} · ${hint}`;
    },
    step(api) {
      const { ctx, w, h, t, dt, colors, aim, mouse } = api;
      clock = t;
      lampL.x = aim.x;
      lampL.y = aim.y;
      candL.x = candle.fx * w;
      candL.y = h - 49;

      // ---- bấm: trúng cây nến thì thổi/thắp nến, còn lại thì tắt/bật đèn ----
      if (mouse.clicks !== seen) {
        seen = mouse.clicks;
        if (Math.abs(mouse.x - candL.x) < 24 && mouse.y > h - 64 && mouse.y < h - 6) {
          candle.on = !candle.on;
          if (candle.on) {
            for (const m of moths) if (m.fan) m.wake = rand(0, 0.9);
          } else {
            smokeFor = 2.6;
          }
        } else {
          lamp = !lamp;
          if (lamp) {
            for (const m of moths) m.wake = rand(0, 0.9);
          }
        }
      }
      glowLevel += ((lamp ? 1 : 0) - glowLevel) * Math.min(1, 5 * dt);
      candle.level += ((candle.on ? 1 : 0) - candle.level) * Math.min(1, 8 * dt);
      bump = Math.max(0, bump - dt * 3.2);
      bumpC = Math.max(0, bumpC - dt * 3.2);

      // ---- lắc đèn thật nhanh: cả đàn gần đó hoảng loạn ----
      if (prevAx !== null) {
        const jump = Math.hypot(aim.x - prevAx, aim.y - prevAy);
        // nhảy quá xa trong một khung = con trỏ vừa "dịch chuyển" (vào lại khung, hết đi dạo), không tính là lắc
        // và chặn trần tốc độ để một cú giật đơn lẻ không đủ kích hoạt: phải lắc liên tục vài khung
        const v = jump > 80 ? 0 : Math.min(2500, jump / dt);
        shake += (v - shake) * Math.min(1, 10 * dt);
      }
      prevAx = aim.x;
      prevAy = aim.y;
      startleCd = Math.max(0, startleCd - dt);
      if (lamp && shake > 1000 && startleCd <= 0) {
        startleCd = 1.5;
        startledUntil = t + 2.2;
        for (const m of moths) {
          if (m.state !== 'fly' || Math.hypot(m.x - aim.x, m.y - aim.y) > 280) continue;
          m.scare = rand(0.7, 1.2);
          m.sx = aim.x;
          m.sy = aim.y;
          for (let k = 0; k < 3; k++) spawnDust(m.x, m.y, 2);
        }
      }

      // ---- khói nến ----
      if (smokeFor > 0) {
        smokeFor -= dt;
        smokeAcc += dt;
        while (smokeAcc > 0.12) {
          smokeAcc -= 0.12;
          smoke.push({ x: candL.x + rand(-1, 1), y: h - 43, vx: rand(-3, 3), vy: -rand(14, 24), life: 0, max: rand(1.6, 2.6), r: rand(1.5, 2.5), sw: rand(0, TAU) });
        }
      }

      // ---- dơi: thỉnh thoảng lao vào giữa đàn rồi bay đi ----
      if (!bat) {
        if (lamp || candle.on) batTimer -= dt;
        if (batTimer <= 0) {
          const side = Math.random() < 0.5 ? -1 : 1;
          bat = {
            x: side < 0 ? -50 : w + 50,
            y: rand(0.1, 0.5) * h,
            ang: side < 0 ? 0 : Math.PI,
            ph: 0,
            mode: 'hunt',
            hunt: 5,
            age: 0,
            exitX: side < 0 ? w + 90 : -90,
            exitY: rand(0.1, 0.6) * h,
          };
        }
      } else {
        bat.age += dt;
        bat.ph += 11 * dt;
        let tx = w / 2;
        let ty = h / 2;
        if (bat.mode === 'hunt') {
          // nhắm vào tâm đàn bướm đang bay
          let cx = 0;
          let cy = 0;
          let k = 0;
          for (const m of moths) {
            if (m.state === 'rest') continue;
            cx += m.x;
            cy += m.y;
            k++;
          }
          if (k) {
            tx = cx / k;
            ty = cy / k;
          }
          bat.hunt -= dt;
          if (bat.hunt <= 0 || (k && Math.hypot(tx - bat.x, ty - bat.y) < 30)) bat.mode = 'leave';
        } else {
          tx = bat.exitX;
          ty = bat.exitY;
        }
        const want = Math.atan2(ty - bat.y, tx - bat.x);
        bat.ang += angDiff(want, bat.ang) * Math.min(1, 1.8 * dt);
        const sp = bat.mode === 'hunt' ? 200 : 250;
        bat.x += Math.cos(bat.ang) * sp * dt;
        bat.y += Math.sin(bat.ang) * sp * dt;
        const out = bat.x < -70 || bat.x > w + 70 || bat.y < -70 || bat.y > h + 70;
        if ((out && bat.mode === 'leave' && bat.age > 1) || bat.age > 20) {
          bat = null;
          batTimer = rand(25, 45);
        }
      }

      // ---- bướm ----
      for (const m of moths) {
        const L = lightFor(m);
        if (m.state === 'rest' && L) {
          m.wake -= dt;
          if (m.wake <= 0) {
            m.state = 'fly';
            const dx = L.x - m.x;
            const dy = L.y - m.y;
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

        // đèn và nến cùng bật: thỉnh thoảng đổi ý sang ánh sáng kia (phe nến ít đổi hơn)
        if (lamp && candle.on) {
          m.nextPick -= dt;
          if (m.nextPick <= 0) {
            m.t = Math.random() < (m.fan ? 0.75 : 0.25) ? 1 : 0;
            m.nextPick = rand(6, 14);
          }
        }

        // dơi tới gần là hoảng
        if (bat && Math.hypot(m.x - bat.x, m.y - bat.y) < 130) {
          m.scare = Math.max(m.scare, 0.45);
          m.sx = bat.x;
          m.sy = bat.y;
        }

        m.ph += m.flap * (m.dizzy > 0 || m.scare > 0 ? 1.7 : 1) * dt;
        m.dizzy = Math.max(0, m.dizzy - dt);
        m.spin *= Math.pow(0.15, dt);
        let dvx;
        let dvy;
        if (m.scare > 0) {
          // hoảng: bay thẳng ra xa nguồn sợ, vỗ cánh loạn
          m.scare -= dt;
          const dx = m.x - m.sx;
          const dy = m.y - m.sy;
          const d = Math.hypot(dx, dy) || 1;
          dvx = (dx / d) * 240 + Math.sin(t * 11 + m.seed) * 40;
          dvy = (dy / d) * 240 + Math.cos(t * 12 + m.seed) * 40;
        } else if (L) {
          const dx = L.x - m.x;
          const dy = L.y - m.y;
          const d = Math.hypot(dx, dy) || 1;
          const ux = dx / d;
          const uy = dy / d;
          // bay gần ánh sáng thì rơi phấn cánh
          if (Math.random() < dt * 5 * clamp(1 - d / 150, 0, 1)) {
            spawnDust(m.x - Math.cos(m.ang) * m.size, m.y - Math.sin(m.ang) * m.size);
          }
          // xoắn quanh ánh sáng: thành phần tiếp tuyến + hút/đẩy về bán kính ưa thích (dao động chậm); quanh nến thì vòng nhỏ, hiền hơn
          m.nextDive -= dt;
          if (m.nextDive <= 0) {
            m.dive = 0.9;
            m.nextDive = rand(3.5, 8);
          }
          m.dive = Math.max(0, m.dive - dt);
          const oScale = L.c ? 0.65 : 1;
          const rPref = m.dive > 0 ? 4 : m.orbit * oScale * (0.6 + 0.4 * Math.cos(t * 0.45 + m.seed));
          const radial = clamp((d - rPref) * 2.4, -100, 170);
          const flutter = (Math.sin(t * 9 + m.seed * 3) + Math.sin(t * 14.3 + m.seed)) * 22;
          if (m.dizzy > 0) {
            // đang choáng: mất lái, lảo đảo trôi và rơi nhẹ
            dvx = m.vx * 0.5 + Math.sin(t * 17 + m.seed) * 30;
            dvy = m.vy * 0.5 + 35 + Math.cos(t * 13 + m.seed) * 30;
          } else {
            const spd = m.speed * (L.c ? 0.8 : 1);
            dvx = -uy * m.dir * spd + ux * radial + -uy * flutter;
            dvy = ux * m.dir * spd + uy * radial + ux * flutter;
          }
          // chạm ánh sáng thì bị giật: nảy ra + tia lửa + choáng
          if (d < 9 && m.dizzy <= 0) {
            m.vx -= ux * 220;
            m.vy -= uy * 220;
            zap(m, L.c);
          }
        } else {
          // không còn ánh sáng nào: bay thẳng vào chỗ đậu, chậm dần khi tới nơi
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
        if (m.dizzy > 0 && L && m.scare <= 0) {
          m.ang += m.spin * dt;
        } else if (sp > 8) {
          const want = Math.atan2(m.vy, m.vx);
          m.ang += angDiff(want, m.ang) * Math.min(1, 9 * dt);
        }
      }

      // ================= VẼ =================
      // theme sáng: amber của theme là nâu đậm (để đọc chữ), làm quầng sáng thành vệt bẩn -> dùng vàng đèn thật
      ctx.fillStyle = colors.panel;
      const light = isLight(ctx.fillStyle);

      // đèn: quầng sáng + lõi (tắt đèn thì chỉ còn vòng mờ và cả khung tối đi)
      const flick = lamp ? 1 + Math.sin(t * 31) * 0.015 + Math.sin(t * 13) * 0.02 : 1;
      if (glowLevel > 0.01) {
        glowAt(ctx, aim.x, aim.y, 120 * flick * (1 + 0.3 * bump), (light ? 0.42 : 0.3) * glowLevel * (1 + 0.8 * bump), light);
      }
      if (glowLevel < 0.99) {
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.32 * (1 - glowLevel);
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // nến: vẽ SAU lớp tối nên tắt đèn rồi vẫn còn một góc sáng
      if (candle.level > 0.02) {
        const cf = 1 + Math.sin(t * 23) * 0.03 + Math.sin(t * 9 + 1) * 0.04;
        glowAt(ctx, candL.x, candL.y, 95 * cf * (1 + 0.3 * bumpC), (light ? 0.4 : 0.3) * candle.level * (1 + 0.8 * bumpC), light);
      }
      drawCandle(ctx, colors, w, h, t);

      // khói nến
      ctx.fillStyle = colors.dim;
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i];
        p.life += dt;
        if (p.life >= p.max) {
          smoke.splice(i, 1);
          continue;
        }
        p.x += (p.vx + Math.sin(t * 2.5 + p.sw) * 7) * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = 0.45 * (1 - p.life / p.max);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + p.life * 3.2, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = colors.amber;
      ctx.fillStyle = colors.amber;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, 4.5 * flick + 2.5 * bump, 0, TAU);
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

      // phấn cánh: rơi lững lờ, lấp lánh amber khi nằm trong vùng sáng (đèn hoặc nến), ngoài đó thì mờ như bụi
      for (let i = dust.length - 1; i >= 0; i--) {
        const p = dust[i];
        p.life += dt;
        if (p.life >= p.max) {
          dust.splice(i, 1);
          continue;
        }
        p.vx += Math.sin(t * 2 + p.sw) * 6 * dt;
        p.vy += 6 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const lit = Math.max(
          clamp(1 - Math.hypot(aim.x - p.x, aim.y - p.y) / 130, 0, 1) * glowLevel,
          clamp(1 - Math.hypot(candL.x - p.x, candL.y - p.y) / 95, 0, 1) * candle.level,
        );
        const fade = 1 - p.life / p.max;
        ctx.fillStyle = lit > 0.05 ? colors.amber : colors.ink;
        ctx.globalAlpha = fade * (lit > 0.05 ? 0.25 + 0.65 * lit : 0.22) * (0.7 + 0.3 * Math.sin(t * 12 + p.sw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
      // tia lửa khi bướm bị giật
      ctx.strokeStyle = colors.amber;
      ctx.lineWidth = 1.3;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.max) {
          sparks.splice(i, 1);
          continue;
        }
        p.sp *= Math.pow(0.02, dt);
        p.x += Math.cos(p.a) * p.sp * dt;
        p.y += Math.sin(p.a) * p.sp * dt;
        ctx.globalAlpha = 1 - p.life / p.max;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(p.a) * (2 + p.sp * 0.05), p.y - Math.sin(p.a) * (2 + p.sp * 0.05));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // bướm: vẽ sau đèn; cánh sáng lên theo khoảng cách tới ánh sáng mình đang theo
      for (const m of moths) {
        const L = m.state === 'rest' ? null : lightFor(m);
        const lvl = L ? (L.c ? candle.level : glowLevel) : 0;
        const glow = L ? clamp(1 - Math.hypot(L.x - m.x, L.y - m.y) / 150, 0, 1) * lvl : 0;
        draw(ctx, m, colors, glow, 1 - glowLevel);
      }

      if (bat) drawBat(ctx, bat, colors);
    },
  };
}
