// Âm thanh nền kinh dị dùng chung (WebAudio, không file): tiếng ù trầm lệch pha, hơi thở, tiếng rít cao, nhịp tim, cú stab.
// Trình duyệt chỉ cho phát tiếng sau một cú bấm của người dùng, nên gọi start() từ lần bấm đầu tiên; chưa start thì mọi hàm là no-op.
// Tự im khi vòng vẽ ngừng (tab ẩn / cuộn khỏi khung nhìn): update() không được gọi nữa thì watchdog hạ âm lượng về 0.
export function makeDread() {
  let ctx = null;
  let n = null;
  let failed = false;
  let touched = performance.now();
  let breathPhase = 0;
  let beatPhase = 0;
  let hushUntil = 0; // đến thời điểm này (giờ của AudioContext) mọi lớp âm nền bị ép về 0: im chết
  let watchdog = 0; // chỉ chạy sau start(): chưa bật tiếng thì không có gì để canh

  const noise = (c, seconds = 2) => {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  };

  const api = {
    get on() {
      return !!n;
    },
    get ctx() {
      return ctx;
    },
    // nút nối cho giọng riêng của từng sinh vật (vd Choir, Mother)
    get out() {
      return n?.out ?? null;
    },
    // bus cho tiếng đập to: đi thẳng ra loa qua limiter, không bị master/compressor nền nén xuống
    get hit() {
      return n?.hit ?? null;
    },
    start() {
      if (n || failed) {
        ctx?.resume?.();
        return;
      }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) throw new Error('no audio');
        ctx = new Ctx();
        const master = ctx.createGain();
        master.gain.value = 0;
        const comp = ctx.createDynamicsCompressor();
        master.connect(comp);
        comp.connect(ctx.destination);
        const out = ctx.createGain();
        out.gain.value = 1;
        out.connect(master);

        // ù trầm: hai sin lệch nhau ~2.5Hz (phách chậm) + một răng cưa qua lowpass
        const droneG = ctx.createGain();
        droneG.gain.value = 0;
        for (const f of [38, 40.5]) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          o.connect(droneG);
          o.start();
        }
        const saw = ctx.createOscillator();
        saw.type = 'sawtooth';
        saw.frequency.value = 55;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 130;
        const sawG = ctx.createGain();
        sawG.gain.value = 0.25;
        saw.connect(lp);
        lp.connect(sawG);
        sawG.connect(droneG);
        saw.start();
        droneG.connect(out);

        // hơi thở: nhiễu qua bandpass, độ lớn do update() nhấp nhô
        const bsrc = ctx.createBufferSource();
        bsrc.buffer = noise(ctx);
        bsrc.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 520;
        bp.Q.value = 0.7;
        const breathG = ctx.createGain();
        breathG.gain.value = 0;
        bsrc.connect(bp);
        bp.connect(breathG);
        breathG.connect(out);
        bsrc.start();

        // rít cao rất nhỏ (ù tai)
        const whineG = ctx.createGain();
        whineG.gain.value = 0;
        for (const f of [2950, 3013]) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          o.connect(whineG);
          o.start();
        }
        whineG.connect(out);

        // bus cho các cú dọa lớn (jump, ring): đi thẳng ra loa qua limiter riêng, bỏ qua master để không bị gạt xuống theo tiếng nền
        const hit = ctx.createGain();
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -8;
        limiter.knee.value = 4;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.3;
        hit.connect(limiter);
        limiter.connect(ctx.destination);
        // méo tiếng (tanh): biến sóng sạch thành tiếng gắt, rè
        const curve = new Float32Array(1024);
        for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / 512 - 1) * 6);
        const dist = ctx.createWaveShaper();
        dist.curve = curve;
        dist.oversample = '2x';
        dist.connect(hit);

        n = { master, out, hit, dist, droneG, breathG, whineG, noiseBuf: noise(ctx, 1) };
        ctx.resume?.();
        watchdog = setInterval(() => {
          if (n && performance.now() - touched > 350) n.master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
        }, 150);
      } catch {
        failed = true;
        n = null;
        ctx?.close?.().catch(() => {}); // dựng dở giữa chừng: đóng luôn, không để AudioContext mồ côi
        ctx = null;
      }
    },
    // p = { drone, breath, whine, beat } mỗi giá trị 0..1
    update(p, dt) {
      if (!n) return;
      touched = performance.now();
      const t = ctx.currentTime;
      n.master.gain.setTargetAtTime(0.55, t, 0.05);
      const k = t < hushUntil ? 0 : 1; // đang im chết: bỏ hết tiếng nền
      n.droneG.gain.setTargetAtTime((p.drone ?? 0) * 0.3 * k, t, 0.15);
      breathPhase += dt * (1.1 + (p.breath ?? 0) * 1.8) * Math.PI * 2 * 0.5;
      const br = (p.breath ?? 0) * 0.55 * (0.5 + 0.5 * Math.sin(breathPhase)) * k;
      n.breathG.gain.setTargetAtTime(br, t, 0.08);
      n.whineG.gain.setTargetAtTime((p.whine ?? 0) * 0.012 * k, t, 0.2);
      if (k && (p.beat ?? 0) > 0.02) {
        beatPhase += dt * (0.9 + p.beat * 1.7);
        if (beatPhase >= 1) {
          beatPhase -= 1;
          api.thump(0.35 + 0.55 * p.beat);
          api.thump(0.2 + 0.3 * p.beat, 0.2);
        }
      }
    },
    // xèo xèo ngắn: nhiễu cao, cho thứ gì đó đang cháy (Parasite)
    sizzle(power = 1, dur = 0.12) {
      if (!n) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = n.noiseBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18 * power, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(hp);
      hp.connect(g);
      g.connect(n.out);
      src.start(t, Math.random() * 0.5, dur + 0.05);
    },
    // tiếng "thịch" của tim
    thump(power = 0.6, delay = 0) {
      if (!n) return;
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(75, t);
      o.frequency.exponentialRampToValueAtTime(32, t + 0.16);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.9 * power, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.connect(g);
      g.connect(n.out);
      o.start(t);
      o.stop(t + 0.3);
    },
    // cú dọa: nhiễu gắt + thịch sâu + một tiếng rít trượt lên (đã chặn biên độ bằng compressor)
    stab(power = 1) {
      if (!n) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = n.noiseBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5 * power, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      src.connect(hp);
      hp.connect(g);
      g.connect(n.out);
      src.start(t);
      src.stop(t + 0.8);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(1500, t + 0.45);
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(0.18 * power, t + 0.02);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(og);
      og.connect(n.out);
      o.start(t);
      o.stop(t + 0.65);
      api.thump(1.2 * power);
    },
    // cắt phăng mọi tiếng nền ngay lập tức và giữ im trong `seconds` giây (im bặt trước cú dọa, im chết sau cú dọa).
    // Tiếng dọa (jump, ring) và các tiếng đơn lẻ (thump, whisper) vẫn phát bình thường.
    hush(seconds = 1) {
      if (!n) return;
      const t = ctx.currentTime;
      hushUntil = t + seconds;
      for (const g of [n.droneG, n.breathG, n.whineG]) {
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(0, t, 0.015);
      }
    },
    // JUMP SCARE: nhiễu đập toàn băng + tiếng hét méo rè (ba sóng răng cưa lệch cao độ, rung, qua hai bộ lọc formant) + tiếng nổ trầm.
    // Đi qua bus riêng nên to hơn hẳn stab(); chỉ dùng cho khoảnh khắc đỉnh điểm.
    jump(power = 1) {
      if (!n) return;
      const t = ctx.currentTime;
      // 1) nhiễu đập
      const src = ctx.createBufferSource();
      src.buffer = n.noiseBuf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.9 * power, t + 0.004);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
      src.connect(ng);
      ng.connect(n.dist);
      src.start(t);
      src.stop(t + 1);
      // 2) tiếng hét: vút lên rất nhanh rồi kéo dài, rung như người đang gào
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0, t);
      sg.gain.linearRampToValueAtTime(0.8 * power, t + 0.02);
      sg.gain.linearRampToValueAtTime(0.6 * power, t + 0.7);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 1.7);
      for (const [freq, q] of [[950, 3], [2400, 5]]) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = freq;
        bp.Q.value = q;
        sg.connect(bp);
        bp.connect(n.dist);
      }
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 8;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 40;
      lfo.connect(lfoG);
      lfo.start(t);
      lfo.stop(t + 1.8);
      for (const cents of [-16, 0, 19]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.detune.value = cents;
        o.frequency.setValueAtTime(360, t);
        o.frequency.exponentialRampToValueAtTime(980, t + 0.28);
        o.frequency.exponentialRampToValueAtTime(560, t + 1.6);
        lfoG.connect(o.frequency);
        o.connect(sg);
        o.start(t);
        o.stop(t + 1.8);
      }
      // 3) tiếng nổ trầm dội vào ngực
      const bo = ctx.createOscillator();
      const bg = ctx.createGain();
      bo.type = 'sine';
      bo.frequency.setValueAtTime(72, t);
      bo.frequency.exponentialRampToValueAtTime(26, t + 0.9);
      bg.gain.setValueAtTime(0, t);
      bg.gain.linearRampToValueAtTime(1.1 * power, t + 0.01);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 1);
      bo.connect(bg);
      bg.connect(n.hit);
      bo.start(t);
      bo.stop(t + 1.05);
    },
    // ù tai sau cú dọa: hai sin cao lệch nhau vài Hz, hiện ra rồi tàn dần trong `seconds` giây
    ring(seconds = 2.5, power = 1) {
      if (!n) return;
      const t = ctx.currentTime;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06 * power, t + 0.08);
      g.gain.setValueAtTime(0.06 * power, t + seconds * 0.4);
      g.gain.exponentialRampToValueAtTime(0.0005, t + seconds);
      g.connect(n.hit);
      for (const f of [5400, 5432]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.connect(g);
        o.start(t);
        o.stop(t + seconds + 0.05);
      }
    },
    // thì thào: nhiễu băng hẹp, lên xuống trong ~1 giây
    whisper(power = 1) {
      if (!n) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = n.noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600;
      bp.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.7 * power, t + 0.25);
      g.gain.linearRampToValueAtTime(0, t + 1.1);
      src.connect(bp);
      bp.connect(g);
      g.connect(n.out);
      src.start(t);
      src.stop(t + 1.2);
    },
    destroy() {
      clearInterval(watchdog);
      if (ctx) {
        try {
          n.master.gain.value = 0;
        } catch {
          /* chưa dựng xong */
        }
        ctx.close?.().catch(() => {}); // close() trả Promise: bắt lỗi "đã đóng" ở đây, try/catch thường không bắt được
      }
      n = null;
      ctx = null;
    },
  };
  return api;
}
