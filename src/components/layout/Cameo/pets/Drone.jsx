import { useEffect, useRef, useState } from 'react';
import { hasFinePointer, prefersReducedMotion } from '../../../../lib/env.js';
import { frameLoop } from '../../../../lib/loop.js';
import { pausableInterval } from '../../../../lib/timers.js';
import useBubble from '../shared/useBubble.js';
import usePetLife from '../shared/usePetLife.js';
import Zzz from '../shared/Zzz.jsx';
import './Drone.css';

// Drone neon bay theo con trỏ (skin cyberpunk): lò xo mềm, nghiêng theo hướng bay; khi bạn đứng yên thì thả về góc màn hình.
// Làm shipper: cứ khoảng một phút nó thả một gói hàng có dù xuống đúng chỗ đang bay qua; gói rơi xuống sàn, bấm vào để mở xem bên trong có gì
// (toàn đồ vô dụng), không ai mở thì gói tự biến mất.
// Phản ứng với trang: lắc chuột thì lộn vòng né (EVASIVE MANEUVER); chuyển trang thì quét tia scan; copy xong thì LED xanh "ACK"; Konami thì bật đèn disco;
// lâu không ai đụng tới thì hạ cánh xuống sàn, tắt cánh quạt và ngủ (zzz), có động tĩnh là cất cánh lại. Bấm vào chính drone thì nó giật nhiễu và phán một câu. Máy cảm ứng: đậu yên ở góc, vẫn bấm được.
const ITEMS = [
  'a coupon: 0% off, expired yesterday',
  'one (1) rubber duck. debug mode: on',
  'a tiny CRT. it only shows static',
  'an NFT of a pixel. no refunds',
  'cache: 404 not found',
  'a sticker that says "works on my machine"',
];
const QUOTES = [
  'ICE detected. ignoring it, as is tradition.',
  'scanning... 1 human, 3 tabs, 0 chill.',
  'neon level: dangerously high.',
  'i do not have a job. i have a vibe.',
  'no megacorp was harmed in this portfolio.',
];

export default function Drone({ calm = false }) {
  const root = useRef(null);
  const calmRef = useRef(calm); // calm = đang ở trang có đồ chơi dùng con trỏ: đậu góc, không bám chuột
  useEffect(() => {
    calmRef.current = calm;
  });
  const [glitch, setGlitch] = useState(false);
  const [fx, setFx] = useState(''); // hiệu ứng tạm: roll | party | scan | ack
  const ov = useRef(null); // đích bay ép buộc { x, y } (hạ cánh khi ngủ); null = theo chuột như thường
  const fxTimer = useRef(0);
  const [n, setN] = useState(0);
  const { text, say } = useBubble(3200);
  const where = useRef({ x: 0, y: 0 }); // vị trí drone hiện tại, để biết thả gói ở đâu
  const [pkg, setPkg] = useState(null); // { id, x, y, fall, opened: string | null }
  const pkgRef = useRef(null);
  useEffect(() => {
    pkgRef.current = pkg;
  });
  const [m, setM] = useState(0);
  const flash = (name, ms) => {
    setFx(name);
    clearTimeout(fxTimer.current);
    fxTimer.current = window.setTimeout(() => setFx(''), ms);
  };
  const asleep = usePetLife((name) => {
    if (name === 'sleep') ov.current = { x: window.innerWidth - 200, y: window.innerHeight - 52 };
    else if (name === 'wake') {
      ov.current = null;
      say('rebooting... ok.', 1600);
    } else if (name === 'shake') {
      flash('roll', 900);
      say('EVASIVE MANEUVER', 1500);
    } else if (name === 'konami') {
      flash('party', 3200);
      say('PARTY PROTOCOL', 2200);
    } else if (name === 'navigate') {
      flash('scan', 1500);
      say('scanning...', 1400);
    } else if (name === 'copy') {
      flash('ack', 1000);
      say('ACK', 1000);
    }
  });
  useEffect(() => () => clearTimeout(fxTimer.current), []);
  const drop = () => {
    if (pkgRef.current) return;
    const { x, y } = where.current;
    setPkg({ id: Math.random(), x: x + 20, y: y + 30, fall: Math.max(60, window.innerHeight - y - 90), opened: null });
  };
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    return pausableInterval(drop, () => 50000 + Math.random() * 30000, { onResume: () => {} });
  }, []);
  const open = () => {
    if (!pkg || pkg.opened) return;
    setPkg({ ...pkg, opened: ITEMS[m % ITEMS.length] });
    setM((v) => v + 1);
  };
  useEffect(() => {
    if (!pkg?.opened) return undefined;
    const id = setTimeout(() => setPkg(null), 3600);
    return () => clearTimeout(id);
  }, [pkg?.opened]);

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
    const move = (e) => {
      lastMove = performance.now();
      tx = e.clientX + 58;
      ty = e.clientY + 30;
    };
    if (follow) window.addEventListener('pointermove', move, { passive: true });
    const draw = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      if (ov.current) {
        tx = ov.current.x + Math.sin(t / 900) * 4;
        ty = ov.current.y + Math.cos(t / 700) * 3;
      } else if (!follow || calmRef.current || t - lastMove > 3500) {
        const home = idle();
        tx = home.x + Math.sin(t / 900) * 8;
        ty = home.y + Math.cos(t / 700) * 6;
      }
      // lò xo giảm chấn
      vx += (tx - pos.x) * 24 * dt;
      vy += (ty - pos.y) * 24 * dt;
      vx *= 0.86;
      vy *= 0.86;
      pos.x += vx * dt * 6;
      pos.y += vy * dt * 6;
      where.current.x = pos.x;
      where.current.y = pos.y;
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
    <>
    <div className={`drone ${asleep ? 'is-asleep' : ''} ${fx ? `is-${fx}` : ''}`} ref={root}>
      <button
        type="button"
        className={`drone-body ${glitch ? 'is-glitch' : ''} ${fx === 'roll' ? 'is-roll' : ''}`}
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
      {fx === 'scan' && <i className="drone-beam" aria-hidden="true" />}
      <Zzz show={asleep} />
      {text && <div className="cameo-bubble drone-bubble">{text}</div>}
    </div>
    {pkg && (
      <div key={pkg.id} className={`drone-pkg ${pkg.opened ? 'is-open' : ''}`} style={{ left: pkg.x, top: pkg.y, '--fall': `${pkg.fall}px` }}
        onAnimationEnd={(e) => e.target === e.currentTarget && e.animationName === 'drone-pkg-vanish' && setPkg(null)}>
        <button type="button" onClick={open} aria-label="a parcel dropped by the drone. Click to open it" title="open the parcel">
          <svg viewBox="0 0 40 52" width="40" height="52" aria-hidden="true">
            <path className="drone-chute" d="M4 18C4 4 36 4 36 18 30 14 24 14 20 18 16 14 10 14 4 18Z" fill="var(--glow)" opacity=".85" />
            <path d="M4 18L17 40M36 18L23 40M20 18V40" stroke="var(--glow)" strokeWidth="1" fill="none" />
            <rect x="12" y="40" width="16" height="11" fill="#d9a15b" stroke="#6b4a1e" strokeWidth="1.5" />
            <path d="M20 40v11M12 45h16" stroke="#6b4a1e" strokeWidth="1" />
          </svg>
        </button>
        {pkg.opened && <div className="cameo-bubble drone-pkg-bubble">{pkg.opened}</div>}
      </div>
    )}
    </>
  );
}
