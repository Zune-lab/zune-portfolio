import { useEffect, useRef, useState } from 'react';
import { frameLoop } from '../../../lib/loop.js';
import { fitCanvas } from '../../../lib/canvas.js';
import { isTypingTarget } from '../../../lib/dom.js';
import { prefersReducedMotion } from '../../../lib/env.js';
import { clamp, pick, TAU } from '../../../lib/math.js';
import { observeVisible } from '../../../lib/observe.js';
import useTimer from '../../../lib/useTimer.js';
import './Ghost.css';

const STARS = [
  { l: '12%', t: '18%', d: '0s' },
  { l: '30%', t: '10%', d: '0.9s' },
  { l: '88%', t: '56%', d: '1.4s' },
  { l: '20%', t: '48%', d: '0.4s' },
  { l: '64%', t: '70%', d: '1.1s' },
  { l: '46%', t: '14%', d: '1.8s' },
];
// chữ ẩn: chỉ hiện ra khi rê "đèn pin" (con trỏ chuột) qua. Mỗi dòng là gợi ý cho 1 easter egg
const SECRETS = [
  { l: '30%', t: '8%', s: 'flip moon↔sun 5× fast: eclipse' },
  { l: '4%', t: '18%', s: 'psst… ↑↑↓↓←→←→BA' },
  { l: '60%', t: '20%', s: 'double-click me: i can teleport' },
  { l: '70%', t: '34%', s: 'sudo — go on, type it' },
  { l: '3%', t: '40%', s: 'hire me?' },
  { l: '82%', t: '47%', s: 'git blame ghost' },
  { l: '6%', t: '52%', s: 'type b-o-o. just try' },
  { l: '70%', t: '60%', s: '50 boos → 🏆 · 100 → 🏆' },
  { l: '27%', t: '66%', s: 'click the grave. all 7.' },
  { l: '44%', t: '74%', s: 'poke me 6× in 3s. i dare you' },
];
const MSGS = [
  'BOO!',
  'AHH!',
  'hehe',
  '404: soul not found',
  'git push --force?',
  'works on my grave',
  'no bugs, only ghosts',
  'segfault (core dumped)',
  'have you tried turning me off?',
];
const IDLE = [
  '...',
  'is it friday yet?',
  'who wrote this legacy code?',
  'i should refactor my afterlife',
  'still waiting for a PR review',
  'merge conflicts haunt me too',
  'sudo make me a sandwich',
];
const RAGE = ['STOP IT', 'I WILL HAUNT YOUR CSS', 'rm -rf your cursor', 'ENOUGH.'];
const EPITAPHS = ['RIP', 'WIP', '404', 'EOL', 'TODO', 'NaN', 'v1.0'];
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const ACTS = [
  ['yawn', 2200],
  ['shiver', 1000],
  ['flicker', 1400],
  ['mutter', 0],
];
const SPARK_COLORS = ['#ffffff', '#ffb3d1', '#c9b6ff'];

// gấu váy lượn sóng: 2 trạng thái cùng cấu trúc path để <animate> nội suy mượt
const HEM_A = 'M0,52 C0,23 22,0 50,0 C78,0 100,23 100,52 L100,118 Q87.5,134 75,118 T50,118 T25,118 T0,118 Z';
const HEM_B = 'M0,52 C0,23 22,0 50,0 C78,0 100,23 100,52 L100,118 Q87.5,102 75,118 T50,118 T25,118 T0,118 Z';

const makeSparks = () =>
  Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * TAU + Math.random() * 0.5;
    const dist = 40 + Math.random() * 36;
    return {
      dx: Math.round(Math.cos(a) * dist),
      dy: Math.round(Math.sin(a) * dist),
      c: SPARK_COLORS[i % SPARK_COLORS.length],
    };
  });

