import { TAU, clamp, pick, rand, randInt, smoothstep } from '../../../lib/math.js';
import { makeDread, PARAM_STEP } from '../../../lib/dreadAudio.js';
import { drawFace } from '../../../lib/dreadDraw.js';
import { CHOIR } from '../../../config/creatures.js';

// Choir: một dàn đồng ca đứng trong bóng tối, mặt hướng thẳng ra màn hình, mắt không bao giờ rời bạn (đồng tử luôn ở giữa, không chớp).
// Người cao gầy, tay dài quá gối, cổ dài, đầu nghiêng lệch theo những cú giật (không bao giờ mượt). Chỉ có cái hàm là cử động trơn tru:
// nó trật xuống dài hơn cả khuôn mặt khi hát.
//
// Bạn là nhạc trưởng. Rê chuột = chúng hát. DỪNG LẠI một lúc thì chúng im, đứng thẳng đồng loạt, và bước lên một nhịp cho mỗi nhịp tim.
//   bấm chuột        -> hợp âm đập xuống: cả dàn há miệng, bị đẩy lùi lại, nhưng dàn có thêm một người (càng đông càng lệch tông)
//   để chúng tới gần -> người đứng đầu chạm màn hình: im bặt, mặt phóng lên phủ kín khung, hàm rơi, rồi đen. rồi lại bắt đầu, thêm một người.
// Tư liệu thiết kế: bất đối xứng, giống người nhưng sai một chút, mặt trên đứng yên, cơ thể giật theo nhịp thấp (stop-motion) trong lúc hàm vẫn mượt,
// bóng tối che bớt, và ánh nhìn thẳng ra camera (phá bức tường thứ tư).

const MAX = CHOIR.maxSingers;
const CHORD = CHOIR.chord;
const TILTS = CHOIR.tilts;
const { robe: ROBE, skin: PALE, edge: EDGE, text: TEXT } = CHOIR.colors;


