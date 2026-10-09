import { rand } from '../../../lib/math.js';

// Âm thanh riêng của Mother (khác hẳn bộ ù/thở/tim của Choir). Dựng trên AudioContext của `dread` (lib/dreadAudio.js):
//   ngủ      hộp nhạc ru ngủ lạc tông (càng giận càng lệch, rớt nốt, thêm nốt lệch nửa cung), hơi thở ngủ chậm, chân con bò lách tách
//   bị chọc  tiếng tóc xào xạc / bóp chết con: tiếng nhão + pop
//   tỉnh     hộp nhạc sụp xuống giữa chừng, bà hít một hơi, rồi NGÂN NGA lại giai điệu bằng giọng trầm, đi lạc dần
//   bịt màn  tóc/tay sột soạt dâng lên, rồi cú TÁT xuống màn hình và "shh."
// Chưa bấm lần đầu thì dread.on = false và mọi hàm là no-op (trình duyệt chỉ cho phát tiếng sau một cú bấm).
const ROOT = 196; // Sol3
const TUNE = [0, 3, 7, 3, 0, -2, 0, 3, 7, 10, 7, 3, 2, 0, -2, 0]; // giai điệu ru (bán cung so với ROOT)
const hz = (semi, cents = 0) => ROOT * 2 ** (semi / 12 + cents / 1200);

