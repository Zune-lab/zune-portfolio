import { useEffect, useRef, useState } from 'react';
import { pausableInterval } from '../../../../lib/timers.js';
import useBubble from '../shared/useBubble.js';
import usePetLife from '../shared/usePetLife.js';
import Zzz from '../shared/Zzz.jsx';
import './Compass.css';

// Compa vẽ kỹ thuật biết đi (skin blueprint): hai chân thay nhau bước dưới đáy màn hình, chân kim nhọn luôn cắm xuống nền.
// Bấm vào thì nó dừng lại, cắm kim và VẼ một hình hình học lên nền bản vẽ (tròn, tam giác nội tiếp, lục giác...) kèm số đo;
// nét vẽ hiện dần như đang quay compa, giữ vài giây rồi mờ đi. Mỗi lần bấm là một hình khác. Lúc rảnh nó tự dừng lại vẽ một hình.
// Biết phản ứng: chuyển trang thì vẽ mũi tên, đổi theme vẽ vòng tròn, copy xong vẽ dấu ✓, Konami thì vẽ ngôi sao; lắc chuột thì giật mình nhảy;
// 35 giây không ai đụng tới thì khép hai chân lại ngủ gật (zzz), có động tĩnh là duỗi chân dậy.
const SHAPES = [
  { name: 'circle', note: 'Ø 12.0 mm', parts: [{ t: 'c', r: 46 }, { t: 'l', d: 'M0 0H46', dim: true }] },
  { name: 'triangle', note: '∠ 60° × 3', parts: [{ t: 'c', r: 46 }, { t: 'p', d: 'M0 -46L39.8 23 -39.8 23Z' }] },
  { name: 'hexagon', note: 'n = 6, r = 46', parts: [{ t: 'c', r: 46 }, { t: 'p', d: 'M46 0L23 39.8 -23 39.8 -46 0 -23 -39.8 23 -39.8Z' }] },
  { name: 'spiral', note: 'tolerance: vibes', parts: [{ t: 'p', d: 'M0 0C8 -8 16 4 8 14 -6 28 -30 8 -22 -14 -12 -40 28 -34 38 -8 50 24 20 52 -14 48' }] },
  { name: 'bisect', note: 'scale 1:1 (trust me)', parts: [{ t: 'c', r: 46 }, { t: 'p', d: 'M-46 0H46M0 -46V46' }, { t: 'c', r: 23, dash: true }] },
];
// hình riêng cho từng sự kiện (không nằm trong vòng xoay khi bấm)
const NAMED = {
  star: { name: 'star', note: '5 points, 0 friends', parts: [{ t: 'c', r: 46, dash: true }, { t: 'p', d: 'M0 -46L27 37.2 -43.75 -14.2 43.75 -14.2 -27 37.2Z' }] },
  arrow: { name: 'arrow', note: 'proceed →', parts: [{ t: 'p', d: 'M-44 0H40' }, { t: 'p', d: 'M40 0L26 -11M40 0L26 11' }] },
  check: { name: 'check', note: 'verified ✓', parts: [{ t: 'p', d: 'M-34 4L-12 28 38 -30' }] },
  sun: { name: 'sun', note: 'Ø day / night', parts: [{ t: 'c', r: 22 }, { t: 'p', d: 'M0 -32V-46M0 32V46M-32 0H-46M32 0H46M-23 -23L-33 -33M23 23L33 33M-23 23L-33 33M23 -23L33 -33' }] },
};

export default function Compass() {
  const [drawing, setDrawing] = useState(null); // { shape, n } khi đang vẽ; null khi đi bộ
  const [n, setN] = useState(0);
  const [startled, setStartled] = useState(false);
  const { text, say } = useBubble(2600);
  const hold = useRef(0);
  const busy = useRef(false); // đang vẽ: không tự vẽ thêm
  const drawRef = useRef(() => {});
  const asleepRef = useRef(false);

  useEffect(() => {
    if (!drawing) return undefined;
    clearTimeout(hold.current);
    hold.current = window.setTimeout(() => setDrawing(null), 4600);
    return () => clearTimeout(hold.current);
  }, [drawing]);

  // vẽ một hình: theo tên (hình riêng của sự kiện) hoặc lần lượt theo vòng xoay
  const draw = (name) => {
    const shape = (name && NAMED[name]) || SHAPES[n % SHAPES.length];
    if (!name) setN((v) => v + 1);
    setDrawing({ shape, n: Math.random() });
    say(shape.note);
  };
  useEffect(() => {
    drawRef.current = draw;
    busy.current = !!drawing;
  });
  const measure = () => draw();

  const asleep = usePetLife((name) => {
    if (name === 'sleep') {
      asleepRef.current = true;
      setDrawing(null);
    } else if (name === 'wake') {
      asleepRef.current = false;
      say('ok, ok. measuring.', 1800);
    } else if (name === 'shake') {
      setStartled(true);
      say('!?', 1200);
      setTimeout(() => setStartled(false), 700);
    } else if (!asleepRef.current && !busy.current) {
      const kind = { konami: 'star', navigate: 'arrow', copy: 'check', theme: 'sun' }[name];
      if (kind) drawRef.current(kind);
    }
  });
  // lúc rảnh tự dừng lại vẽ một hình
  useEffect(
    () =>
      pausableInterval(
        () => {
          if (!asleepRef.current && !busy.current) drawRef.current();
        },
        () => 45000 + Math.random() * 30000,
        { onResume: () => {} }
      ),
    []
  );

  return (
    <div className={`compass ${drawing || asleep ? 'is-measuring' : ''} ${asleep ? 'is-asleep' : ''} ${startled ? 'is-startled' : ''}`}>
      {drawing && (
        <svg key={drawing.n} className="compass-sketch" viewBox="-60 -60 120 120" width="120" height="120" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
          {drawing.shape.parts.map((p, i) => {
            const common = { pathLength: 1, className: `compass-stroke ${p.dash ? 'is-dash' : ''}`, style: { '--i': i } };
            if (p.t === 'c') return <circle key={i} r={p.r} {...common} />;
            return <path key={i} d={p.d} {...common} />;
          })}
          <circle r="1.8" fill="currentColor" stroke="none" />
          <text className="compass-note" x="0" y="-52" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7">{drawing.shape.note}</text>
        </svg>
      )}
      <div className="compass-flip">
        <button type="button" className="compass-hit" aria-label="the walking drafting compass. Click to make it draw a shape" onClick={measure}>
          <svg viewBox="-6 0 72 84" width="64" height="76" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <g className="compass-leg compass-leg-a">
              <path d="M30 14 L16 74" />
              <path d="M16 74 l-1 5" strokeWidth="1.2" />
            </g>
            <g className="compass-leg compass-leg-b">
              <path d="M30 14 L44 74" />
              <path d="M44 74 l3 4 l-5 -1 z" fill="currentColor" strokeWidth="1" />
            </g>
            <rect x="26" y="6" width="8" height="10" rx="2" fill="var(--bg)" />
            <circle cx="30" cy="4" r="3" fill="var(--bg)" />
            <path d="M24 30 L36 30" strokeWidth="1" opacity=".6" />
          </svg>
        </button>
      </div>
      <Zzz show={asleep} />
      {text && <div className="cameo-bubble compass-bubble">{text}</div>}
    </div>
  );
}