export function makeChoir() {
  const dread = makeDread();
  const figs = [];
  const order = []; // figs xếp xa -> gần để vẽ
  const byDepth = (a, b) => a.z - b.z;
  let seen = 0;
  let Es = 0; // năng lượng "chỉ huy" 0..1
  let sil = 0; // số giây im lặng liên tục
  let adv = 0;
  let hit = 0; // dư âm cú đập hợp âm
  let flash = 0;
  let state = 'play'; // play | arrive | black
  let stateT = 0;
  let arrivee = null;
  let cycles = 0;
  let whisperT = 3;
  let prevAx = null;
  let prevAy = 0;
  let lastText = '';
  let panic = 0;
  let voiceAt = 0; // lần cuối đẩy tham số giọng sang WebAudio

  const addFig = (z) => {
    figs.push({
      x: rand(0.07, 0.93),
      z,
      z0: z,
      seed: rand(0, TAU),
      tilt: 0,
      tiltT: rand(0.4, 3),
      armK: rand(0.95, 1.32),
      neckK: rand(0.9, 1.7),
      rate: rand(1.4, 2.6),
      speed: rand(0, 1),
      open: 0,
      whisper: 0,
      voice: null,
      idx: figs.length,
    });
  };
  const n0 = randInt(7, 9);
  for (let i = 0; i < n0; i++) addFig(rand(0.04, 0.5));

  // ---------- giọng hát ----------
  const makeVoice = (f) => {
    const c = dread.ctx;
    const osc = c.createOscillator();
    const osc2 = c.createOscillator();
    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc2.detune.value = rand(-9, 9);
    const f1 = c.createBiquadFilter();
    const f2 = c.createBiquadFilter();
    f1.type = 'bandpass';
    f2.type = 'bandpass';
    f1.Q.value = 5;
    f2.Q.value = 8;
    const g1 = c.createGain();
    const g2 = c.createGain();
    g2.gain.value = 0.55;
    const out = c.createGain();
    out.gain.value = 0;
    osc.connect(f1);
    osc2.connect(f1);
    osc.connect(f2);
    osc2.connect(f2);
    f1.connect(g1);
    f2.connect(g2);
    g1.connect(out);
    g2.connect(out);
    out.connect(dread.out);
    osc.start();
    osc2.start();
    f.voice = { osc, osc2, f1, f2, out };
  };
  // dừng và ngắt giọng của một người; gọi trước khi bỏ người đó khỏi dàn
  const killVoice = (f) => {
    const v = f.voice;
    if (!v) return;
    f.voice = null;
    try {
      v.osc.stop();
      v.osc2.stop();
      v.out.disconnect();
    } catch {
      /* AudioContext đã đóng */
    }
  };
  const semis = (f, unease) => {
    const base = CHORD[f.idx % CHORD.length] + (f.idx >= CHORD.length ? 12 : 0);
    return base + [1, -0.55, 0.8, -1.2][f.idx % 4] * unease * 1.5;
  };

  // ---------- hình học ----------
  const geo = (f, W, H) => {
    const z = f.z;
    const fh = H * (0.36 + 0.78 * Math.pow(z, 1.5));
    const feetY = H * (0.7 + 0.42 * Math.pow(z, 1.2));
    const xs = W * (0.5 + (f.x - 0.5) * (0.75 + 0.35 * z));
    return { fh, feetY, xs };
  };

  const drawFig = (ctx, f, W, H, t, qt) => {
    const { fh: u, feetY, xs } = geo(f, W, H);
    const a = 0.3 + 0.7 * Math.pow(f.z, 0.6);
    const sway = Math.sin(qt * 0.8 + f.seed) * 0.006 * u;
    const bx = xs + sway;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, feetY);
    // áo choàng đen: chỉ hiện ra nhờ viền sáng mờ
    ctx.beginPath();
    ctx.moveTo(-0.15 * u, 0);
    ctx.quadraticCurveTo(-0.1 * u, -0.38 * u, -0.085 * u, -0.7 * u);
    ctx.lineTo(-0.03 * u, -0.745 * u);
    ctx.lineTo(0.03 * u, -0.745 * u);
    ctx.lineTo(0.085 * u, -0.7 * u);
    ctx.quadraticCurveTo(0.1 * u, -0.38 * u, 0.15 * u, 0);
    ctx.closePath();
    ctx.fillStyle = ROBE;
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(0.7, u * 0.004);
    ctx.stroke();
    ctx.globalAlpha = a * 0.5;
    ctx.beginPath();
    for (const k of [-0.05, 0.02, 0.07]) {
      ctx.moveTo(k * u, -0.6 * u);
      ctx.lineTo(k * 1.7 * u, -0.01 * u);
    }
    ctx.stroke();
    ctx.globalAlpha = a;

    // tay dài quá mức: buông xuống gần chạm sàn, đung đưa theo nhịp giật 9 khung/giây
    for (const sd of [-1, 1]) {
      const swayA = Math.sin(qt * 0.7 + f.seed + sd) * 0.05;
      const swayB = Math.sin(qt * 1.1 + f.seed * 2 + sd * 2) * 0.04;
      const sx = sd * 0.083 * u;
      const sy = -0.7 * u;
      const a1 = Math.PI / 2 - sd * (0.07 + swayA);
      const ex = sx + Math.cos(a1) * 0.3 * u * f.armK;
      const ey = sy + Math.sin(a1) * 0.3 * u * f.armK;
      const a2 = Math.PI / 2 - sd * (0.02 + swayB);
      const wx = ex + Math.cos(a2) * 0.32 * u * f.armK;
      const wy = ey + Math.sin(a2) * 0.32 * u * f.armK;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [col, wd] of [
        ['#050505', 0.02 * u + 1],
        [PALE, 0.014 * u],
      ]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(0.8, wd);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(wx, wy);
        ctx.stroke();
      }
      // bàn tay: năm ngón mảnh, dài, rủ xuống và cong nhẹ
      ctx.strokeStyle = PALE;
      ctx.lineWidth = Math.max(0.6, 0.006 * u);
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const fa = Math.PI / 2 + (k - 2) * 0.17 + Math.sin(qt * 1.3 + f.seed + k) * 0.05;
        const L = 0.09 * u * (0.85 + 0.2 * f.armK) * (k === 2 ? 1.15 : k === 0 || k === 4 ? 0.8 : 1);
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(wx + Math.cos(fa) * L * 0.55 + sd * 0.01 * u, wy + Math.sin(fa) * L * 0.55, wx + Math.cos(fa + sd * 0.35) * L, wy + Math.sin(fa + sd * 0.35) * L);
      }
      ctx.stroke();
    }

    // cổ dài + đầu nghiêng
    const S = 0.052 * u;
    const hh = S * 1.6;
    const nl = 0.085 * u * f.neckK;
    const tx = Math.sin(f.tilt) * nl;
    const ty = -0.745 * u - Math.cos(f.tilt) * nl;
    const hx = tx + Math.sin(f.tilt) * hh;
    const hy = ty - Math.cos(f.tilt) * hh;
    ctx.strokeStyle = '#8f897b';
    ctx.lineWidth = Math.max(1, 0.03 * u);
    ctx.beginPath();
    ctx.moveTo(0, -0.74 * u);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    drawFace(ctx, {
      x: hx,
      y: hy,
      S,
      jaw: f.open,
      eye: 1,
      pupil: 0.25 + 0.75 * f.z,
      tilt: f.tilt,
      seed: f.seed,
      aspect: 1.6,
      dim: 1,
    });
    ctx.restore();
    return { hx: bx + hx, hy: feetY + hy, S };
  };

  const label = 'move the cursor to conduct · stop and they come closer · sound on';
  return {
    label,
    caption() {
      if (state !== 'play') return '';
      if (lastText && sil < 0.8 && Es < 0.3) return lastText;
      if (sil > 4) return 'do not stop';
      if (sil > 0.9) return 'they are getting closer';
      if (Es > 0.3) return figs.length > 10 ? 'they are all singing' : 'keep them singing';
      return label;
    },
    destroy() {
      dread.destroy();
    },
    step(api) {
      const { ctx, w: W, h: H, t, dt, aim, mouse, idle } = api;
      const qt = Math.floor(t * 9) / 9;

      // ---------- bấm: hợp âm đập xuống ----------
      if (mouse.clicks !== seen) {
        seen = mouse.clicks;
        dread.start();
        if (state === 'play') {
          hit = 1;
          flash = 1;
          sil = 0;
          Es = 1;
          for (const f of figs) f.z = Math.max(0.02, f.z - 0.07);
          if (figs.length < MAX) addFig(0.02);
          dread.thump(0.8);
        }
      }
      hit = Math.max(0, hit - dt * 0.7);
      flash = Math.max(0, flash - dt * 2.4);
      stateT += dt;

      // ---------- năng lượng chỉ huy ----------
      if (prevAx === null) {
        prevAx = aim.x;
        prevAy = aim.y;
      }
      const sp = Math.hypot(aim.x - prevAx, aim.y - prevAy) / Math.max(dt, 0.001);
      prevAx = aim.x;
      prevAy = aim.y;
      const target = idle > 0.8 || state !== 'play' ? 0 : clamp(sp / 600, 0, 1);
      Es += (target - Es) * Math.min(1, (target > Es ? 6 : 2.2) * dt);
      if (state === 'play') {
        if (Es < 0.1) sil += dt;
        else sil = Math.max(0, sil - dt * 3);
        if (Es > 0.3) lastText = '';
      }

      // ---------- tiến lên theo từng nhịp khi im lặng ----------
      let maxZ = 0;
      for (const f of figs) maxZ = Math.max(maxZ, f.z);
      if (state === 'play' && sil > 1.2) {
        adv += dt;
        if (adv >= 0.42) {
          adv -= 0.42;
          for (const f of figs) f.z = Math.min(1, f.z + (0.014 + Math.min(sil, 8) * 0.0018) * (0.7 + 0.6 * f.speed));
          dread.thump(0.5);
        }
      } else adv = 0;
      if (state === 'play') {
        for (const f of figs) {
          if (f.z >= 0.97) {
            state = 'arrive';
            stateT = 0;
            arrivee = f;
            dread.hush(0.75); // im bặt ngay khoảnh khắc nó chạm màn hình: yên lặng càng đột ngột, cú hét càng đau
            break;
          }
        }
      }

      // ---------- từng người ----------
      const unease = clamp((figs.length - 7) / 7, 0, 1) * 0.6 + maxZ * 0.6;
      const ctxA = dread.on ? dread.ctx : null;
      const now = ctxA ? ctxA.currentTime : 0;
      const pushVoice = ctxA && now - voiceAt >= PARAM_STEP; // 5 lệnh AudioParam x số người x 60 khung/giây là quá dày
      if (pushVoice) voiceAt = now;
      whisperT -= dt;
      for (const f of figs) {
        // đầu: đứng thẳng đồng loạt khi chúng đang tiến lên; còn lại nghiêng lệch, đổi bằng cú giật
        if (state === 'play' && sil > 1.2) f.tilt = 0;
        else {
          f.tiltT -= dt;
          if (f.tiltT <= 0) {
            f.tiltT = rand(1.2, 5);
            f.tilt = pick(TILTS);
          }
        }
        const { xs } = geo(f, W, H);
        const prox = Math.exp(-Math.pow((xs - aim.x) / (W * 0.28), 2));
        const wave = 0.5 + 0.5 * Math.sin(t * f.rate + f.seed);
        let tg = Es * (0.25 + 0.75 * wave) * (0.35 + 0.65 * prox);
        if (hit > 0) tg = Math.max(tg, hit * (0.8 + 0.2 * Math.sin(t * 40 + f.seed)));
        if (f.whisper > 0) {
          f.whisper -= dt;
          tg = Math.max(tg, 0.12);
        }
        if (state !== 'play') tg = 0;
        f.open += (tg - f.open) * Math.min(1, (tg > f.open ? 12 : 5) * dt);

        if (pushVoice && dread.out) {
          if (!f.voice) makeVoice(f);
          const v = f.voice;
          const st = semis(f, unease) + (0.5 - aim.y / H) * 4 * prox + hit * 3;
          const fr = 55 * Math.pow(2, st / 12) * (1 + Math.sin(t * 5.2 + f.seed) * 0.012);
          v.osc.frequency.setTargetAtTime(fr, now, 0.04);
          v.osc2.frequency.setTargetAtTime(fr * 1.003, now, 0.04);
          v.f1.frequency.setTargetAtTime(280 + 520 * f.open, now, 0.05);
          v.f2.frequency.setTargetAtTime(2000 - 1100 * f.open, now, 0.05);
          v.out.gain.setTargetAtTime(Math.pow(f.open, 1.3) * (0.2 + hit * 0.45) * (state === 'play' ? 1 : 0), now, 0.04);
        }
      }
      if (state === 'play' && sil > 3 && whisperT <= 0) {
        whisperT = rand(2.5, 4.5);
        pick(figs).whisper = 1.1;
        dread.whisper(0.8);
      }
      panic = state === 'arrive' ? 1 : 0;
      dread.update(
        {
          drone: state === 'play' ? 0.15 + 0.85 * Math.pow(maxZ, 1.5) : 0,
          breath: state === 'play' ? clamp(sil / 6, 0, 1) * 0.8 : 0,
          whine: state === 'play' ? clamp((maxZ - 0.55) / 0.45, 0, 1) : 0,
          beat: state === 'play' ? clamp((maxZ - 0.45) / 0.55, 0, 1) * (sil > 1.2 ? 1 : 0.3) : 0,
        },
        dt,
      );

      // ================= VẼ =================
      ctx.fillStyle = 'rgba(5, 6, 9, 0.94)';
      ctx.fillRect(0, 0, W, H);
      const hy0 = H * 0.66;
      const fog = ctx.createLinearGradient(0, hy0 - H * 0.16, 0, hy0 + H * 0.3);
      fog.addColorStop(0, 'rgba(150,160,185,0)');
      fog.addColorStop(0.4, 'rgba(150,160,185,0.09)');
      fog.addColorStop(1, 'rgba(150,160,185,0)');
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, W, H);

      let sx = 0;
      let sy = 0;
      if (state === 'arrive' && stateT > 0.7) {
        sx = rand(-5, 5);
        sy = rand(-5, 5);
      }
      ctx.save();
      ctx.translate(sx, sy);
      order.length = 0;
      for (const f of figs) order.push(f);
      order.sort(byDepth); // dùng lại mảng cũ, không tạo mảng mới mỗi khung
      let heads = null;
      for (const f of order) {
        const r = drawFig(ctx, f, W, H, t, qt);
        if (f === arrivee) heads = r;
      }
      ctx.restore();

      // vignette tối viền
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      if (flash > 0.02) {
        ctx.fillStyle = `rgba(190, 40, 40, ${0.22 * flash})`;
        ctx.fillRect(0, 0, W, H);
      }

      // ---------- cú chạm màn hình ----------
      if (state === 'arrive') {
        if (stateT > 0.7 && !arrivee.struck) {
          arrivee.struck = true;
          flash = 1;
          dread.jump(1); // tiếng hét to, méo, rè
          dread.hush(3.8); // rồi im chết cho tới lúc vòng mới bắt đầu (arrive còn ~1.2s + black 2.8s)
        }
        if (stateT > 0.7) {
          const e = smoothstep(clamp((stateT - 0.7) / 0.35, 0, 1));
          const S1 = H * 0.29;
          const S0 = heads ? heads.S : 10;
          const x0 = heads ? heads.hx : W / 2;
          const y0 = heads ? heads.hy : H / 2;
          ctx.fillStyle = `rgba(0,0,0,${0.9 * e})`;
          ctx.fillRect(0, 0, W, H);
          ctx.save();
          ctx.translate(rand(-4, 4) * e, rand(-4, 4) * e);
          drawFace(ctx, {
            x: x0 + (W / 2 - x0) * e,
            y: y0 + (H * 0.42 - y0) * e,
            S: S0 + (S1 - S0) * e,
            jaw: e,
            eye: 1,
            pupil: 1,
            smile: 0.35 * e,
            seed: arrivee.seed,
            dim: 0.6,
          });
          ctx.restore();
        }
        if (stateT > 1.9) {
          state = 'black';
          stateT = 0;
          dread.ring(2.4); // sau cú hét chỉ còn tiếng ù trong tai
        }
      } else if (state === 'black') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        if (stateT > 0.8) {
          if (!arrivee.said) {
            arrivee.said = true;
            dread.whisper(0.3);
          }
          ctx.font = CHOIR.font;
          ctx.textAlign = 'center';
          ctx.fillStyle = TEXT;
          ctx.globalAlpha = clamp((stateT - 0.8) / 0.5, 0, 1);
          ctx.fillText('you stopped.', W / 2, H / 2);
          ctx.globalAlpha = 1;
          ctx.textAlign = 'start';
        }
        if (stateT > 2.8) {
          // lại bắt đầu, thêm một người đứng ở hàng sau
          cycles += 1;
          state = 'play';
          stateT = 0;
          arrivee = null;
          sil = 0;
          Es = 0;
          const keep = figs.length < MAX ? figs.length + 1 : figs.length;
          for (const f of figs) killVoice(f);
          figs.length = 0;
          for (let i = 0; i < keep; i++) addFig(rand(0.03, 0.46));
          lastText = cycles > 1 ? `you stopped. again. (${cycles}x)` : 'you stopped.';
        }
      }
      void panic;
    },
  };
}
