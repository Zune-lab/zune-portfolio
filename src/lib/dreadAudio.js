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
  let alive = true;

  const watchdog = setInterval(() => {
    if (n && alive && performance.now() - touched > 350) n.master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
  }, 150);

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
    // nút nối cho giọng riêng của từng sinh vật (vd Choir)
    get out() {
      return n?.out ?? null;
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

        n = { master, out, droneG, breathG, whineG, noiseBuf: noise(ctx, 1) };
        ctx.resume?.();
      } catch {
        failed = true;
        n = null;
      }
    },
    // p = { drone, breath, whine, beat } mỗi giá trị 0..1
    update(p, dt) {
      if (!n) return;
      touched = performance.now();
      const t = ctx.currentTime;
      n.master.gain.setTargetAtTime(0.55, t, 0.05);
      n.droneG.gain.setTargetAtTime((p.drone ?? 0) * 0.3, t, 0.15);
      breathPhase += dt * (1.1 + (p.breath ?? 0) * 1.8) * Math.PI * 2 * 0.5;
      const br = (p.breath ?? 0) * 0.55 * (0.5 + 0.5 * Math.sin(breathPhase));
      n.breathG.gain.setTargetAtTime(br, t, 0.08);
      n.whineG.gain.setTargetAtTime((p.whine ?? 0) * 0.012, t, 0.2);
      if ((p.beat ?? 0) > 0.02) {
        beatPhase += dt * (0.9 + p.beat * 1.7);
        if (beatPhase >= 1) {
          beatPhase -= 1;
          api.thump(0.35 + 0.55 * p.beat);
          api.thump(0.2 + 0.3 * p.beat, 0.2);
        }
      }
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
      alive = false;
      clearInterval(watchdog);
      if (ctx) {
        try {
          n.master.gain.value = 0;
          ctx.close();
        } catch {
          /* đã đóng */
        }
      }
      n = null;
      ctx = null;
    },
  };
  return api;
}
