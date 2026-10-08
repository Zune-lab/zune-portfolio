import { TAU, angDiff, clamp, pick, rand } from '../../../lib/math.js';
import { makeDread } from '../../../lib/dreadAudio.js';
import { drawFinger, FLESH, FLESH_D, BLOOD } from '../../../lib/dreadDraw.js';

// Parasite: con trỏ trong khung là con trỏ GIẢ do canvas tự vẽ (con trỏ thật bị ẩn), nên thứ bò tới có thể chiếm lấy nó.
//   hunt      bốn sợi giun mảnh, nhợt nhạt, bò từ mép khung về phía con trỏ: bò chậm, đứng khựng, rồi phóng một đoạn ngắn.
//             chúng không bao giờ bò đều. bạn rê chuột nhanh thì chúng co lại bất động.
//   burrow    chạm vào là chui vào, từng đốt một. phần đuôi còn thò ra ngoài, ngoe nguẩy
//   infected  mức nhiễm 0 -> 1: mũi tên đổi sang màu da, gân máu chạy dưới da, một cục u bò dọc mép; mọc dần tới mười ngón tay người
//             có đốt và móng, mỗi ngón giật theo nhịp riêng. con trỏ bị trễ, đứng hình từng đoạn, run, tự bấm.
//             gần cuối, giữa mũi tên mở ra một con mắt nhìn THẲNG ra màn hình (không nhìn con trỏ thật của bạn)
//   expelled  lắc chuột (đảo chiều liên tục) để tống nó ra: giun văng ra, những ngón tay rụng xuống nằm lại. ngón tay vẫn thỉnh thoảng giật
// Tư liệu thiết kế: bất định + cơ thể người bị sai chỗ đáng sợ hơn máu me; chuyển động sai nhịp (đứng yên rồi giật), tối dần để che bớt.

const M = 46; // số đốt mỗi sợi giun
const SEG = 5;
const KEEP = 12; // số đốt còn thò ra khỏi con trỏ sau khi chui vào
const V = [
  [0, 0],
  [0, 17],
  [4.4, 13],
  [7.4, 19.5],
  [10.2, 18.2],
  [7.3, 11.8],
  [13, 11.8],
]; // mũi tên con trỏ (toạ độ cục bộ, gốc ở đầu nhọn)
const CEN = [5.2, 11.4];

