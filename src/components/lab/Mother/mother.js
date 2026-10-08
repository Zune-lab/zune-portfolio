import { TAU, clamp, rand, randInt, pick } from '../../../lib/math.js';
import { makeDread } from '../../../lib/dreadAudio.js';
import { drawFace, drawHand, BLOOD } from '../../../lib/dreadDraw.js';

// Mother: trong bóng tối, một khối tóc đen khổng lồ đang thở. Dưới tóc là một khuôn mặt nhợt nhạt, mắt nhắm, mắt đảo dưới mí như đang mơ.
// Hai bàn tay dài nằm trên sàn, ngón thỉnh thoảng giật. Những đứa con bò quanh sàn kiểu nhện (tay chân gập ngược), đầu quay thẳng ra màn hình.
//   bấm vào bà           -> bà trở mình, tóc xào xạc, một đứa con bò ra
//   bấm trúng một đứa    -> bóp chết: vết máu trên sàn, bà giận hơn nhiều
//   đứng yên vài giây    -> bà đói: một cánh tay dài trườn ra sàn tóm đứa con lôi vào tóc
//   giận tới 100%        -> bà TỈNH. tóc rẽ ra, mắt mở trừng nhìn thẳng vào bạn, nụ cười rạch tới tận má, camera bị kéo lại gần từng nấc.
//                           bà chỉ thấy thứ đang chuyển động: đứng yên thì bà ngờ ngợ rồi nhắm mắt lại. cử động quá lâu thì hai bàn tay
//                           trườn vào từ hai bên, bịt kín màn hình. tối đen. "shh."
// Tư liệu thiết kế: che bớt trong bóng tối, bất đối xứng, mặt gần giống người nhưng sai, ánh nhìn thẳng vào camera, đứng yên rồi giật cục (stop-motion 9-12 khung/giây).

const MAX_KIDS = 14;
const SKIN_KID = '#a89f90';
const HAND = { edge: '#14100d', flesh: '#a89f90', nail: '#c9c0b0' };
const ease = (x) => x * x * (3 - 2 * x);

