import { useEffect, useRef, useState } from 'react';
import { env, setupLizard } from './creature.js';

const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

// Sinh một con mới: số chân, độ dài đuôi ngẫu nhiên (giống bản gốc, thu nhỏ cho vừa khung)
function spawn(w, h) {
  const legs = rand(1, 12);
  const tail = rand(4, 4 + legs * 8);
  return { legs, critter: setupLizard(4.5 / Math.sqrt(legs), legs, tail, w, h) };
}

// Bò sát bám theo con trỏ trong một khung canvas. Bấm "respawn" để đổi con khác.
export default function Reptile() {
  const wrap = useRef(null);
  const cvs = useRef(null);
  const state = useRef({ critter: null });
  const [legs, setLegs] = useState(0);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const canvas = cvs.current;
    const box = wrap.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    let frame = 0;
    let stroke = '';

    const resize = () => {
      w = box.clientWidth;
      h = box.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    env.ctx = ctx;
    env.mouse.x = w * 0.75;
    env.mouse.y = h / 2;
    const s = spawn(w, h);
    state.current.critter = s.critter;
    setLegs(s.legs);

    const move = (e) => {
      const r = canvas.getBoundingClientRect();
      env.mouse.x = e.clientX - r.left;
      env.mouse.y = e.clientY - r.top;
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', move);

    const ro = new ResizeObserver(() => {
      resize();
      env.ctx = ctx;
    });
    ro.observe(box);
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(box);

    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (!visible || t - last < 33) return; // ~30 khung/giây như bản gốc, dừng khi cuộn khỏi màn hình
      last = t;
      env.ctx = ctx;
      ctx.clearRect(0, 0, w, h);
      if (frame++ % 20 === 0) stroke = getComputedStyle(box).color; // màu theo theme, không cần đọc style mỗi khung hình
      ctx.strokeStyle = stroke;
      state.current.critter.follow(env.mouse.x, env.mouse.y);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', move);
    };
  }, [nonce]);

  return (
    <div className="bg-inset border border-line rounded-[10px] p-[26px]">
      <div ref={wrap} className="relative h-[380px] rounded-lg border border-line overflow-hidden text-ink" style={{ background: 'var(--panel)' }}>
        <canvas ref={cvs} className="absolute inset-0 w-full h-full touch-none" />
        <span className="absolute top-2.5 left-3 font-mono text-[12px] text-dim pointer-events-none">
          move your cursor, it follows · {legs} legs
        </span>
      </div>
      <div className="flex gap-2.5 mt-4">
        <button type="button" onClick={() => setNonce((n) => n + 1)} className="lab-cell px-3.5 py-1.5 rounded-md border border-line hover:border-amber text-ink font-mono text-[13px]">
          respawn
        </button>
      </div>
    </div>
  );
}