// Con ma "sống":
//  - thân mờ ảo, mắt lim dim, mắt dõi theo chuột, trôi lơ lửng theo con trỏ (lò xo), nghiêng theo vận tốc
//  - canvas: vệt ectoplasm rơi sau gấu váy + đom đóm tò mò bám theo chuột; sương mù cuối sân khấu
//  - tự làm việc riêng: ngáp, run, chập chờn, lẩm bẩm chuyện dev
//  - bấm: giật mình + boo; bấm dồn dập: nổi giận; bấm đúp: dịch chuyển tức thời
//  - bấm trăng/mặt trời: ngày/đêm (ma về mộ ngủ). Bấm mộ: đổi bia
//  Easter egg: Konami code, gõ "boo" / "sudo", chữ ẩn dưới đèn pin, bấm mặt trời 5 lần liên tục = nhật thực,
//  mốc 50 / 100 boo mở thành tựu
export default function Ghost() {
  const stage = useRef(null);
  const ghost = useRef(null);
  const drift = useRef(null);
  const canvas = useRef(null);
  const seq = useRef(0);
  const timers = useRef(new Set());
  const sayT = useTimer();
  const booT = useTimer();
  const actT = useTimer();
  const rageT = useTimer();
  const konamiT = useTimer();
  const eclipseT = useTimer();
  const toastT = useTimer();
  const moveRaf = useRef(0); // gộp pointermove: tối đa 1 lần đo layout / khung hình
  const lastMove = useRef({ x: 0, y: 0 });
  const clicks = useRef([]);
  const sunClicks = useRef([]);
  const api = useRef({});
  const ghostLoop = useRef(null); // frameLoop của vòng chính, để effect đồng bộ cờ gọi sync() khi ma ngủ / dậy
  const live = useRef({ visible: true, awake: true, konami: false, rage: false, busy: false });
  const st = useRef({ x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0, mx: 0, my: 0, inside: false, lastMove: -1e9, t: 0 });

  const [reduced] = useState(
    () => typeof window !== 'undefined' && prefersReducedMotion(),
  );
  const [day, setDay] = useState(false);
  const [eclipse, setEclipse] = useState(false);
  const [boo, setBoo] = useState(false);
  const [sayOn, setSayOn] = useState(false);
  const [msg, setMsg] = useState(MSGS[0]);
  const [boos, setBoos] = useState(0);
  const [bursts, setBursts] = useState([]);
  const [act, setAct] = useState('');
  const [rage, setRage] = useState(false);
  const [konami, setKonami] = useState(false);
  const [toast, setToast] = useState({ text: '', on: false });
  const [epi, setEpi] = useState(0);
  const [flashKey, setFlashKey] = useState(0);

  const awake = !day || eclipse;

  // ---- helper (chỉ đụng ref + setter nên an toàn khi gọi qua api.current từ effect) ----
  const later = (fn, ms) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
    return t;
  };
  const say = (text, ms = 1500) => {
    setMsg(text);
    setSayOn(true);
    sayT.set(() => setSayOn(false), ms);
  };
  const flash = (text, ms = 3400) => {
    setToast({ text, on: true });
    toastT.set(() => setToast((t) => ({ ...t, on: false })), ms);
  };
  const doBoo = () => {
    setBoo(true);
    booT.set(() => setBoo(false), 900);
  };
  const doAct = (name, ms) => {
    setAct(name);
    actT.set(() => setAct(''), ms);
  };
  const startRage = () => {
    setRage(true);
    rageT.set(() => setRage(false), 4200);
  };
  const addBurst = (x, y, ring = false) => {
    const id = ++seq.current;
    setBursts((b) => [...b, { id, x, y, ring, sparks: ring ? [] : makeSparks() }]);
    later(() => setBursts((b) => b.filter((v) => v.id !== id)), 900);
  };
  const ghostCenter = () => {
    const s = stage.current?.getBoundingClientRect();
    const g = ghost.current?.getBoundingClientRect();
    if (!s || !g) return { x: 0, y: 0 };
    return { x: g.left + g.width / 2 - s.left, y: g.top + g.height / 2 - s.top };
  };
  const sleepyToast = () => flash('zzz… the ghost is asleep, wake it first');

  const startKonami = () => {
    if (!live.current.awake) return sleepyToast();
    setKonami(true);
    konamiT.set(() => setKonami(false), 9000);
    say('↑↑↓↓←→←→BA · +30 lives', 2600);
    flash('🕹 konami code · cheat mode on');
    doBoo();
    const c = ghostCenter();
    addBurst(c.x, c.y, true);
    later(() => addBurst(c.x, c.y, true), 250);
    later(() => addBurst(c.x, c.y), 120);
  };
  const scare = () => {
    if (!live.current.awake) return sleepyToast();
    setFlashKey((k) => k + 1);
    say('BOO!!', 1400);
    doBoo();
    const c = ghostCenter();
    addBurst(c.x, c.y);
  };
  const sudo = () => {
    if (!live.current.awake) return sleepyToast();
    say('ghost is not in the sudoers file. this incident will be reported.', 3200);
  };
  api.current = { say, doAct, startKonami, scare, sudo };

  // đồng bộ cờ cho vòng lặp rAF / listener (không gây re-render)
  useEffect(() => {
    live.current.awake = awake;
    live.current.konami = konami;
    live.current.rage = rage;
    live.current.busy = boo || rage || sayOn || !!act;
    ghostLoop.current?.sync(); // ma ngủ yên thì vòng rAF tự dừng, ma dậy thì chạy lại
  });

  useEffect(() => {
    const ts = timers.current;
    return () => {
      cancelAnimationFrame(moveRaf.current);
      ts.forEach(clearTimeout);
    };
  }, []);

  // ---- vòng lặp chính: ma trôi theo lò xo + canvas (vệt ectoplasm, đom đóm) ----
  useEffect(() => {
    const el = stage.current;
    const dr = drift.current;
    const cv = canvas.current;
    if (!el || !dr || !cv || reduced) return undefined;
    const ctx = cv.getContext('2d');
    let w = 0;
    let h = 0;
    const resize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      fitCanvas(cv, ctx, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const offVisible = observeVisible(el, (v) => {
      live.current.visible = v;
      ghostLoop.current?.setVisible(v);
    });

    const orbs = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * (w || 400),
      y: (h || 300) * (0.2 + Math.random() * 0.5),
      vx: 0,
      vy: 0,
      ph: Math.random() * TAU + i,
    }));
    let parts = [];
    let spawn = 0;
    let last = performance.now();

    // frameLoop huỷ hẳn rAF khi: screensaver bật, tab ẩn, khung khuất, hoặc ma đang ngủ và đã đứng yên (canRun) -> không còn khung "chạy rỗng"
    const frame = (now) => {
      const L = live.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = st.current;
      if (L.awake) s.rest = false;
      s.t += dt;

      // 1. ma trôi: theo con trỏ (lười, có độ trễ) hoặc tự lang thang khi không ai đụng tới
      let tx = 0;
      let ty = 0;
      if (L.awake) {
        const maxX = Math.max(40, w / 2 - 90);
        const idle = !s.inside || now - s.lastMove > 3500;
        if (idle) {
          tx = Math.sin(s.t * 0.45) * Math.min(70, maxX);
          ty = Math.cos(s.t * 0.33) * 14;
        } else {
          tx = clamp(s.px * 0.3, -maxX, maxX);
          ty = clamp(s.py * 0.25, -36, 28);
        }
      }
      s.vx += ((tx - s.x) * 9 - s.vx * 4.2) * dt;
      s.vy += ((ty - s.y) * 9 - s.vy * 4.2) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const rot = clamp(s.vx * 0.06, -12, 12);
      dr.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;

      // 2. canvas
      ctx.clearRect(0, 0, w, h);
      if (!L.awake) {
        parts = [];
        s.rest = Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.vx) + Math.abs(s.vy) < 0.05;
        if (s.rest) ghostLoop.current?.sync(); // đứng yên hẳn: dừng vòng rAF tới khi ma dậy
        return;
      }
      const hue = L.konami ? (now * 0.18) % 360 : null;
      const trail = L.rage ? '255,120,130' : '205,190,255';
      const orbCol = L.rage ? '255,120,120' : '150,255,215';
      ctx.globalCompositeOperation = 'lighter';

      spawn -= dt;
      if (spawn <= 0 && parts.length < 70) {
        spawn = 0.06 + Math.random() * 0.08;
        parts.push({
          x: w / 2 + s.x + (Math.random() - 0.5) * 56,
          y: h * 0.44 + s.y + 52 + Math.random() * 10,
          vx: -s.vx * 0.15 + (Math.random() - 0.5) * 8,
          vy: 8 + Math.random() * 16,
          life: 0,
          max: 1.1 + Math.random() * 1.1,
          r: 1.5 + Math.random() * 3,
        });
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = 1 - p.life / p.max;
        ctx.fillStyle = hue === null ? `rgba(${trail},${(k * 0.5).toFixed(3)})` : `hsla(${(hue + p.x) % 360},90%,70%,${(k * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 - (1 - k) * 0.4), 0, TAU);
        ctx.fill();
      }

      // đom đóm: lang thang, tò mò bám theo con trỏ nhưng không dám sát quá
      orbs.forEach((o, i) => {
        o.ph += dt;
        let ax = Math.cos(o.ph * 0.8 + i) * 16;
        let ay = Math.sin(o.ph * 0.7 + i * 2) * 16;
        if (s.inside) {
          const dx = s.mx - o.x;
          const dy = s.my - o.y;
          const d = Math.hypot(dx, dy);
          if (d > 1 && d < 220) {
            const f = d < 40 ? -60 : 30;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }
        o.vx += ax * dt;
        o.vy += ay * dt;
        const damp = Math.max(0, 1 - 1.4 * dt);
        o.vx *= damp;
        o.vy *= damp;
        const sp = Math.hypot(o.vx, o.vy);
        if (sp > 46) {
          o.vx *= 46 / sp;
          o.vy *= 46 / sp;
        }
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        if (o.x < 10 || o.x > w - 10) o.vx *= -1;
        if (o.y < 14 || o.y > h - 80) o.vy *= -1;
        o.x = clamp(o.x, 10, Math.max(10, w - 10));
        o.y = clamp(o.y, 14, Math.max(14, h - 80));
        const a = (0.35 + 0.35 * Math.sin(o.ph * 3)).toFixed(3);
        const col = hue === null ? `rgba(${orbCol},` : `hsla(${(hue + o.ph * 40) % 360},95%,70%,`;
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 16);
        g.addColorStop(0, `${col}${a})`);
        g.addColorStop(1, `${col}0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, 16, 0, TAU);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    };
    ghostLoop.current = frameLoop(frame, {
      canRun: () => live.current.awake || !st.current.rest,
      onResume: () => (last = performance.now()), // không tính một bước vật lý khổng lồ sau khi nghỉ
    });
    return () => {
      ghostLoop.current.stop();
      ghostLoop.current = null;
      ro.disconnect();
      offVisible();
    };
  }, [reduced]);

  // ---- easter egg bàn phím: Konami, "boo", "sudo" (chỉ khi sân khấu đang nằm trong màn hình) ----
  useEffect(() => {
    let keys = [];
    let word = '';
    const onKey = (e) => {
      if (typeof e.key !== 'string' || isTypingTarget(e.target)) return; // autofill của Chrome bắn keydown không có `key`
      if (!live.current.visible || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keys = [...keys, k].slice(-KONAMI.length);
      if (e.key.length === 1) word = (word + k).slice(-8);
      if (keys.length === KONAMI.length && keys.every((x, i) => x === KONAMI[i])) {
        keys = [];
        api.current.startKonami();
      } else if (word.endsWith('boo')) {
        word = '';
        api.current.scare();
      } else if (word.endsWith('sudo')) {
        word = '';
        api.current.sudo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- ma tự làm việc riêng mỗi vài giây ----
  useEffect(() => {
    let id = 0;
    const next = () => {
      id = window.setTimeout(() => {
        const L = live.current;
        if (L.awake && L.visible && !L.busy) {
          const [name, ms] = pick(ACTS);
          if (name === 'mutter') api.current.say(pick(IDLE), 2400);
          else {
            api.current.doAct(name, ms);
            if (name === 'yawn') api.current.say('*yaaawn*', 1800);
            if (name === 'shiver') api.current.say('brr… am i cold or dead?', 1400);
          }
        }
        next();
      }, 4500 + Math.random() * 5000);
    };
    next();
    return () => clearTimeout(id);
  }, []);

  // ---- con trỏ: mắt dõi theo, ma lệch theo, "đèn pin" soi chữ ẩn ----
  const applyMove = () => {
    moveRaf.current = 0;
    const s = stage.current;
    const g = ghost.current;
    if (!s || !g) return;
    const { x, y } = lastMove.current;
    const sr = s.getBoundingClientRect();
    const r = g.getBoundingClientRect();
    const clampEye = (n) => clamp(n, -1, 1);
    s.style.setProperty('--ex', clampEye((x - (r.left + r.width / 2)) / 160));
    s.style.setProperty('--ey', clampEye((y - (r.top + r.height / 2)) / 120));
    s.style.setProperty('--mx', `${x - sr.left}px`);
    s.style.setProperty('--my', `${y - sr.top}px`);
    s.dataset.track = '1';
    const p = st.current;
    p.inside = true;
    p.lastMove = performance.now();
    p.mx = x - sr.left;
    p.my = y - sr.top;
    p.px = x - (sr.left + sr.width / 2);
    p.py = y - (sr.top + sr.height * 0.44);
  };
  const onPointerMove = (e) => {
    lastMove.current = { x: e.clientX, y: e.clientY };
    if (!moveRaf.current) moveRaf.current = requestAnimationFrame(applyMove);
  };
  const onPointerLeave = () => {
    cancelAnimationFrame(moveRaf.current);
    moveRaf.current = 0;
    const s = stage.current;
    if (s) {
      delete s.dataset.track;
      s.style.setProperty('--mx', '-999px');
      s.style.setProperty('--my', '-999px');
    }
    st.current.inside = false;
  };

  const onPointerDown = (e) => {
    if (!awake) return; // ban ngày ma đang ngủ
    const r = stage.current.getBoundingClientRect();
    addBurst(e.clientX - r.left, e.clientY - r.top);
    const n = boos + 1;
    setBoos(n);
    const now = performance.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 3000), now];
    doBoo();
    // rage và mốc 25/50/100 độc lập: bấm nhanh vẫn nhận thành tựu
    const raging = live.current.rage || clicks.current.length >= 6;
    if (raging) startRage();
    if (n === 25) {
      say("you're relentless. respect.", 2200);
    } else if (n === 50) {
      say('50 boos. are you ok?', 2200);
      flash('🏆 achievement unlocked: exorcist (50 boos)');
    } else if (n === 100) {
      say('100. touch some grass.', 2200);
      flash('🏆 100 boos · touch some grass');
    } else if (raging) {
      say(pick(RAGE), 1600);
    } else {
      say(pick(MSGS), 1400);
    }
  };

  // bấm đúp: ma biến mất rồi hiện ở chỗ khác
  const onDoubleClick = () => {
    if (!awake) return;
    const el = stage.current;
    const c = ghostCenter();
    addBurst(c.x, c.y, true);
    actT.clear();
    setAct('phase');
    later(() => {
      const s = st.current;
      const m = Math.max(40, el.clientWidth / 2 - 90);
      s.x = (Math.random() * 2 - 1) * m;
      s.y = (Math.random() * 2 - 1) * 30;
      s.vx = 0;
      s.vy = 0;
      addBurst(el.clientWidth / 2 + s.x, el.clientHeight * 0.44 + s.y, true);
    }, 300);
    later(() => {
      setAct('');
      say('boo. over here.', 1400);
    }, 480);
  };

  const toggleDay = () => {
    booT.clear();
    sayT.clear();
    setBoo(false);
    setSayOn(false);
    if (eclipse) {
      eclipseT.clear();
      setEclipse(false);
      return;
    }
    const now = performance.now();
    sunClicks.current = [...sunClicks.current.filter((t) => now - t < 2500), now];
    if (sunClicks.current.length >= 5) {
      sunClicks.current = [];
      setDay(true);
      setEclipse(true);
      flash('☀ total eclipse · the ghost woke up early');
      eclipseT.set(() => setEclipse(false), 8000);
      return;
    }
    setDay((d) => !d);
  };

  const cls = [
    'lab-ghost',
    boo && 'is-boo',
    sayOn && 'is-say',
    day && 'is-day',
    eclipse && 'is-eclipse',
    rage && 'is-rage',
    konami && 'is-konami',
    act && `act-${act}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={stage}
      className={cls}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="ghost-sky-day" />
      <span className="ghost-cloud" style={{ top: '16%', animationDuration: '40s' }} />
      <span className="ghost-cloud ghost-cloud-b" style={{ top: '34%', animationDuration: '55s', animationDelay: '-20s' }} />

      {STARS.map((s, i) => (
        <span key={i} className="ghost-star" style={{ left: s.l, top: s.t, animationDelay: s.d }} />
      ))}
      <span className="ghost-shoot" />

      <button
        type="button"
        className="ghost-moon"
        aria-label={day ? 'bring the night back' : 'make it daytime'}
        aria-pressed={day}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggleDay}
      />

      <span className="ghost-mini" style={{ top: '22%', animationDuration: '16s' }} />
      <span className="ghost-mini ghost-mini-b" style={{ top: '60%', animationDuration: '22s', animationDelay: '-9s' }} />

      <div className="ghost-secrets" aria-hidden="true">
        {SECRETS.map((s) => (
          <span key={s.s} className="ghost-secret" style={{ left: s.l, top: s.t }}>
            {s.s}
          </span>
        ))}
      </div>
      <div className="ghost-lantern" aria-hidden="true" />

      <div className="ghost-ground" />
      <span className="ghost-fog" />
      <span className="ghost-fog ghost-fog-b" />
      <div className="ghost-shadow" />
      <canvas ref={canvas} className="ghost-fx" aria-hidden="true" />

      <div className="ghost-actor">
        <div ref={drift} className="ghost-drift">
          <div className="ghost-float">
            <div className="ghost-bubble">{msg}</div>
            <div className="ghost-halo" />
            <div ref={ghost} className="ghost">
              <svg className="ghost-body" viewBox="0 0 100 140" aria-hidden="true">
                <defs>
                  <linearGradient id="ghost-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: 'var(--g-top)' }} stopOpacity="0.97" />
                    <stop offset="0.55" style={{ stopColor: 'var(--g-mid)' }} stopOpacity="0.92" />
                    <stop offset="1" style={{ stopColor: 'var(--g-bot)' }} stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <path d={HEM_A} fill="url(#ghost-fill)" stroke="rgba(255,255,255,0.55)" strokeWidth="1">
                  {!reduced && (
                    <animate
                      attributeName="d"
                      dur="2.8s"
                      repeatCount="indefinite"
                      values={`${HEM_A};${HEM_B};${HEM_A}`}
                      keyTimes="0;0.5;1"
                      calcMode="spline"
                      keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
                    />
                  )}
                </path>
              </svg>
              <span className="ghost-arm ghost-arm-l" />
              <span className="ghost-arm ghost-arm-r" />
              <div className="ghost-eyes">
                <span className="ghost-eye ghost-eye-l" />
                <span className="ghost-eye ghost-eye-r" />
              </div>
              <span className="ghost-mouth" />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="ghost-grave"
        aria-label="grave"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setEpi((i) => (i + 1) % EPITAPHS.length)}
      >
        <span className="ghost-rip">{EPITAPHS[epi]}</span>
        <span className="ghost-zzz ghost-zzz-1">z</span>
        <span className="ghost-zzz ghost-zzz-2">z</span>
        <span className="ghost-zzz ghost-zzz-3">Z</span>
      </button>

      {bursts.map((b) => (
        <span key={b.id} className="ghost-burst" style={{ left: b.x, top: b.y }}>
          {b.ring ? (
            <span className="ghost-ring" />
          ) : (
            b.sparks.map((s, i) => (
              <span key={i} className="ghost-spark" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, background: s.c }} />
            ))
          )}
        </span>
      ))}

      {flashKey > 0 && <span key={flashKey} className="ghost-flash" />}
      <span className={`ghost-toast${toast.on ? ' is-on' : ''}`}>{toast.text}</span>

      <span className="ghost-hint">
        {eclipse
          ? '// total eclipse · the ghost is wide awake'
          : day
            ? '// shh, the ghost is asleep · click the sun'
            : '// poke it · click the moon · look closer'}
      </span>
      <span className="ghost-count">boos: {boos}</span>
    </div>
  );
}