export function makeMotherVoice(dread) {
  let L = null; // lớp âm liên tục, dựng lười sau cú bấm đầu tiên
  let seq = 1;
  let idx = 0;
  let breathPhase = 0;
  let humT = 0;
  let humStep = 0;
  let skAcc = 0;
  let prevState = 'sleep';

  const ensure = () => {
    if (!dread.on || !dread.ctx) return null;
    if (L) return L;
    const c = dread.ctx;
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // hơi thở ngủ: nhiễu lặp qua lowpass, độ lớn + tần số lọc do update() lên xuống theo nhịp hít/thở
    const bsrc = c.createBufferSource();
    bsrc.buffer = buf;
    bsrc.loop = true;
    const blp = c.createBiquadFilter();
    blp.type = 'lowpass';
    blp.frequency.value = 260;
    blp.Q.value = 0.8;
    const bg = c.createGain();
    bg.gain.value = 0;
    bsrc.connect(blp);
    blp.connect(bg);
    bg.connect(dread.out);
    bsrc.start();

    // giọng ngân nga: hai sóng răng cưa lệch nhẹ + một sóng lệch nửa cung (chỉ hiện khi bà nhìn chằm chằm), qua ba bộ lọc formant, rung 5Hz
    const hg = c.createGain();
    hg.gain.value = 0;
    const h2g = c.createGain();
    h2g.gain.value = 0;
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.2;
    const lfoG = c.createGain();
    lfoG.gain.value = 2;
    lfo.connect(lfoG);
    lfo.start();
    const voices = [];
    for (const [cents, target] of [[-9, hg], [9, hg], [0, h2g]]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = cents;
      o.frequency.value = hz(-12);
      lfoG.connect(o.frequency);
      o.connect(target);
      o.start();
      voices.push(o);
    }
    for (const [f, q, w] of [[480, 6, 2.2], [1100, 7, 1.3], [2400, 9, 0.5]]) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = q;
      const fg = c.createGain();
      fg.gain.value = w;
      hg.connect(bp);
      h2g.connect(bp);
      bp.connect(fg);
      fg.connect(dread.out);
    }

    L = { c, buf, bg, blp, hg, h2g, lfoG, voices };
    return L;
  };

  // một đoạn nhiễu qua bộ lọc có tần số trượt từ f0 sang f1, độ lớn lên rồi tàn: nền của mọi tiếng "ướt", sột soạt, tát
  const noiseHit = (dest, { t, dur, type, f0, f1 = f0, q = 1, peak, attack = 0.005 }) => {
    const l = L;
    const src = l.c.createBufferSource();
    src.buffer = l.buf;
    const f = l.c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = l.c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.9, dur + 0.05);
  };

  // một sin trượt tần số: tiếng pop, tiếng nổ trầm
  const sweep = (dest, { t, dur, f0, f1, peak, type = 'sine' }) => {
    const o = L.c.createOscillator();
    const g = L.c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  // nốt hộp nhạc: ba thành phần không điều hoà (kiểu chuông nhỏ), tàn nhanh dần theo thành phần cao. `glide` > 0: nốt bị kéo sụp xuống
  const bell = (freq, vol, glide = 0) => {
    const t = L.c.currentTime;
    for (const [ratio, w, decay] of [[1, 1, 1.6], [2.76, 0.35, 0.8], [5.4, 0.12, 0.4]]) {
      const o = L.c.createOscillator();
      const g = L.c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * ratio, t);
      if (glide) o.frequency.exponentialRampToValueAtTime((freq * ratio) / (1 + glide), t + decay);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * w, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + decay);
      o.connect(g);
      g.connect(dread.out);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  };

  return {
    // p = { state: 'sleep'|'awake'|'cover'|'black', anger: 0..1, kids: số con đang bò, stare: 0..1 }
    update({ state, anger, kids, stare }, dt) {
      const l = ensure();
      if (!l) return;
      const t = l.c.currentTime;
      const sleeping = state === 'sleep';
      const awake = state === 'awake';
      if (sleeping && prevState !== 'sleep') seq = 3; // vừa ngủ lại: chờ một lúc rồi hộp nhạc mới kêu
      prevState = state;

      // hộp nhạc ru ngủ
      if (sleeping) {
        seq -= dt;
        if (seq <= 0) {
          const semi = TUNE[idx++ % TUNE.length];
          const wobble = -anger * 45 + (Math.random() - 0.5) * anger * 90; // cents: giận thì chùng và run
          if (Math.random() > anger * 0.35) bell(hz(semi + 12, wobble), 0.3 - 0.08 * anger);
          if (anger > 0.45 && Math.random() < anger * 0.6) bell(hz(semi + 11, wobble), 0.16); // nốt lệch nửa cung bám theo
          seq = (0.58 + anger * 0.5) * (0.85 + Math.random() * 0.3);
        }
      }

      // hơi thở ngủ: hít nhanh, thở ra chậm; giận thì gấp và khò khè hơn
      breathPhase += dt / (5.6 - 2.6 * anger);
      const ph = breathPhase % 1;
      const env = ph < 0.42 ? Math.sin((ph / 0.42) * (Math.PI / 2)) : Math.cos(((ph - 0.42) / 0.58) * (Math.PI / 2));
      l.bg.gain.setTargetAtTime(sleeping ? (0.25 + 0.5 * anger) * 0.5 * env ** 1.5 : 0, t, 0.12);
      l.blp.frequency.setTargetAtTime(220 + 700 * env + 400 * anger, t, 0.1);

      // ngân nga: giai điệu ru nhưng hát bằng giọng trầm, trượt từ nốt này sang nốt kia, đi lạc dần khi bà nhìn lâu
      humT -= dt;
      if (awake && humT <= 0) {
        humStep++;
        const semi = TUNE[humStep % TUNE.length] - 12;
        const lost = -stare * 70 + (Math.random() - 0.5) * stare * 60;
        l.voices[0].frequency.setTargetAtTime(hz(semi, lost), t, 0.25);
        l.voices[1].frequency.setTargetAtTime(hz(semi, lost), t, 0.25);
        l.voices[2].frequency.setTargetAtTime(hz(semi + 6, lost), t, 0.25);
        humT = 1.2 - 0.5 * stare;
      }
      l.hg.gain.setTargetAtTime(awake ? 0.1 + 0.2 * stare : 0, t, awake ? 0.5 : 0.05);
      l.h2g.gain.setTargetAtTime(awake ? stare * 0.12 : 0, t, 0.5);
      l.lfoG.gain.setTargetAtTime(2 + stare * 9, t, 0.3);

      // chân lũ con bò lách tách (càng đông càng dày)
      if (sleeping && kids > 0) {
        skAcc += dt * Math.min(kids, 6) * 2.4;
        while (skAcc >= 1) {
          skAcc -= 1;
          noiseHit(dread.out, { t: t + Math.random() * 0.03, dur: 0.02, type: 'bandpass', f0: rand(3000, 7000), q: 2, peak: rand(0.05, 0.13), attack: 0.002 });
        }
      }
    },
    // chọc trúng bà: tóc xào xạc
    poke() {
      if (!ensure()) return;
      const t = L.c.currentTime;
      for (let i = 0; i < 4; i++) noiseHit(dread.out, { t: t + i * 0.12 + Math.random() * 0.05, dur: 0.14, type: 'highpass', f0: 2600, f1: 1800, peak: 0.16 });
    },
    // bóp chết một đứa con: tiếng nhão + pop + tiếng rít nhỏ
    squash() {
      if (!ensure()) return;
      const t = L.c.currentTime;
      noiseHit(dread.out, { t, dur: 0.3, type: 'lowpass', f0: 1400, f1: 140, q: 1.2, peak: 0.55 });
      sweep(dread.out, { t, dur: 0.14, f0: 160, f1: 45, peak: 0.55 });
      sweep(dread.out, { t, dur: 0.09, f0: 2200, f1: 3200, peak: 0.06 });
    },
    // bà tóm một đứa lôi vào tóc: kéo lê nhão rồi nuốt xuống
    swallow() {
      if (!ensure()) return;
      const t = L.c.currentTime;
      noiseHit(dread.out, { t, dur: 0.5, type: 'lowpass', f0: 700, f1: 90, q: 1, peak: 0.3, attack: 0.06 });
      sweep(dread.out, { t: t + 0.25, dur: 0.22, f0: 95, f1: 40, peak: 0.3 });
    },
    // bà tỉnh: nốt hộp nhạc sụp xuống như hết cót, rồi bà hít một hơi dài
    wake() {
      if (!ensure()) return;
      const t = L.c.currentTime;
      bell(hz(12), 0.35, 3);
      noiseHit(dread.out, { t: t + 0.15, dur: 0.6, type: 'bandpass', f0: 700, f1: 2200, q: 0.9, peak: 0.55, attack: 0.5 });
    },
    // bắt đầu bịt màn hình: tóc và bàn tay sột soạt dâng lên
    cover() {
      if (!ensure() || !dread.hit) return;
      noiseHit(dread.hit, { t: L.c.currentTime, dur: 1.05, type: 'highpass', f0: 1500, f1: 600, peak: 0.4, attack: 0.9 });
    },
    // bàn tay TÁT xuống màn hình, rồi một tiếng "shh." kéo dài
    slap() {
      if (!ensure() || !dread.hit) return;
      const t = L.c.currentTime;
      noiseHit(dread.hit, { t, dur: 0.45, type: 'lowpass', f0: 1800, f1: 100, peak: 0.9, attack: 0.003 });
      sweep(dread.hit, { t, dur: 0.5, f0: 85, f1: 30, peak: 1 });
      noiseHit(dread.hit, { t: t + 0.7, dur: 1.7, type: 'bandpass', f0: 5000, f1: 4200, q: 1.1, peak: 0.28, attack: 0.35 });
    },
  };
}
