import { TAU, angDiff, clamp, rand } from '../../../lib/math.js';
import { makeDread } from '../../../lib/dreadAudio.js';
import { drawFinger, FLESH, FLESH_D, BLOOD } from '../../../lib/dreadDraw.js';
import { readBest, saveBest } from '../../../lib/storage.js';
import { storageKey } from '../../../config/site.js';
import { PARASITE } from '../../../config/creatures.js';

// Parasite: con trỏ trong khung là con trỏ GIẢ do canvas tự vẽ (con trỏ thật bị ẩn) và cũng là CÂY ĐÈN PIN của bạn.
//   ngoài vòng sáng  tối đen: giun gần như vô hình, bò nhanh, đứng khựng rồi phóng từng đoạn
//   trong vòng sáng  giun chậm lại và bị cháy. Ánh sáng có "ngân sách" cố định, chia đều cho mọi con đang trong vòng sáng:
//                    bầy càng đông, mỗi con cháy càng chậm, phải chọn con nào đốt trước
//   bấm chuột        FLARE: vòng sáng nở to một nhịp và đốt mạnh mọi thứ trong đó, rồi phải chờ hồi
//   chui vào         giun chạm tới con trỏ là chui vào, từng đốt một. mức nhiễm tăng dần: con trỏ đổi sang màu da, mọc dần mười ngón tay,
//                    đèn thu nhỏ và chập chờn (càng nhiễm càng khó tự cứu), con trỏ trễ / đứng hình / run. gần cuối giữa mũi tên mở ra
//                    một con mắt nhìn THẲNG ra màn hình. nhiễm đủ 100% là thua
//   tống ra          lắc chuột (đảo chiều liên tục) để tống giun ra: chúng văng ra hoảng loạn (vẫn đốt được), ngón tay rụng nằm lại
//   đợt              mỗi đợt nhiều giun hơn, nhanh hơn, có giun DÀY (trâu, chậm, khó cháy) và giun KIM (mảnh, rất nhanh). dọn hết là sang đợt mới
// Điểm = số giun đã đốt. Kỷ lục lưu localStorage. Bấm khi màn thua hiện ra để chơi lại.
// Tư liệu thiết kế: nỗi sợ nằm ở thứ mình không nhìn thấy (đèn pin hẹp, tối đen xung quanh); cơ thể người sai chỗ đáng sợ hơn máu me.

const BEST_KEY = storageKey('parasite-best');
const SEG = PARASITE.segPx;
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

const KINDS = PARASITE.kinds;
const { worm: PALE, dark: DARK } = PARASITE.colors;
const CURSOR = { panel: PARASITE.colors.cursorPanel, ink: PARASITE.colors.cursorInk }; // con trỏ kiểu cổ điển: trắng viền đen
const LIGHT_R = PARASITE.lightRadius;
const FLARE_T = PARASITE.flareSeconds;
const FLARE_CD = PARASITE.flareCooldownS;
const FONT = PARASITE.fonts.hud;

