import { useEffect, useRef, useState } from 'react';
import { hasFinePointer, prefersReducedMotion } from '../../../../lib/env.js';
import { frameLoop } from '../../../../lib/loop.js';
import useBubble from '../shared/useBubble.js';
import useScrollFx from '../shared/useScrollFx.js';
import './Drone.css';

// Drone neon bay theo con trỏ (skin cyberpunk): lò xo mềm, nghiêng theo hướng bay; khi bạn đứng yên thì thả về góc màn hình.
// Cuộn trang thì nó bị cuốn theo: trôi lên khi cuộn xuống, chúi xuống khi cuộn lên, rồi từ từ ổn định lại.
// Bấm vào thì nó giật nhiễu và phán một câu. Máy cảm ứng: đậu yên ở góc, vẫn bấm được.
const QUOTES = [
  'ICE detected. ignoring it, as is tradition.',
  'scanning... 1 human, 3 tabs, 0 chill.',
  'neon level: dangerously high.',
  'i do not have a job. i have a vibe.',
  'no megacorp was harmed in this portfolio.',
];

export default function Drone() {
  const root = useRef(null);
  const [glitch, setGlitch] = useState(false);
  const [n, setN] = useState(0);
  const { text, say } = useBubble(3200);
  const wind = useRef(0); // vận tốc cuộn gần nhất (px/s), vòng lặp bay đọc từ đây
  useScrollFx(({ vel }) => {
    wind.current = vel;
  });

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const follow = hasFinePointer() && !prefersReducedMotion();
    const idle = () => ({ x: window.innerWidth - 200, y: window.innerHeight - 90 });
    const pos = idle();
    let tx = pos.x;
    let ty = pos.y;
    let vx = 0;
    let vy = 0;
    let lastMove = 0;
    let last = 0;
    let drift = 0; // độ lệch dọc do gió, làm mượt
    const move = (e) => {
      lastMove = performance.now();
      tx = e.clientX + 58;
      ty = e.clientY + 30;
    };
    if (follow) window.addEventListener('pointermove', move, { passive: true });
    const draw = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      if (!follow || t - lastMove > 3500) {
        const home = idle();
        tx = home.x + Math.sin(t / 900) * 8;
        ty = home.y + Math.cos(t / 700) * 6;
      }
      drift += (Math.max(-150, Math.min(150, -wind.current * 0.1)) - drift) * Math.min(1, dt * 6);
      // lò xo giảm chấn (đích dọc cộng thêm độ lệch do gió, không ghi đè ty)
      vx += (tx - pos.x) * 24 * dt;
      vy += (ty + drift - pos.y) * 24 * dt;
      vx *= 0.86;
      vy *= 0.86;
      pos.x += vx * dt * 6;
      pos.y += vy * dt * 6;
      const tilt = Math.max(-18, Math.min(18, vx * 0.22));
      el.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
    };
    const loop = frameLoop(draw, { onResume: () => (last = 0) });
    return () => {
      loop.stop();
      window.removeEventListener('pointermove', move);
    };
  }, []);

  return (
    <div className="drone" ref={root}>
      <button
        type="button"
        className={`drone-body ${glitch ? 'is-glitch' : ''}`}
        aria-label="D-0N3, the neon drone. Click for a quip"
        onClick={() => {
          setGlitch(true);
          setTimeout(() => setGlitch(false), 520);
          say(QUOTES[n % QUOTES.length]);
          setN((v) => v + 1);
        }}>
        <svg viewBox="0 0 80 52" width="52" height="34" aria-hidden="true">
          <g className="drone-rotors" stroke="var(--glow)" strokeWidth="2" strokeLinecap="round">
            <path d="M4 10h24M52 10h24" />
          </g>
          <path d="M16 12h8v8M64 12h-8v8" fill="none" stroke="var(--glow)" strokeWidth="2" />
          <polygon points="40,14 62,22 62,36 40,46 18,36 18,22" fill="#10081f" stroke="var(--amber)" strokeWidth="2" />
          <polygon points="40,19 56,25 56,34 40,41 24,34 24,25" fill="none" stroke="var(--glow)" strokeWidth="1" opacity=".7" />
          <circle cx="40" cy="30" r="7" fill="#1b0b2a" stroke="var(--glow)" strokeWidth="1.5" />
          <circle className="drone-eye" cx="40" cy="30" r="3.4" fill="var(--amber)" />
          <path d="M30 47h20" stroke="var(--glow)" strokeWidth="2" opacity=".6" className="drone-jet" />
        </svg>
      </button>
      {text && <div className="cameo-bubble drone-bubble">{text}</div>}
    </div>
  );
}