export function makeMother(_w0, _h0) {
  const dread = makeDread();
  let state = 'sleep'; // sleep | awake | cover | black
  let stateT = 0;
  let anger = 0;
  let calmT = 0;
  let seen = 0;
  let stareT = 0;
  let wakes = 0;
  let flinch = 0;
  let part = 0; // 0 tóc phủ mặt, 1 tóc rẽ hẳn
  let eating = null;
  let eatCool = 3;
  let lastKind = 'start';
  let tickAcc = 0;
  let freezeAll = 0;
  let freezeT = rand(6, 11);
  let tiltSnap = 0;
  let tiltT = rand(3, 7);
  let remT = 0;
  const kids = [];
  const splats = [];
  const fing = [0, 1].map(() => Array.from({ length: 5 }, () => ({ c: rand(0.15, 0.4), T: rand(1, 5) })));

  // sợi tóc: toạ độ chuẩn hoá theo F (nửa bề ngang mặt) và hh (nửa chiều cao mặt)
  const strands = [];
  for (let i = 0; i < 118; i++) {
    const th = rand(Math.PI, TAU);
    const sg = Math.cos(th) >= 0 ? 1 : -1;
    strands.push({ kind: 'back', ax: Math.cos(th) * 1.04, ay: Math.sin(th) * 1.04, sg, u: Math.pow(rand(0, 1), 1.4), sw: rand(0, TAU), k: rand(0.6, 1.2) });
  }
  for (let i = 0; i < 26; i++) {
    const ux = rand(-0.85, 0.85);
    strands.push({ kind: 'bang', ax: ux, ay: -Math.sqrt(1 - ux * ux), ex: ux * 0.9 + rand(-0.15, 0.15), ey: rand(0.05, 0.95), sw: rand(0, TAU), k: rand(0.6, 1.2) });
  }

  const geom = (W, H) => {
    const F = Math.min(H * 0.2, W * 0.14);
    return { F, hh: F * 1.5, cx: W / 2, cy: H * 0.56 };
  };
  const childScale = (y, H) => H * 0.06 * (0.7 + 0.6 * clamp((y - H * 0.66) / (H * 0.29), 0, 1));

  const splat = (x, y, r) => {
    const dots = Array.from({ length: 7 }, () => {
      const a = rand(0, TAU);
      const d = rand(0, r * 1.3);
      return [Math.cos(a) * d, Math.sin(a) * d, rand(0.8, 2.6)];
    });
    splats.push({ x, y, r, dots });
    if (splats.length > 36) splats.shift();
  };

  const addKid = (W, H) => {
    if (kids.length >= MAX_KIDS) return;
    const { cx, F } = geom(W, H);
    kids.push({
      x: cx + pick([-1, 1]) * rand(F * 1.2, W * 0.24),
      y: H * rand(0.86, 0.94),
      ang: rand(0, TAU),
      ph: rand(0, TAU),
      seed: rand(0, TAU),
      turnT: rand(0.6, 2),
      speed: rand(16, 34),
      born: 0,
    });
  };

  // ---------- vẽ ----------
  const drawKid = (ctx, k, H, qt, frozen) => {
    const c = childScale(k.y, H);
    const x = k.x + (frozen ? Math.sin(qt * 90 + k.seed) * 0.6 : 0);
    const y = k.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(k.ang);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const hips = [
      [0.35, -0.2],
      [0.35, 0.2],
      [-0.35, -0.2],
      [-0.35, 0.2],
    ];
    ctx.strokeStyle = SKIN_KID;
    ctx.lineWidth = Math.max(0.8, 0.07 * c);
    hips.forEach(([hx, hy], i) => {
      const sgn = hy < 0 ? -1 : 1;
      const sw = frozen ? 0 : Math.sin(k.ph + (i === 0 || i === 3 ? 0 : Math.PI));
      const kx = (hx + 0.1) * c;
      const ky = hy * c + sgn * 0.45 * c;
      ctx.beginPath();
      ctx.moveTo(hx * c, hy * c);
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx + sw * 0.35 * c, ky + sgn * 0.5 * c);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.5 * c, 0.26 * c, 0, 0, TAU);
    ctx.fillStyle = SKIN_KID;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = Math.max(0.6, 0.03 * c);
    ctx.stroke();
    ctx.restore();
    // đầu luôn quay thẳng ra màn hình, bất kể thân đang bò hướng nào
    drawFace(ctx, {
      x: x + Math.cos(k.ang) * 0.62 * c,
      y: y + Math.sin(k.ang) * 0.62 * c - 0.2 * c,
      S: 0.2 * c,
      eye: 1,
      pupil: 0.2,
      jaw: 0.04,
      aspect: 1.3,
      skin: SKIN_KID,
      seed: k.seed,
    });
  };

  const drawArm = (ctx, sx, sy, tx, ty, w) => {
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2 + Math.hypot(tx - sx, ty - sy) * 0.12;
    for (const [col, wd] of [
      ['#050505', w + 1.6],
      [SKIN_KID, w],
    ]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = wd;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, tx, ty);
      ctx.stroke();
    }
  };
  let ctx;

  return {
    label: "she's asleep in the dark · click her to poke",
    caption() {
      if (state === 'awake') return stareT > 1.5 ? 'DO NOT MOVE' : "she's awake · do not move";
      if (state === 'cover' || state === 'black') return '';
      if (eating) return "she's hungry again";
      if (lastKind === 'forgiven' && anger < 0.05) return wakes > 1 ? `she forgives you. again. (woke ${wakes}x)` : 'she forgives you. the children do not.';
      if (lastKind === 'sleepagain' && anger > 0.4) return "she's pretending she didn't see";
      if (kids.length) return anger > 0.6 ? 'click the children. or do not.' : 'click the children. or do not. (she is hungry)';
      return anger > 0.3 ? 'she is stirring' : "she's asleep in the dark · click her to poke";
    },
    destroy() {
      dread.destroy();
    },
    step(api) {
      ctx = api.ctx;
      const { w: W, h: H, t, dt, aim, mouse, idle } = api;
      const g = geom(W, H);
      const { F, hh, cx, cy } = g;
      const qt = Math.floor(t * 9) / 9;
      stateT += dt;
      flinch = Math.max(0, flinch - dt * 2.4);
      eatCool -= dt;

      // ---------- bấm ----------
      if (mouse.clicks !== seen) {
        seen = mouse.clicks;
        dread.start();
        calmT = 0;
        if (state === 'sleep') {
          let hit = -1;
          for (let i = kids.length - 1; i >= 0; i--) {
            if (Math.hypot(kids[i].x - mouse.x, kids[i].y - mouse.y) < Math.max(16, childScale(kids[i].y, H) * 0.8)) {
              hit = i;
              break;
            }
          }
          if (hit >= 0) {
            const kd = kids[hit];
            if (eating && eating.kid === kd) eating = null;
            splat(kd.x, kd.y, 12);
            kids.splice(hit, 1);
            anger += 0.24;
            flinch = 1;
            lastKind = 'squash';
            dread.thump(1);
          } else {
            const dx = (mouse.x - cx) / (W * 0.3);
            const dy = (mouse.y - H * 0.75) / (H * 0.55);
            if (dx * dx + dy * dy < 1) {
              anger += 0.09;
              flinch = 1;
              for (let i = randInt(1, 2); i > 0; i--) addKid(W, H);
              lastKind = 'poke';
              dread.thump(0.5);
            }
          }
          if (anger >= 1) {
            state = 'awake';
            stateT = 0;
            stareT = 1.1;
            wakes += 1;
            anger = 1;
            dread.stab(0.55);
          }
        }
      }

      // ---------- logic ----------
      const moving = idle < 0.35;
      if (state === 'sleep') {
        calmT += dt;
        if (calmT > 1.6) anger = Math.max(0, anger - dt * 0.07);
        if (!eating && calmT > 3 && kids.length && eatCool <= 0) {
          let best = null;
          let bd = 1e9;
          for (const k of kids) {
            const d = Math.hypot(k.x - cx, k.y - H * 0.9);
            if (d < bd) {
              bd = d;
              best = k;
            }
          }
          eating = { kid: best, t: 0, phase: 'out', side: best.x < cx ? -1 : 1 };
        }
      } else if (state === 'awake') {
        stareT += moving ? dt : -dt * 0.7;
        if (stareT >= 2.3) {
          state = 'cover';
          stateT = 0;
          eating = null;
        } else if (stareT <= 0 && stateT > 0.6) {
          state = 'sleep';
          stateT = 0;
          anger = 0.55;
          calmT = 0;
          lastKind = 'sleepagain';
        }
      } else if (state === 'cover') {
        if (stateT > 1.0) {
          state = 'black';
          stateT = 0;
          dread.stab(1);
        }
      } else if (state === 'black') {
        if (stateT > 4) {
          state = 'sleep';
          stateT = 0;
          anger = 0;
          calmT = 0;
          stareT = 0;
          kids.length = 0;
          eatCool = 3;
          lastKind = 'forgiven';
          for (let i = 0; i < 5; i++) splat(rand(20, W - 20), rand(H * 0.68, H * 0.95), rand(6, 14));
        }
      }
      part += ((state === 'awake' ? 1 : clamp(anger * 0.2, 0, 0.2)) - part) * Math.min(1, 2.5 * dt);

      // đàn con: bò từng nhịp (stop-motion 12Hz), thỉnh thoảng cả đàn đứng khựng cùng lúc
      freezeT -= dt;
      if (freezeT <= 0 && state === 'sleep') {
        freezeAll = rand(1, 1.8);
        freezeT = rand(7, 13);
      }
      freezeAll = Math.max(0, freezeAll - dt);
      const frozenKids = state !== 'sleep' || freezeAll > 0;
      tickAcc += dt;
      while (tickAcc >= 1 / 12) {
        tickAcc -= 1 / 12;
        if (frozenKids) continue;
        for (const k of kids) {
          k.born += 1 / 12;
          if (eating && eating.kid === k) continue;
          k.turnT -= 1 / 12;
          if (k.turnT <= 0) {
            k.turnT = rand(0.6, 2.2);
            k.ang += rand(-1.3, 1.3);
          }
          k.ph += 1.4;
          const sp = k.speed * (k.born < 0.8 ? 1.8 : 1);
          k.x += Math.cos(k.ang) * sp * (1 / 12);
          k.y += Math.sin(k.ang) * sp * (1 / 12) * 0.6;
          if (k.x < 12 || k.x > W - 12) {
            k.x = clamp(k.x, 12, W - 12);
            k.ang = Math.PI - k.ang;
          }
          if (k.y < H * 0.66 || k.y > H * 0.95) {
            k.y = clamp(k.y, H * 0.66, H * 0.95);
            k.ang = -k.ang;
          }
        }
      }

      // ngón tay giật, đầu bà thỉnh thoảng nghiêng giật
      for (const hand of fing)
        for (const f of hand) {
          f.T -= dt;
          if (f.T <= 0) {
            f.T = rand(0.8, 5) * (state === 'awake' ? 0.2 : 1);
            f.c = clamp(f.c + rand(-0.45, 0.45), 0.05, 0.7);
          }
        }
      tiltT -= dt;
      if (tiltT <= 0) {
        tiltT = rand(3, 7);
        tiltSnap = rand(-0.07, 0.07) * (1 + anger * 2);
        remT = 0.18;
      }
      remT = Math.max(0, remT - dt);

      // âm thanh
      const aw = state === 'awake' ? 1 : 0;
      dread.update(
        {
          drone: state === 'black' ? 0 : 0.2 + 0.5 * anger + 0.3 * aw,
          breath: state === 'black' ? 0 : 0.3 + 0.5 * anger,
          whine: aw * clamp(stareT / 2.3, 0, 1),
          beat: aw ? 0.6 + 0.4 * clamp(stareT / 2.3, 0, 1) : anger > 0.5 ? anger - 0.4 : 0,
        },
        dt,
      );

      // ================= VẼ =================
      ctx.fillStyle = 'rgba(5, 6, 9, 0.94)';
      ctx.fillRect(0, 0, W, H);
      const fog = ctx.createLinearGradient(0, H * 0.55, 0, H);
      fog.addColorStop(0, 'rgba(150,160,185,0)');
      fog.addColorStop(0.5, 'rgba(150,160,185,0.07)');
      fog.addColorStop(1, 'rgba(150,160,185,0)');
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, W, H);

      // vết máu trên sàn
      for (const s of splats) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = BLOOD;
        for (const [dx, dy, r] of s.dots) {
          ctx.beginPath();
          ctx.arc(s.x + dx, s.y + dy, r, 0, TAU);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r * 0.7, s.r * 0.4, 0.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(s.x - s.r * 0.15, s.y - s.r * 0.12, s.r * 0.16, s.r * 0.08, 0.2, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // camera kéo lại gần từng nấc khi bà đang nhìn bạn
      const zoomRaw = state === 'awake' ? clamp(stareT / 2.3, 0, 1) : 0;
      const zoom = 1 + 0.5 * (Math.floor(zoomRaw * 10) / 10);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
      if (state === 'awake') ctx.translate(Math.sin(qt * 80) * 1.2 * zoomRaw, Math.cos(qt * 70) * 1.2 * zoomRaw);

      // khối tóc: thở nhè nhẹ, giật khi bị chọc
      const breath = 1 + Math.sin(t * (state === 'awake' ? 4.5 : 1.2)) * (state === 'awake' ? 0.012 : 0.008) + flinch * 0.02;
      ctx.save();
      ctx.translate(cx, H);
      ctx.scale(1, breath);
      ctx.translate(-cx, -H);
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.34, H + 10);
      ctx.bezierCurveTo(cx - W * 0.3, cy + hh * 0.3, cx - F * 1.7, cy - hh * 0.2, cx - F * 1.1, cy - hh * 0.75);
      ctx.bezierCurveTo(cx - F * 0.8, cy - hh * 1.35, cx + F * 0.8, cy - hh * 1.35, cx + F * 1.1, cy - hh * 0.75);
      ctx.bezierCurveTo(cx + F * 1.7, cy - hh * 0.2, cx + W * 0.3, cy + hh * 0.3, cx + W * 0.34, H + 10);
      ctx.closePath();
      ctx.fillStyle = '#020203';
      ctx.fill();
      ctx.restore();

      // hai cánh tay dài + bàn tay nằm trên sàn (hơi mờ để khuôn mặt vẫn là trung tâm)
      for (let i = 0; i < 2; i++) {
        const sd = i === 0 ? -1 : 1;
        const shx = cx + sd * F * 1.3;
        const shy = cy + hh * 0.95;
        let hx = cx + sd * F * 2.9;
        let hy = H * 0.9;
        if (state === 'awake') {
          // trườn dần về phía con trỏ từng nấc
          const q = Math.floor(zoomRaw * 8) / 8;
          hx += (aim.x - sd * F * 0.5 - hx) * q * 0.55;
          hy += (clamp(aim.y, H * 0.6, H * 0.92) - hy) * q * 0.5;
        }
        drawArm(ctx, shx, shy, hx, hy, F * 0.13);
        ctx.globalAlpha = 0.8;
        drawHand(ctx, hx, hy, sd < 0 ? -0.45 : Math.PI + 0.45, F * 0.95, 0.38, fing[i].map((f) => f.c), HAND);
        ctx.globalAlpha = 1;
      }

      // mặt: mắt nhắm khi ngủ, mắt mở trừng khi tỉnh; không bao giờ rời khỏi bạn
      const awakeK = state === 'awake' ? clamp(stateT * 4, 0, 1) : 0;
      const eyeSleep = clamp((anger - 0.3) * 0.35, 0, 0.18) + flinch * 0.12;
      drawFace(ctx, {
        x: cx,
        y: cy + Math.sin(t * 1.2) * 1.5,
        S: F,
        aspect: 1.5,
        skin: '#c9c2b2',
        jaw: state === 'awake' ? 0.18 + 0.1 * Math.sin(qt * 60) * zoomRaw : anger > 0.6 ? 0.03 + 0.02 * Math.sin(t * 9) : 0,
        eye: state === 'awake' ? awakeK : eyeSleep,
        pupil: state === 'awake' ? 0.1 + 0.5 * zoomRaw : 0.1,
        smile: state === 'awake' ? 0.15 + 0.5 * zoomRaw : 0,
        rem: remT > 0 ? Math.sin(t * 30) : Math.sin(t * 0.8) * (anger < 0.3 ? 1 : 0),
        tilt: remT > 0 ? tiltSnap : 0,
        seed: 3.3,
        dim: 1,
      });

      // sợi tóc: phần lớn chỉ ánh lên mờ trên nền đen; mái tóc rủ qua mặt đen đặc
      const sw = 4 + anger * 9;
      for (const s of strands) {
        const ax = cx + s.ax * F;
        const ay = cy + s.ay * hh;
        let ex;
        let ey;
        if (s.kind === 'back') {
          ex = cx + s.sg * (F * 1.12 + s.u * W * 0.3);
          ey = H + 20;
        } else {
          const dx0 = s.ex * F;
          const side = dx0 >= 0 ? 1 : -1;
          const edgeX = side * (F * 1.12 + Math.abs(dx0) * 0.4);
          ex = cx + dx0 + (edgeX - dx0) * part;
          ey = cy + s.ey * hh + part * hh * 0.6;
        }
        const sway1 = Math.sin(t * 0.7 + s.sw) * sw * 0.5;
        const sway2 = Math.sin(t * 0.9 + s.sw * 1.7) * sw;
        const dx = ex - ax;
        const dy = ey - ay;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.bezierCurveTo(ax + (s.kind === 'back' ? s.sg * F * 0.35 : dx * 0.1) + sway1, ay + dy * 0.3, ax + dx * 0.85 + sway2, ay + dy * 0.7, ex, ey);
        if (s.kind === 'bang') {
          ctx.strokeStyle = 'rgba(0,0,0,0.96)';
          ctx.lineWidth = 1.9 * s.k;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(130,138,155,0.2)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(130,138,155,0.17)';
          ctx.lineWidth = 0.9 * s.k;
          ctx.stroke();
        }
      }
      ctx.restore();

      // đàn con (sắp theo chiều sâu)
      const frozenDraw = state === 'awake' || freezeAll > 0;
      for (const k of [...kids].sort((a, b) => a.y - b.y)) drawKid(ctx, k, H, qt, frozenDraw);

      // cánh tay dài tóm một đứa con
      if (eating) {
        eating.t += dt;
        const kd = eating.kid;
        const sd = eating.side;
        const shx = cx + sd * F * 1.3;
        const shy = cy + hh * 0.95;
        let k;
        if (eating.phase === 'out') {
          k = clamp(eating.t / 0.7, 0, 1);
          if (k >= 1) {
            eating.phase = 'back';
            eating.t = 0;
            eating.fx = kd.x;
            eating.fy = kd.y;
          }
        } else {
          k = 1 - clamp(eating.t / 0.9, 0, 1);
          kd.x = cx + (eating.fx - cx) * k;
          kd.y = H * 0.93 + (eating.fy - H * 0.93) * k;
          if (eating.t >= 0.9) {
            const i = kids.indexOf(kd);
            if (i >= 0) kids.splice(i, 1);
            anger = Math.max(0, anger - 0.05);
            eating = null;
            eatCool = rand(1.5, 3);
            dread.thump(0.7);
          }
        }
        if (eating) {
          const ex = shx + (kd.x - shx) * k;
          const ey = shy + (kd.y - shy) * k;
          drawArm(ctx, shx, shy, ex, ey, F * 0.1);
          const a = Math.atan2(kd.y - shy, kd.x - shx);
          const curl = eating.phase === 'back' ? 0.8 : 0.3;
          drawHand(ctx, ex, ey, a, F * 0.5, 0.3, [curl, curl, curl, curl, curl], HAND);
        }
      }

      // vignette: tối dần, che bớt
      const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.25, W / 2, H * 0.55, Math.max(W, H) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${0.82 + 0.1 * anger})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      // ---------- bàn tay bịt màn hình, rồi tối đen ----------
      if (state === 'cover') {
        const e = ease(clamp(stateT / 0.9, 0, 1));
        const size = H * 1.05;
        const q = Math.floor(e * 14) / 14; // trườn từng nấc
        // hai bàn tay vào từ hai bên, dừng ở giữa với các ngón đan vào nhau
        const endL = cx - size * 0.35;
        const endR = cx + size * 0.35;
        const hxL = -size * 0.6 + (endL + size * 0.6) * q;
        const hxR = W + size * 0.6 - (W + size * 0.6 - endR) * q;
        drawHand(ctx, hxL, H * 0.5, 0.06, size, 0.34, [0.06, 0.1, 0.07, 0.1, 0.06], HAND);
        drawHand(ctx, hxR, H * 0.6, Math.PI - 0.06, size, 0.34, [0.07, 0.1, 0.06, 0.09, 0.07], HAND);
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(0,0,0,${0.97 * clamp((e - 0.6) / 0.4, 0, 1)})`;
        ctx.fillRect(0, 0, W, H);
      } else if (state === 'black') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        ctx.font = '14px ui-monospace, monospace';
        ctx.textAlign = 'center';
        const line = (txt, at, y, col, a = 1) => {
          if (stateT > at) {
            ctx.globalAlpha = clamp((stateT - at) / 0.5, 0, 1) * a;
            ctx.fillStyle = col;
            ctx.fillText(txt, W / 2, y);
          }
        };
        line('shh.', 0.9, H / 2 - 22, '#ebe4d2');
        line('she forgives you.', 1.9, H / 2 + 2, '#ebe4d2');
        line('the children do not.', 3.0, H / 2 + 24, '#a33232', 0.8);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'start';
      }
    },
  };
}