export function makeParasite(w0, h0) {
  const dread = makeDread();
  let seen = 0;
  let level = 0;
  let infected = false;
  let expelledCount = 0;
  let stateT = 0;
  let flips = 0;
  let lastDir = 0;
  let prevMx = 0;
  let prevAx = null;
  let prevAy = 0;
  let aimSpeed = 0;
  let spasmT = rand(3, 6);
  let spasm = { x: 0, y: 0, t: 0 };
  let freezeT = rand(4, 8);
  let frozen = 0;
  let stepAcc = 0;
  let selfClickT = 3;
  let started = false;
  let fresh = 0; // giây kể từ lúc vừa tống ra

  const cur = { x: w0 * 0.75, y: h0 * 0.4 };
  const splats = [];
  const corpses = [];
  const ghost = { a: 0 };

  const edgeSpawn = (W, H) => {
    const e = Math.floor(rand(0, 4));
    const f = rand(0.1, 0.9);
    return e === 0 ? [f * W, -6] : e === 1 ? [f * W, H + 6] : e === 2 ? [-6, f * H] : [W + 6, f * H];
  };

  const makeWorm = (W, H, i) => {
    const [x, y] = edgeSpawn(W, H);
    const heading = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.6, 0.6);
    const nodes = [];
    for (let k = 0; k < M; k++) nodes.push({ x: x - Math.cos(heading) * k * SEG, y: y - Math.sin(heading) * k * SEG });
    return { nodes, heading, mode: 'creep', modeT: rand(0.4, 1.5) + i * 0.3, state: 'hunt', vis: M, seed: rand(0, TAU), age: 0, vx: 0, vy: 0, burrowT: 0 };
  };
  const worms = [];
  for (let i = 0; i < 4; i++) worms.push(makeWorm(w0, h0, i));

  // mười ngón tay sẽ mọc dần khi nhiễm nặng; neo ngẫu nhiên dọc mép mũi tên
  const fingers = Array.from({ length: 10 }, (_, i) => {
    const e = Math.floor(rand(0, V.length));
    const p = V[e];
    const q = V[(e + 1) % V.length];
    const f = rand(0.15, 0.85);
    const ax = p[0] + (q[0] - p[0]) * f;
    const ay = p[1] + (q[1] - p[1]) * f;
    return {
      ax,
      ay,
      ang0: Math.atan2(ay - CEN[1], ax - CEN[0]) + rand(-0.45, 0.45),
      len: rand(0.8, 1.25),
      th: 0.16 + i * 0.075,
      off: 0,
      curl: rand(-0.3, 0.3),
      T: rand(0.1, 0.8),
    };
  });

  const splat = (x, y, r) => {
    const dots = Array.from({ length: 6 }, () => {
      const a = rand(0, TAU);
      const d = rand(0, r * 1.2);
      return [Math.cos(a) * d, Math.sin(a) * d, rand(0.7, 2.4)];
    });
    splats.push({ x, y, dots, r });
    if (splats.length > 30) splats.shift();
  };

  const follow = (nodes, from) => {
    for (let i = Math.max(1, from); i < nodes.length; i++) {
      const a = nodes[i - 1];
      const b = nodes[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      b.x = a.x + (dx / d) * SEG;
      b.y = a.y + (dy / d) * SEG;
    }
  };

  const wormPath = (ctx, pts, from, to) => {
    ctx.beginPath();
    ctx.moveTo(pts[from].x, pts[from].y);
    for (let i = from + 1; i < to; i++) {
      const mx = (pts[i].x + pts[i - 1].x) / 2;
      const my = (pts[i].y + pts[i - 1].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my);
    }
    ctx.lineTo(pts[to - 1].x, pts[to - 1].y);
  };

  const drawWorm = (ctx, colors, wm, t, count) => {
    // thân mảnh nhợt nhạt, gợn sóng lan dọc thân; đứng khựng thì gần như không gợn
    const amp = wm.mode === 'freeze' && wm.state === 'hunt' ? 0.3 : 1.7;
    const pts = [];
    for (let i = 0; i < count; i++) {
      const n = wm.nodes[i];
      const p = wm.nodes[Math.max(0, i - 1)];
      const q = wm.nodes[Math.min(count - 1, i + 1)];
      const a = Math.atan2(p.y - q.y, p.x - q.x);
      const o = Math.sin(t * 6 - i * 0.45 + wm.seed) * amp * (0.35 + 0.65 * Math.min(1, i / 8));
      pts.push({ x: n.x - Math.sin(a) * o, y: n.y + Math.cos(a) * o });
    }
    if (pts.length < 3) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const a = Math.floor(count / 3);
    const b = Math.floor((count * 2) / 3);
    for (const [u, v, w] of [
      [0, a + 1, 2.6],
      [a, b + 1, 2.0],
      [b, count, 1.3],
    ]) {
      if (v - u < 2) continue;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = w + 1.4;
      wormPath(ctx, pts, u, v);
      ctx.stroke();
      ctx.strokeStyle = colors.ink;
      ctx.globalAlpha = 0.92;
      ctx.lineWidth = w;
      wormPath(ctx, pts, u, v);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // đầu: lỗ miệng tròn nhỏ có vòng răng li ti
    const h = pts[0];
    ctx.fillStyle = '#120707';
    ctx.beginPath();
    ctx.arc(h.x, h.y, 2.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 3.1, 0, TAU);
    ctx.stroke();
  };

  const arrowPath = (ctx) => {
    ctx.beginPath();
    V.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  };
  // điểm cách đỉnh mũi tên một đoạn p (0..1) dọc chu vi
  const perim = (p) => {
    let total = 0;
    const L = V.map((a, i) => {
      const b = V[(i + 1) % V.length];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      total += l;
      return l;
    });
    let d = p * total;
    for (let i = 0; i < V.length; i++) {
      if (d <= L[i]) {
        const a = V[i];
        const b = V[(i + 1) % V.length];
        return [a[0] + ((b[0] - a[0]) * d) / L[i], a[1] + ((b[1] - a[1]) * d) / L[i]];
      }
      d -= L[i];
    }
    return V[0];
  };

  const drawCursor = (ctx, colors, x, y, L, t) => {
    ctx.save();
    ctx.translate(x, y);
    const s = 1 + 0.35 * L + Math.sin(t * (3 + 6 * L)) * 0.035 * L;
    ctx.scale(s, s);
    // ngón tay mọc từ mép mũi tên (vẽ trước để thân mũi tên đè lên gốc ngón)
    for (const f of fingers) {
      const g = clamp((L - f.th) / 0.12, 0, 1);
      if (g <= 0) continue;
      const len = (6 + 10 * g) * f.len;
      drawFinger(ctx, f.ax, f.ay, f.ang0 + f.off, len, f.curl, 3 + 1.8 * g, {});
    }
    arrowPath(ctx);
    ctx.fillStyle = colors.panel;
    ctx.fill();
    if (L > 0.04) {
      ctx.globalAlpha = clamp((L - 0.04) / 0.2, 0, 1);
      ctx.fillStyle = FLESH;
      ctx.fill();
      ctx.globalAlpha = 1;
      // gân máu chạy dưới da
      ctx.save();
      arrowPath(ctx);
      ctx.clip();
      ctx.strokeStyle = '#5b1414';
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = clamp(L * 1.4, 0, 0.9);
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const vx = 1 + i * 1.5 + Math.sin(i * 1.3 + k * 2 + t * 0.7) * 1.6;
          const vy = 1 + i * 2.1 + Math.cos(i * 1.1 + k + t * 0.5) * 1.3;
          i ? ctx.lineTo(vx + k * 0.6, vy) : ctx.moveTo(vx + k * 0.6, vy);
        }
        ctx.stroke();
      }
      // cục u của con giun bò dọc dưới da
      const [lx, ly] = perim((t * 0.22) % 1);
      ctx.globalAlpha = clamp(L * 1.2, 0, 0.8);
      ctx.fillStyle = 'rgba(255,230,210,0.5)';
      ctx.beginPath();
      ctx.ellipse(lx * 0.8 + CEN[0] * 0.2, ly * 0.8 + CEN[1] * 0.2, 2.3, 1.6, t, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#5b1414';
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = L > 0.2 ? FLESH_D : colors.ink;
    ctx.lineWidth = 1.2;
    arrowPath(ctx);
    ctx.stroke();
    // mắt giữa mũi tên: nhìn thẳng ra màn hình
    if (L > 0.82) {
      const o = clamp((L - 0.82) / 0.12, 0, 1);
      ctx.fillStyle = '#ece7da';
      ctx.beginPath();
      ctx.ellipse(CEN[0] + 0.4, CEN[1] + 0.8, 3.5, 3.5 * o, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#3a0c0c';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(CEN[0] + 0.4, CEN[1] + 0.8, 1.25, Math.min(1.25, 3.5 * o), 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  return {
    label: 'thin things crawl toward your cursor · click once for sound',
    caption() {
      if (infected) {
        if (level < 0.12) return 'it is going in';
        if (level < 0.35) return 'your cursor feels different';
        if (level < 0.62) return 'something is growing in it';
        if (level < 0.85) return 'it has fingers · shake it out';
        return 'it is looking at you · SHAKE IT OUT';
      }
      if (fresh > 0 && fresh < 6) return corpses.length ? `the fingers are still moving${expelledCount > 1 ? ` (expelled ${expelledCount}x)` : ''}` : 'it is not dead';
      return stateT > 18 ? 'they are close' : 'thin things crawl toward your cursor · click once for sound';
    },
    destroy() {
      dread.destroy();
    },
    step(api) {
      const { ctx, w: W, h: H, t, dt, colors, aim, mouse, idle } = api;
      ctx.canvas.style.cursor = 'none';
      stateT += dt;
      fresh += dt;
      if (!started) {
        started = true;
        cur.x = aim.x;
        cur.y = aim.y;
        prevMx = mouse.x;
      }
      if (mouse.clicks !== seen) {
        seen = mouse.clicks;
        dread.start();
      }
      // tốc độ con trỏ thật (để giun biết bạn đang cử động mạnh hay không)
      if (prevAx === null) {
        prevAx = aim.x;
        prevAy = aim.y;
      }
      aimSpeed += (Math.hypot(aim.x - prevAx, aim.y - prevAy) / Math.max(dt, 0.001) - aimSpeed) * Math.min(1, 8 * dt);
      prevAx = aim.x;
      prevAy = aim.y;

      // ---------- phát hiện lắc chuột (chỉ khi có người thật đang di chuột) ----------
      const mvx = (mouse.x - prevMx) / Math.max(dt, 0.001);
      prevMx = mouse.x;
      if (idle < 0.3 && Math.abs(mvx) > 500) {
        const dir = Math.sign(mvx);
        if (lastDir !== 0 && dir !== lastDir) flips += 1;
        lastDir = dir;
      }
      flips = Math.max(0, flips - dt * 1.6);

      // ---------- mức nhiễm ----------
      const inside = worms.filter((w) => w.state === 'burrow' || w.state === 'in').length;
      infected = inside > 0;
      if (infected) level = clamp(level + dt / 34, 0, 1);
      const L = infected ? level : 0;

      // ---------- con trỏ giả: trễ, đứng hình từng đoạn, run, giật ----------
      let tx = aim.x;
      let ty = aim.y;
      if (infected) {
        spasmT -= dt;
        if (spasmT <= 0) {
          spasm = { x: rand(-1, 1) * (25 + L * 60), y: rand(-1, 1) * (25 + L * 60), t: rand(0.2, 0.5) };
          spasmT = rand(2.5, 6) * (1.3 - L);
        }
        spasm.t -= dt;
        if (spasm.t > 0) {
          tx += spasm.x;
          ty += spasm.y;
        }
        freezeT -= dt;
        if (freezeT <= 0 && L > 0.2) {
          frozen = rand(0.4, 1.1) * (0.5 + L);
          freezeT = rand(3, 7);
        }
      }
      frozen = Math.max(0, frozen - dt);
      const stepHz = infected ? Math.max(8, 22 - 14 * L) : 120;
      stepAcc += dt;
      while (stepAcc >= 1 / stepHz) {
        stepAcc -= 1 / stepHz;
        if (frozen > 0) continue;
        const k = Math.min(1, (infected ? 7 * (1 - L * 0.85) + 1.3 : 40) / stepHz);
        cur.x += (tx - cur.x) * k + (infected ? rand(-1, 1) * L * 2.5 : 0);
        cur.y += (ty - cur.y) * k + (infected ? rand(-1, 1) * L * 2.5 : 0);
      }
      cur.x = clamp(cur.x, 2, W - 2);
      cur.y = clamp(cur.y, 2, H - 2);
      // thỉnh thoảng con trỏ tự bấm: một vệt máu nhỏ
      if (infected && L > 0.2) {
        selfClickT -= dt;
        if (selfClickT <= 0) {
          selfClickT = rand(2.5, 6) * (1.2 - L);
          splat(cur.x + rand(-10, 10), cur.y + rand(-10, 10), rand(3, 8) * (0.6 + L));
        }
      }

      // ---------- giun ----------
      for (const wm of worms) {
        wm.age += dt;
        const head = wm.nodes[0];
        if (wm.state === 'hunt') {
          wm.modeT -= dt;
          if (wm.modeT <= 0) {
            const calm = aimSpeed < 120;
            const r = Math.random();
            if (aimSpeed > 450 && r < 0.75) {
              wm.mode = 'freeze';
              wm.modeT = rand(0.5, 1.4);
            } else if (r < (calm ? 0.34 : 0.15)) {
              wm.mode = 'dash';
              wm.modeT = rand(0.15, 0.3);
            } else if (r < 0.62) {
              wm.mode = 'freeze';
              wm.modeT = rand(0.4, 1.4);
            } else {
              wm.mode = 'creep';
              wm.modeT = rand(0.8, 2);
            }
          }
          const want = Math.atan2(cur.y - head.y, cur.x - head.x);
          const turn = wm.mode === 'dash' ? 4 : 2.2;
          wm.heading += clamp(angDiff(want, wm.heading), -turn * dt, turn * dt) + Math.sin(t * 2.4 + wm.seed) * 0.9 * dt;
          const sp = wm.mode === 'freeze' ? 0 : wm.mode === 'dash' ? 175 : Math.min(75, 36 + stateT * 1.2);
          head.x += Math.cos(wm.heading) * sp * dt + (wm.mode === 'freeze' ? rand(-0.25, 0.25) : 0);
          head.y += Math.sin(wm.heading) * sp * dt + (wm.mode === 'freeze' ? rand(-0.25, 0.25) : 0);
          follow(wm.nodes, 1);
          if (Math.hypot(cur.x - head.x, cur.y - head.y) < 9) {
            wm.state = 'burrow';
            wm.burrowT = 0;
            if (!infected) level = 0;
            level = clamp(level + 0.1, 0, 1);
            splat(cur.x, cur.y, 4);
            dread.stab(0.35);
          }
        } else if (wm.state === 'burrow') {
          wm.burrowT += dt;
          const p = clamp(wm.burrowT / 1.3, 0, 1);
          wm.vis = Math.max(KEEP, Math.round(M - (M - KEEP) * p));
          head.x += (cur.x + 7 - head.x) * Math.min(1, 14 * dt);
          head.y += (cur.y + 16 - head.y) * Math.min(1, 14 * dt);
          for (let i = 1; i < M; i++) {
            wm.nodes[i].x += (head.x - wm.nodes[i].x) * Math.min(1, (1.6 + i * 0.28) * dt);
            wm.nodes[i].y += (head.y - wm.nodes[i].y) * Math.min(1, (1.6 + i * 0.28) * dt);
          }
          if (p >= 1) wm.state = 'in';
        } else if (wm.state === 'in') {
          const ax = cur.x + (7 + (worms.indexOf(wm) - 1.5) * 2) * (1 + 0.35 * L);
          const ay = cur.y + 16 * (1 + 0.35 * L);
          head.x = ax;
          head.y = ay;
          for (let i = 1; i < M; i++) {
            const n = wm.nodes[i];
            n.x += Math.sin(t * (6 + L * 9) + i * 1.1 + wm.seed) * (0.35 + L * 1.0);
            n.y += 13 * dt + Math.cos(t * (5 + L * 8) + i + wm.seed) * (0.25 + L * 0.7);
          }
          follow(wm.nodes, 1);
        } else if (wm.state === 'free') {
          wm.vx *= Math.pow(0.03, dt);
          wm.vy *= Math.pow(0.03, dt);
          wm.heading += Math.sin(t * 13 + wm.seed) * 9 * dt;
          head.x = clamp(head.x + (Math.cos(wm.heading) * 20 + wm.vx) * dt, 3, W - 3);
          head.y = clamp(head.y + (Math.sin(wm.heading) * 20 + wm.vy) * dt, 3, H - 3);
          for (let i = 1; i < M; i++) {
            wm.nodes[i].x += Math.sin(t * 17 + i * 0.9 + wm.seed) * 0.9;
            wm.nodes[i].y += Math.cos(t * 15 + i * 0.8 + wm.seed) * 0.9;
          }
          follow(wm.nodes, 1);
          wm.burrowT += dt;
          if (wm.burrowT > 3) {
            wm.state = 'hunt';
            wm.mode = 'creep';
            wm.modeT = rand(0.5, 1.5);
          }
        }
      }

      // ---------- tống ra ----------
      if (infected && flips >= 7) {
        expelledCount += 1;
        fresh = 0;
        for (const f of fingers) {
          const g = clamp((L - f.th) / 0.12, 0, 1);
          if (g <= 0) continue;
          const a = rand(0, TAU);
          corpses.push({
            x: cur.x + f.ax,
            y: cur.y + f.ay,
            vx: Math.cos(a) * rand(80, 260),
            vy: Math.sin(a) * rand(80, 260),
            ang: f.ang0 + f.off,
            len: (6 + 10 * g) * f.len,
            w: 3 + 1.8 * g,
            curl: f.curl,
            tw: rand(1.5, 5),
            spin: rand(-6, 6),
          });
          if (corpses.length > 18) corpses.shift();
        }
        for (const wm of worms) {
          if (wm.state === 'burrow' || wm.state === 'in') {
            const a = rand(0, TAU);
            wm.state = 'free';
            wm.burrowT = 0;
            wm.vis = M;
            wm.heading = a;
            wm.vx = Math.cos(a) * 380;
            wm.vy = Math.sin(a) * 380;
            for (const n of wm.nodes) {
              n.x = cur.x;
              n.y = cur.y;
            }
          }
        }
        splat(cur.x, cur.y, 16);
        splat(cur.x + rand(-26, 26), cur.y + rand(-26, 26), 9);
        dread.stab(0.8);
        level = 0;
        flips = 0;
        frozen = 0;
      }
      // ngón tay đã rụng: bay rồi nằm lại, thỉnh thoảng giật
      for (const c of corpses) {
        if (Math.abs(c.vx) + Math.abs(c.vy) > 4) {
          c.x = clamp(c.x + c.vx * dt, 4, W - 4);
          c.y = clamp(c.y + c.vy * dt, 4, H - 4);
          c.vx *= Math.pow(0.02, dt);
          c.vy *= Math.pow(0.02, dt);
          c.ang += c.spin * dt;
          c.spin *= Math.pow(0.05, dt);
        } else {
          c.tw -= dt;
          if (c.tw <= 0) {
            c.tw = rand(1.5, 6);
            c.curl = clamp(c.curl + rand(-0.6, 0.6), -0.9, 0.9);
            c.ang += rand(-0.25, 0.25);
          }
        }
      }
      // mỗi ngón tay mọc trên con trỏ giật theo nhịp riêng: đổi góc đột ngột, không mượt
      for (const f of fingers) {
        f.T -= dt;
        if (f.T <= 0) {
          f.T = rand(0.15, 1.2) * (1.4 - L);
          f.off = rand(-0.9, 0.9);
          f.curl = rand(-0.55, 0.55);
        }
      }

      // ================= VẼ =================
      // vết máu cũ: sẫm, ướt, có chấm bóng
      for (const s of splats) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = BLOOD;
        for (const [dx, dy, r] of s.dots) {
          ctx.beginPath();
          ctx.arc(s.x + dx, s.y + dy, r, 0, TAU);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r * 0.6, s.r * 0.45, 0.6, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.ellipse(s.x - s.r * 0.15, s.y - s.r * 0.15, s.r * 0.16, s.r * 0.1, 0.6, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const c of corpses) drawFinger(ctx, c.x, c.y, c.ang, c.len, c.curl, c.w, {});

      for (const wm of worms) {
        if (wm.state === 'in' || wm.state === 'burrow') drawWorm(ctx, colors, wm, t, wm.vis);
        else drawWorm(ctx, colors, wm, t, M);
      }

      if (infected && L > 0.25) {
        ctx.globalAlpha = 0.16 + L * 0.14;
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = 0.9;
        ctx.save();
        ctx.translate(aim.x, aim.y);
        arrowPath(ctx);
        ctx.stroke();
        ctx.restore();
        ghost.a = 1;
        ctx.globalAlpha = 1;
      }
      drawCursor(ctx, colors, cur.x, cur.y, L, t);

      // tối dần quanh con trỏ (che bớt), đỏ thẫm theo nhịp tim ở viền
      if (infected && L > 0.25) {
        const e = clamp((L - 0.25) / 0.75, 0, 1);
        const beat = Math.pow(0.5 + 0.5 * Math.sin(t * (5 + 7 * L)), 6);
        const g = ctx.createRadialGradient(cur.x, cur.y, 40, cur.x, cur.y, Math.max(W, H) * 0.6);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${0.78 * e})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        const r = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
        r.addColorStop(0, 'rgba(110,10,10,0)');
        r.addColorStop(1, `rgba(110,10,10,${(0.1 + 0.3 * beat) * e})`);
        ctx.fillStyle = r;
        ctx.fillRect(0, 0, W, H);
      }

      dread.update({ drone: L * 0.8, breath: infected ? 0.2 + 0.6 * L : 0, whine: L * L, beat: L > 0.2 ? L : 0 }, dt);
      void pick;
    },
  };
}
