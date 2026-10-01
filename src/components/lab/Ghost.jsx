import { useEffect, useRef, useState } from 'react';
import './Ghost.css';

const STARS = [
  { l: '12%', t: '18%', d: '0s' },
  { l: '30%', t: '10%', d: '0.9s' },
  { l: '88%', t: '56%', d: '1.4s' },
  { l: '20%', t: '48%', d: '0.4s' },
  { l: '64%', t: '70%', d: '1.1s' },
  { l: '46%', t: '14%', d: '1.8s' },
];
const MSGS = [
  'BOO!',
  'AHH!',
  'hehe',
  'boo!!',
  '404: soul not found',
  'git push --force?',
  'works on my grave',
  'no bugs, only ghosts',
];
const SPARK_COLORS = ['#ffffff', '#ffb3d1', '#c9b6ff'];

const makeSparks = () =>
  Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 40 + Math.random() * 36;
    return {
      dx: Math.round(Math.cos(a) * dist),
      dy: Math.round(Math.sin(a) * dist),
      c: SPARK_COLORS[i % SPARK_COLORS.length],
    };
  });

// Con ma: bay lơ lửng, vẫy tay, mắt dõi theo chuột.
//  - bấm vào sân khấu (ban đêm): ma giật mình, nói 1 câu ngẫu nhiên, bắn tia sáng, đếm số lần boo
//  - bấm vào mặt trăng: trời sáng, ma chui về mộ ngủ; bấm mặt trời lần nữa: đêm xuống, ma trồi lên
export default function Ghost() {
  const stage = useRef(null);
  const ghost = useRef(null);
  const booTimer = useRef(0);
  const sparkTimers = useRef(new Set());
  const seq = useRef(0);
  const [day, setDay] = useState(false);
  const [boo, setBoo] = useState(false);
  const [msg, setMsg] = useState(MSGS[0]);
  const [boos, setBoos] = useState(0);
  const [bursts, setBursts] = useState([]);

  useEffect(() => {
    const timers = sparkTimers.current;
    return () => {
      clearTimeout(booTimer.current);
      timers.forEach(clearTimeout);
    };
  }, []);

  // mắt nhìn theo chuột: ghi thẳng CSS variable, không re-render
  const onPointerMove = (e) => {
    const s = stage.current;
    const g = ghost.current;
    if (!s || !g) return;
    const r = g.getBoundingClientRect();
    const clamp = (n) => Math.max(-1, Math.min(1, n));
    s.style.setProperty('--ex', clamp((e.clientX - (r.left + r.width / 2)) / 160));
    s.style.setProperty('--ey', clamp((e.clientY - (r.top + r.height / 2)) / 120));
    s.dataset.track = '1';
  };
  const onPointerLeave = () => {
    const s = stage.current;
    if (s) delete s.dataset.track;
  };

  const onPointerDown = (e) => {
    if (day) return; // ban ngày ma đang ngủ
    const r = stage.current.getBoundingClientRect();
    const id = ++seq.current;
    setBursts((b) => [...b, { id, x: e.clientX - r.left, y: e.clientY - r.top, sparks: makeSparks() }]);
    const t = window.setTimeout(() => {
      setBursts((b) => b.filter((x) => x.id !== id));
      sparkTimers.current.delete(t);
    }, 800);
    sparkTimers.current.add(t);

    clearTimeout(booTimer.current);
    setMsg(MSGS[Math.floor(Math.random() * MSGS.length)]);
    setBoos((n) => n + 1);
    setBoo(true);
    booTimer.current = window.setTimeout(() => setBoo(false), 1000);
  };

  const toggleDay = () => {
    clearTimeout(booTimer.current);
    setBoo(false);
    setDay((d) => !d);
  };

  return (
    <div
      ref={stage}
      className={`lab-ghost${boo ? ' is-boo' : ''}${day ? ' is-day' : ''}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
    >
      <div className="ghost-sky-day" />
      <span className="ghost-cloud" style={{ top: '16%', animationDuration: '40s' }} />
      <span className="ghost-cloud ghost-cloud-b" style={{ top: '34%', animationDuration: '55s', animationDelay: '-20s' }} />

      {STARS.map((s, i) => (
        <span key={i} className="ghost-star" style={{ left: s.l, top: s.t, animationDelay: s.d }} />
      ))}

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

      <div className="ghost-ground" />
      <div className="ghost-shadow" />

      <div className="ghost-actor">
        <div className="ghost-float">
          <div className="ghost-bubble">{msg}</div>
          <div ref={ghost} className="ghost">
            <span className="ghost-arm ghost-arm-l" />
            <span className="ghost-arm ghost-arm-r" />
            <div className="ghost-eyes">
              <span className="ghost-eye" />
              <span className="ghost-eye" />
            </div>
            <span className="ghost-cheek ghost-cheek-l" />
            <span className="ghost-cheek ghost-cheek-r" />
            <span className="ghost-mouth" />
          </div>
        </div>
      </div>

      <div className="ghost-grave" aria-hidden="true">
        <span className="ghost-rip">RIP</span>
        <span className="ghost-zzz ghost-zzz-1">z</span>
        <span className="ghost-zzz ghost-zzz-2">z</span>
        <span className="ghost-zzz ghost-zzz-3">Z</span>
      </div>

      {bursts.map((b) => (
        <span key={b.id} className="ghost-burst" style={{ left: b.x, top: b.y }}>
          {b.sparks.map((s, i) => (
            <span key={i} className="ghost-spark" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, background: s.c }} />
          ))}
        </span>
      ))}

      <span className="ghost-hint">
        {day ? '// shh, the ghost is asleep · click the sun' : '// click the ghost · click the moon'}
      </span>
      <span className="ghost-count">boos: {boos}</span>
    </div>
  );
}