export function makeParasite(w0, h0) {
  const dread = makeDread();
  let seen = 0; // số cú bấm đã xử lý: nằm ngoài init() để restart không bị tính là một cú flare
  let best = readBest(BEST_KEY);

  // ---- trạng thái ván: init() dựng lại tất cả ----
  let phase, wave, waveState, gapT, toSpawn, spawnT, bannerT, score, newBest, lostT;
  let level, infected, expelledCount, stateT, flips, lastDir, prevMx, spasmT, spasm, freezeT, frozen, stepAcc, selfClickT;
  let started, fresh, flareT, flareCd, flareHit, dropT, dropLeft, sizzleT;
  const cur = { x: 0, y: 0 };
  const worms = [];
  const splats = [];
  const corpses = [];
  const puffs = [];
  let fingers = [];

  const edgeSpawn = (W, H) => {
    const e = Math.floor(rand(0, 4));
    const f = rand(0.1, 0.9);
    return e === 0 ? [f * W, -6] : e === 1 ? [f * W, H + 6] : e === 2 ? [-6, f * H] : [W + 6, f * H];
  };

  const makeWorm = (W, H, kind) => {
    const n = KINDS[kind].len;
    const [x, y] = edgeSpawn(W, H);
    const heading = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.6, 0.6);
    const nodes = [];
    for (let k = 0; k < n; k++) nodes.push({ x: x - Math.cos(heading) * k * SEG, y: y - Math.sin(heading) * k * SEG });
    return { kind, nodes, heading, mode: 'creep', modeT: rand(0.4, 1.2), state: 'hunt', vis: n, seed: rand(0, TAU), vx: 0, vy: 0, burrowT: 0, burn: 0, lit: false, px: new Float32Array(n), py: new Float32Array(n), ptsT: -1, ptsN: 0 };
  };

  // loại giun theo đợt: đợt 2 bắt đầu có giun kim, đợt 3 bắt đầu có giun dày
  const pickKind = () => {
    const r = Math.random();
    if (wave >= 3 && r < 0.18) return 'thick';
    if (wave >= 2 && r < 0.18 + Math.min(0.32, (wave - 1) * 0.08)) return 'needle';
    return 'worm';
  };

  const startWave = () => {
    wave += 1;
    toSpawn = Math.min(40, 4 + Math.floor(wave * 3.2));
    spawnT = 0.3;
    bannerT = 2;
  };

  // mười ngón tay sẽ mọc dần khi nhiễm nặng; neo ngẫu nhiên dọc mép mũi tên
  const makeFingers = () =>
    Array.from({ length: 10 }, (_, i) => {
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

  const init = () => {
    phase = 'play';
    wave = 0;
    waveState = 'gap';
    gapT = 1.4;
    toSpawn = 0;
    spawnT = 0;
    bannerT = 0;
    score = 0;
    newBest = false;
    lostT = 0;
    level = 0;
    infected = false;
    expelledCount = 0;
    stateT = 0;
    flips = 0;
    lastDir = 0;
    prevMx = 0;
    spasmT = rand(3, 6);
    spasm = { x: 0, y: 0, t: 0 };
    freezeT = rand(4, 8);
    frozen = 0;
    stepAcc = 0;
    selfClickT = 3;
    started = false;
    fresh = 99;
    flareT = 0;
    flareCd = 0;
    flareHit = false;
    dropT = rand(1, 3);
    dropLeft = 0;
    sizzleT = 0;
    cur.x = w0 * 0.75;
    cur.y = h0 * 0.4;
    worms.length = 0;
    splats.length = 0;
    corpses.length = 0;
    puffs.length = 0;
    fingers = makeFingers();
  };
  init();

  const splat = (x, y, r) => {
    const dots = Array.from({ length: 6 }, () => {
      const a = rand(0, TAU);
      const d = rand(0, r * 1.2);
      return [Math.cos(a) * d, Math.sin(a) * d, rand(0.7, 2.4)];
    });
    splats.push({ x, y, dots, r });
    if (splats.length > 30) splats.shift();
  };

  // khói / tàn lửa bay lên từ chỗ giun đang cháy
  const puff = (x, y, ember) => {
    puffs.push({ x, y, vx: rand(-10, 10), vy: rand(-26, -8), life: rand(0.35, 0.8), max: 0.8, ember });
    if (puffs.length > 90) puffs.shift();
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

  // có đốt nào (cách 3 đốt kiểm tra một) nằm trong vòng sáng không
  const isLit = (wm, R) => {
    const r2 = R * R;
    for (let i = 0; i < wm.vis; i += 3) {
      const n = wm.nodes[i];
      const dx = n.x - cur.x;
      const dy = n.y - cur.y;
      if (dx * dx + dy * dy < r2) return true;
    }
    return false;
  };

  // đường cong mượt qua các đốt [from, to) của bộ đệm toạ độ (px, py)
  const wormPath = (ctx, px, py, from, to) => {
    ctx.beginPath();
    ctx.moveTo(px[from], py[from]);
    for (let i = from + 1; i < to; i++) {
      ctx.quadraticCurveTo(px[i - 1], py[i - 1], (px[i] + px[i - 1]) / 2, (py[i] + py[i - 1]) / 2);
    }
    ctx.lineTo(px[to - 1], py[to - 1]);
  };

  // tính vị trí gợn sóng của từng đốt vào wm.px / wm.py. Mỗi khung giun được vẽ 2 lần (nền mờ + trong vòng sáng)
  // với đúng cùng toạ độ, nên chỉ tính 1 lần cho mỗi (t, count)
  const ripple = (wm, t, count) => {
    if (wm.ptsT === t && wm.ptsN === count) return;
    wm.ptsT = t;
    wm.ptsN = count;
    // thân gợn sóng lan dọc thân; đứng khựng thì gần như không gợn, đang bị đốt thì quằn quại
    const amp = wm.lit ? 3.4 : wm.mode === 'freeze' && wm.state === 'hunt' ? 0.3 : 1.7;
    const speed = wm.lit ? 14 : 6;
    const { nodes, px, py } = wm;
    for (let i = 0; i < count; i++) {
      const n = nodes[i];
      const p = nodes[i > 0 ? i - 1 : 0];
      const q = nodes[i < count - 1 ? i + 1 : count - 1];
      const a = Math.atan2(p.y - q.y, p.x - q.x);
      const o = Math.sin(t * speed - i * 0.45 + wm.seed) * amp * (0.35 + 0.65 * (i < 8 ? i / 8 : 1));
      px[i] = n.x - Math.sin(a) * o;
      py[i] = n.y + Math.cos(a) * o;
    }
  };

  // màu thân: nhợt nhạt, ngả cam khi đang cháy
  const wormInk = (burn) => `rgb(${Math.round(216 + 39 * burn)},${Math.round(210 - 95 * burn)},${Math.round(196 - 150 * burn)})`;

  const drawWorm = (ctx, wm, t, count) => {
    if (count < 3) return;
    const K = KINDS[wm.kind];
    ripple(wm, t, count);
    const { px, py } = wm;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const a = Math.floor(count / 3);
    const b = Math.floor((count * 2) / 3);
    const ink = wormInk(wm.burn);
    const alpha = ctx.globalAlpha;
    // 3 đoạn dày -> mỏng dần về đuôi; mỗi đoạn dựng đường 1 lần, stroke 2 lần (viền đen rồi ruột)
    for (const [u, v, w] of [
      [0, a + 1, 2.6 * K.w],
      [a, b + 1, 2.0 * K.w],
      [b, count, 1.3 * K.w],
    ]) {
      if (v - u < 2) continue;
      wormPath(ctx, px, py, u, v);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = w + 1.4;
      ctx.stroke();
      ctx.strokeStyle = ink;
      ctx.globalAlpha = alpha * 0.92;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }
    // đầu: lỗ miệng tròn nhỏ có vòng răng li ti
    const hr = Math.max(0.8, K.w * 0.8);
    ctx.fillStyle = '#120707';
    ctx.beginPath();
    ctx.arc(px[0], py[0], 2.4 * hr, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(px[0], py[0], 3.1 * hr, 0, TAU);
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

  const drawCursor = (ctx, colors, x, y, L, t, grow = 1) => {
    ctx.save();
    ctx.translate(x, y);
    const s = (1 + 0.35 * L + Math.sin(t * (3 + 6 * L)) * 0.035 * L) * grow;
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

  const drawSplats = (ctx, a) => {
    for (const s of splats) {
      ctx.globalAlpha = 0.85 * a;
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
    ctx.globalAlpha = a;
    for (const c of corpses) drawFinger(ctx, c.x, c.y, c.ang, c.len, c.curl, c.w, {});
    ctx.globalAlpha = 1;
  };

  const lose = () => {
    phase = 'lost';
    lostT = 0;
    if (score > best) {
      best = score;
      newBest = true;
      saveBest(BEST_KEY, best);
    }
    dread.jump(0.7);
  };

  // dòng chữ trạng thái (đỏ khi bị nhiễm)
  const note = () => {
    if (infected) {
      if (level < 0.12) return 'it is going in';
      if (level < 0.35) return 'your cursor feels different · light is shrinking';
      if (level < 0.62) return 'something is growing in it';
      if (level < 0.85) return 'it has fingers · shake it out';
      return 'it is looking at you · SHAKE IT OUT';
    }
    if (fresh < 6) return corpses.length ? `the fingers are still moving${expelledCount > 1 ? ` (expelled ${expelledCount}x)` : ''}` : 'it is not dead';
    if (waveState === 'gap' && wave > 0) return `wave ${wave} cleared`;
    if (wave <= 1 && stateT < 9) return 'your cursor is a torch · light slows and burns them · click = flare';
    return '';
  };

  return {
    label: '', // chữ trạng thái tự vẽ trên canvas (nền luôn tối nên không dùng chữ theo theme của khung)
    destroy() {
      dread.destroy();
    },
    step(api) {
      const { ctx, w: W, h: H, t, dt, mouse } = api;
      ctx.canvas.style.cursor = 'none';
      stateT += dt;
      fresh += dt;
      if (!started) {
        started = true;
        cur.x = mouse.x;
        cur.y = mouse.y;
        prevMx = mouse.x;
      }

      // ---------- bấm: flare, hoặc chơi lại khi đã thua ----------
      if (mouse.clicks !== seen) {
        seen = mouse.clicks;
        dread.start();
        if (phase === 'lost') {
          if (lostT > 1.4) init();
        } else if (flareCd <= 0) {
          flareT = FLARE_T;
          flareCd = FLARE_CD;
          flareHit = true;
          dread.sizzle(1.6, 0.45);
        }
      }

      const play = phase === 'play';
      if (!play) lostT += dt;
      flareT = Math.max(0, flareT - dt);
      flareCd = Math.max(0, flareCd - dt);
      bannerT = Math.max(0, bannerT - dt);

      // ---------- phát hiện lắc chuột (chỉ khi có người thật đang di chuột) ----------
      const mvx = (mouse.x - prevMx) / Math.max(dt, 0.001);
      prevMx = mouse.x;
      if (play && api.idle < 0.3 && Math.abs(mvx) > 500) {
        const dir = Math.sign(mvx);
        if (lastDir !== 0 && dir !== lastDir) flips += 1;
        lastDir = dir;
      }
      flips = Math.max(0, flips - dt * 1.6);

      // ---------- mức nhiễm ----------
      let inside = 0;
      for (const w of worms) if (w.state === 'burrow' || w.state === 'in') inside++;
      infected = inside > 0;
      if (play && infected) {
        level = clamp(level + (dt / 34) * (1 + 0.45 * (inside - 1)), 0, 1);
        if (level >= 1) lose();
      }
      const L = infected ? level : 0;

      // ---------- con trỏ giả: trễ, đứng hình từng đoạn, run, giật ----------
      let tx = mouse.x;
      let ty = mouse.y;
      if (play && infected) {
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
      if (play) {
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
      }

      // ---------- vòng sáng: nhiễm càng nặng càng nhỏ và chập chờn ----------
      const f = flareT / FLARE_T; // 1 -> 0 trong lúc flare
      let R = LIGHT_R * (1 - 0.32 * L) * (1 - Math.min(0.28, wave * 0.03)) * (1 + 1.15 * f); // pin yếu dần theo đợt
      if (play && infected && L > 0.3) {
        dropT -= dt;
        if (dropT <= 0) {
          dropLeft = rand(0.1, 0.3);
          dropT = rand(1.2, 3.5) * (1.3 - L);
        }
      }
      if (dropLeft > 0) {
        dropLeft -= dt;
        R *= 0.18; // đèn chớp tắt: giun trong bóng tối không bị đốt
      }
      if (!play) R = LIGHT_R * 0.3 * Math.max(0, 1 - lostT / 1.2);
      const power = 1 + 2.5 * f; // ngân sách ánh sáng mỗi giây

      // ---------- đợt giun ----------
      if (play) {
        if (waveState === 'gap') {
          gapT -= dt;
          if (gapT <= 0) {
            startWave();
            waveState = 'on';
          }
        } else if (toSpawn > 0) {
          spawnT -= dt;
          if (spawnT <= 0) {
            worms.push(makeWorm(W, H, pickKind()));
            toSpawn -= 1;
            spawnT = Math.max(0.22, 1.5 - wave * 0.13) * rand(0.7, 1.3);
          }
        } else if (worms.length === 0) {
          waveState = 'gap';
          gapT = 2.8;
        }
      }

      // ---------- giun ----------
      let nLit = 0;
      for (const wm of worms) {
        wm.lit = play && (wm.state === 'hunt' || wm.state === 'free') && isLit(wm, R);
        if (wm.lit) nLit++;
      }
      if (flareHit) {
        flareHit = false;
        for (const wm of worms) if (wm.lit) wm.burn += 0.4; // flare đốt thẳng tay mọi thứ đang trong vòng sáng
      }
      sizzleT -= dt;
      if (play && nLit > 0 && sizzleT <= 0) {
        dread.sizzle(0.3 * Math.min(3, nLit), 0.1);
        sizzleT = 0.11;
      }
      const share = power / Math.max(1, nLit); // chia đều ngân sách ánh sáng cho mọi con trong vòng sáng
      const dead = [];
      if (play) {
        for (const wm of worms) {
          const K = KINDS[wm.kind];
          const head = wm.nodes[0];
          const n = wm.nodes.length;
          const keep = Math.min(12, n - 2);

          if (wm.state === 'hunt' || wm.state === 'free') {
            if (wm.lit) {
              wm.burn += (dt * share) / K.burn;
              if (Math.random() < dt * 16) {
                const nd = wm.nodes[Math.floor(rand(0, wm.vis))];
                puff(nd.x, nd.y, Math.random() < 0.4);
              }
            } else wm.burn = Math.max(0, wm.burn - dt * 0.4);
            if (wm.burn >= 1) {
              dead.push(wm);
              continue;
            }
          }

          if (wm.state === 'hunt') {
            wm.modeT -= dt;
            if (wm.modeT <= 0) {
              const r = Math.random();
              if (K.dash && r < (wm.kind === 'needle' ? 0.4 : 0.28)) {
                wm.mode = 'dash';
                wm.modeT = rand(0.15, 0.3);
              } else if (r < 0.58) {
                wm.mode = 'freeze';
                wm.modeT = rand(0.3, 1);
              } else {
                wm.mode = 'creep';
                wm.modeT = rand(0.8, 2);
              }
            }
            const want = Math.atan2(cur.y - head.y, cur.x - head.x);
            const creepSp = Math.min(150, 40 + wave * 6) * K.speed;
            const dashSp = (190 + wave * 10) * K.speed;
            let sp = wm.mode === 'freeze' ? 0 : wm.mode === 'dash' ? dashSp : creepSp;
            if (wm.lit) sp = creepSp * 0.55; // trong ánh sáng: chậm đi gần một nửa, quằn quại
            const turn = wm.mode === 'dash' && !wm.lit ? 4 : 2.2;
            wm.heading += clamp(angDiff(want, wm.heading), -turn * dt, turn * dt) + Math.sin(t * (wm.lit ? 9 : 2.4) + wm.seed) * (wm.lit ? 2.4 : 0.9) * dt;
            const still = wm.mode === 'freeze' && !wm.lit;
            head.x += Math.cos(wm.heading) * sp * dt + (still ? rand(-0.25, 0.25) : 0);
            head.y += Math.sin(wm.heading) * sp * dt + (still ? rand(-0.25, 0.25) : 0);
            follow(wm.nodes, 1);
            if (Math.hypot(cur.x - head.x, cur.y - head.y) < 9) {
              wm.state = 'burrow';
              wm.burrowT = 0;
              wm.burn = 0;
              if (!infected) level = 0;
              level = clamp(level + 0.12, 0, 1);
              splat(cur.x, cur.y, 4);
              dread.stab(0.35);
            }
          } else if (wm.state === 'burrow') {
            wm.burrowT += dt;
            const p = clamp(wm.burrowT / 1.3, 0, 1);
            wm.vis = Math.max(keep, Math.round(n - (n - keep) * p));
            head.x += (cur.x + 7 - head.x) * Math.min(1, 14 * dt);
            head.y += (cur.y + 16 - head.y) * Math.min(1, 14 * dt);
            for (let i = 1; i < n; i++) {
              wm.nodes[i].x += (head.x - wm.nodes[i].x) * Math.min(1, (1.6 + i * 0.28) * dt);
              wm.nodes[i].y += (head.y - wm.nodes[i].y) * Math.min(1, (1.6 + i * 0.28) * dt);
            }
            if (p >= 1) wm.state = 'in';
          } else if (wm.state === 'in') {
            const ax = cur.x + (7 + (worms.indexOf(wm) % 4 - 1.5) * 2) * (1 + 0.35 * L);
            const ay = cur.y + 16 * (1 + 0.35 * L);
            head.x = ax;
            head.y = ay;
            for (let i = 1; i < n; i++) {
              const nd = wm.nodes[i];
              nd.x += Math.sin(t * (6 + L * 9) + i * 1.1 + wm.seed) * (0.35 + L * 1.0);
              nd.y += 13 * dt + Math.cos(t * (5 + L * 8) + i + wm.seed) * (0.25 + L * 0.7);
            }
            follow(wm.nodes, 1);
          } else if (wm.state === 'free') {
            wm.vx *= Math.pow(0.03, dt);
            wm.vy *= Math.pow(0.03, dt);
            wm.heading += Math.sin(t * 13 + wm.seed) * 9 * dt;
            head.x = clamp(head.x + (Math.cos(wm.heading) * 20 + wm.vx) * dt, 3, W - 3);
            head.y = clamp(head.y + (Math.sin(wm.heading) * 20 + wm.vy) * dt, 3, H - 3);
            for (let i = 1; i < n; i++) {
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
        // giun cháy chết: một vệt nhỏ, khói, rồi biến mất; tính điểm
        for (const wm of dead) {
          worms.splice(worms.indexOf(wm), 1);
          score += 1;
          const h = wm.nodes[0];
          splat(h.x, h.y, 4 + 3 * KINDS[wm.kind].w);
          for (let i = 0; i < 8; i++) {
            const nd = wm.nodes[Math.floor(rand(0, wm.vis))];
            puff(nd.x, nd.y, i % 2 === 0);
          }
          dread.thump(0.3);
        }

        // ---------- tống ra ----------
        if (infected && flips >= 7) {
          expelledCount += 1;
          fresh = 0;
          for (const fg of fingers) {
            const g = clamp((L - fg.th) / 0.12, 0, 1);
            if (g <= 0) continue;
            const a = rand(0, TAU);
            corpses.push({
              x: cur.x + fg.ax,
              y: cur.y + fg.ay,
              vx: Math.cos(a) * rand(80, 260),
              vy: Math.sin(a) * rand(80, 260),
              ang: fg.ang0 + fg.off,
              len: (6 + 10 * g) * fg.len,
              w: 3 + 1.8 * g,
              curl: fg.curl,
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
              wm.burn = 0;
              wm.vis = wm.nodes.length;
              wm.heading = a;
              wm.vx = Math.cos(a) * 380;
              wm.vy = Math.sin(a) * 380;
              for (const nd of wm.nodes) {
                nd.x = cur.x;
                nd.y = cur.y;
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
        // mỗi ngón tay mọc trên con trỏ giật theo nhịp riêng: đổi góc đột ngột, không mượt
        for (const fg of fingers) {
          fg.T -= dt;
          if (fg.T <= 0) {
            fg.T = rand(0.15, 1.2) * (1.4 - L);
            fg.off = rand(-0.9, 0.9);
            fg.curl = rand(-0.55, 0.55);
          }
        }
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
        } else if (play) {
          c.tw -= dt;
          if (c.tw <= 0) {
            c.tw = rand(1.5, 6);
            c.curl = clamp(c.curl + rand(-0.6, 0.6), -0.9, 0.9);
            c.ang += rand(-0.25, 0.25);
          }
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 6 * dt;
        if (p.life <= 0) puffs.splice(i, 1);
      }

      // ================= VẼ =================
      ctx.fillStyle = DARK;
      ctx.fillRect(0, 0, W, H);

      // 1) thế giới trong bóng tối: mờ mờ, đủ để thấy có thứ đang bò (đầu giun lấp lánh nhẹ)
      drawSplats(ctx, 0.3);
      ctx.globalAlpha = 0.3;
      for (const wm of worms) if (wm.state !== 'in' && wm.state !== 'burrow') drawWorm(ctx, wm, t, wm.vis);
      ctx.globalAlpha = 1;

      // 2) vòng sáng: ấm, mép mềm; bên trong vẽ lại mọi thứ đầy đủ
      if (R > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cur.x, cur.y, R, 0, TAU);
        ctx.clip();
        const warm = ctx.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, R);
        warm.addColorStop(0, 'rgba(255,236,190,0.20)');
        warm.addColorStop(1, 'rgba(255,236,190,0.05)');
        ctx.fillStyle = warm;
        ctx.fillRect(cur.x - R, cur.y - R, R * 2, R * 2);
        drawSplats(ctx, 1);
        for (const wm of worms) if (wm.state !== 'in' && wm.state !== 'burrow') drawWorm(ctx, wm, t, wm.vis);
        for (const p of puffs) {
          const a = clamp(p.life / p.max, 0, 1);
          ctx.globalAlpha = a * (p.ember ? 1 : 0.45);
          ctx.fillStyle = p.ember ? '#ffb347' : '#8a8478';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.ember ? 1.1 : 2 + (1 - a) * 2.5, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        const rim = ctx.createRadialGradient(cur.x, cur.y, R * 0.55, cur.x, cur.y, R);
        rim.addColorStop(0, 'rgba(6,7,10,0)');
        rim.addColorStop(1, 'rgba(6,7,10,0.6)');
        ctx.fillStyle = rim;
        ctx.fillRect(cur.x - R, cur.y - R, R * 2, R * 2);
        ctx.restore();
      }
      // vành sóng flare lan ra
      if (flareT > 0) {
        ctx.strokeStyle = `rgba(255,240,205,${0.7 * f})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cur.x, cur.y, R, 0, TAU);
        ctx.stroke();
      }

      // 3) giun đang nằm trong con trỏ: luôn nhìn thấy (là một phần của nó)
      for (const wm of worms) if (wm.state === 'in' || wm.state === 'burrow') drawWorm(ctx, wm, t, wm.vis);

      // 4) vòng hồi flare quanh con trỏ, bóng mờ của con trỏ thật khi bị nhiễm, rồi chính con trỏ giả
      if (play) {
        ctx.lineWidth = 1.4;
        if (flareCd > 0) {
          ctx.strokeStyle = 'rgba(255,200,87,0.55)';
          ctx.beginPath();
          ctx.arc(cur.x + 5, cur.y + 9, 17, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - flareCd / FLARE_CD));
          ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(255,200,87,${0.18 + 0.12 * Math.sin(t * 4)})`;
          ctx.beginPath();
          ctx.arc(cur.x + 5, cur.y + 9, 17, 0, TAU);
          ctx.stroke();
        }
      }
      if (infected && L > 0.25) {
        ctx.globalAlpha = 0.2 + L * 0.2;
        ctx.strokeStyle = PALE;
        ctx.lineWidth = 0.9;
        ctx.save();
        ctx.translate(mouse.x, mouse.y);
        arrowPath(ctx);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      const grow = play ? 1 : 1 + 2.2 * (1 - Math.pow(1 - clamp(lostT / 1.2, 0, 1), 3));
      drawCursor(ctx, CURSOR, cur.x, cur.y, play ? L : 1, t, grow);

      // 5) nhiễm nặng: tối dần quanh con trỏ, đỏ thẫm theo nhịp tim ở viền
      if (infected && L > 0.25) {
        const e = clamp((L - 0.25) / 0.75, 0, 1);
        const beat = Math.pow(0.5 + 0.5 * Math.sin(t * (5 + 7 * L)), 6);
        const r = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
        r.addColorStop(0, 'rgba(110,10,10,0)');
        r.addColorStop(1, `rgba(110,10,10,${(0.1 + 0.3 * beat) * e})`);
        ctx.fillStyle = r;
        ctx.fillRect(0, 0, W, H);
      }

      // 6) chữ: số liệu + trạng thái; biểu ngữ đợt mới
      ctx.font = FONT;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(160,166,178,0.85)';
      ctx.fillText(`wave ${Math.max(1, wave)} · burned ${score} · best ${Math.max(best, score)}`, 12, 10);
      const msg = play ? note() : '';
      if (msg) {
        ctx.fillStyle = infected ? '#d2625a' : 'rgba(160,166,178,0.7)';
        ctx.fillText(msg, 12, 28);
      }
      ctx.textAlign = 'right';
      ctx.fillStyle = flareCd > 0 ? 'rgba(160,166,178,0.45)' : 'rgba(255,200,87,0.85)';
      ctx.fillText(flareCd > 0 ? `flare ${Math.ceil(flareCd)}s` : 'click · flare', W - 12, 10);
      if (bannerT > 0 && play) {
        ctx.textAlign = 'center';
        ctx.font = PARASITE.fonts.banner;
        ctx.fillStyle = `rgba(235,230,220,${clamp(bannerT / 0.6, 0, 1) * clamp((2 - bannerT) / 0.3, 0, 1)})`;
        ctx.fillText(`WAVE ${wave}`, W / 2, H * 0.14);
      }

      // 7) thua: tối sầm, một câu, rồi mời chơi lại
      if (!play) {
        const a = clamp((lostT - 0.5) / 1, 0, 1) * 0.86;
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.fillRect(0, 0, W, H);
        if (lostT > 1.1) {
          const ta = clamp((lostT - 1.1) / 0.6, 0, 1);
          ctx.textAlign = 'center';
          ctx.font = PARASITE.fonts.lose;
          ctx.fillStyle = `rgba(214,92,84,${ta})`;
          ctx.fillText('it has your hand.', W / 2, H * 0.36);
          ctx.font = FONT;
          ctx.fillStyle = `rgba(190,196,208,${ta})`;
          ctx.fillText(`wave ${wave} · burned ${score}${newBest ? ' · new best!' : ` · best ${best}`}`, W / 2, H * 0.36 + 34);
          if (lostT > 1.4) {
            ctx.fillStyle = `rgba(255,200,87,${0.55 + 0.35 * Math.sin(t * 3)})`;
            ctx.fillText('click to try again', W / 2, H * 0.36 + 62);
          }
        }
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      dread.update({ drone: play ? 0.1 + 0.7 * L : 0, breath: play && infected ? 0.2 + 0.6 * L : 0, whine: play ? L * L : 0, beat: play && L > 0.2 ? L : 0 }, dt);
    },
  };
}
