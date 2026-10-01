import { useEffect, useRef, useState } from 'react';
import './Ghost.css';

const STARS = [
  { l: '12%', t: '18%', d: '0s' },
  { l: '30%', t: '10%', d: '0.9s' },
  { l: '88%', t: '56%', d: '1.4s' },
  { l: '20%', t: '64%', d: '0.4s' },
  { l: '64%', t: '82%', d: '1.1s' },
  { l: '46%', t: '88%', d: '1.8s' },
];

// Con ma: bay lơ lửng, vẫy tay, chớp mắt, mắt dõi theo con trỏ chuột.
// Bấm vào sân khấu -> ma giật mình nhảy lên và hét "BOO!".
export default function Ghost() {
  const stage = useRef(null);
  const ghost = useRef(null);
  const timer = useRef(0);
  const [boo, setBoo] = useState(false);

  useEffect(() => () => clearTimeout(timer.current), []);

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

  const onPointerDown = () => {
    clearTimeout(timer.current);
    setBoo(true);
    timer.current = window.setTimeout(() => setBoo(false), 900);
  };

  return (
    <div
      ref={stage}
      className={`lab-ghost${boo ? ' is-boo' : ''}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
    >
      <span className="ghost-moon" />
      {STARS.map((s, i) => (
        <span key={i} className="ghost-star" style={{ left: s.l, top: s.t, animationDelay: s.d }} />
      ))}
      <span className="ghost-mini" style={{ top: '22%', animationDuration: '16s' }} />
      <span className="ghost-mini ghost-mini-b" style={{ top: '70%', animationDuration: '22s', animationDelay: '-9s' }} />

      <div className="ghost-float">
        <div className="ghost-bubble">BOO!</div>
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
      <div className="ghost-shadow" />
      <span className="ghost-hint">// click the ghost</span>
    </div>
  );
}
