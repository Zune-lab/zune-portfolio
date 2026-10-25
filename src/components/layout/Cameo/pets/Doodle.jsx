import { useCallback, useEffect, useState } from 'react';
import { pausableInterval } from '../../../../lib/timers.js';
import './Doodle.css';

// Tờ giấy nhớ có cây bút tự vẽ nguệch ngoạc (skin paper): mèo, tên lửa, bông hoa, nét bút hiện dần như đang vẽ thật.
// Bấm vào tờ giấy để vẽ hình tiếp theo; tự đổi hình sau mỗi ~30 giây.
// Mỗi phần tử: [kiểu, thuộc tính..., nét nhấn?]. accent = nét màu đỏ của skin.
const P = (d, accent) => ({ t: 'path', d, accent });
const C = (cx, cy, r, accent) => ({ t: 'circle', cx, cy, r, accent });
const DOODLES = [
  {
    cap: 'meow',
    parts: [
      P('M26 72C14 52 22 28 40 26L44 10 56 24C60 23.5 64 23.5 68 24L80 10 84 26C102 28 108 52 94 72 82 86 38 86 26 72Z'),
      C(46, 50, 3),
      C(74, 50, 3),
      P('M56 60L64 60 60 65Z', true),
      P('M60 65Q56 72 50 69M60 65Q64 72 70 69'),
      P('M32 58L14 54M32 64L14 68M88 58L106 54M88 64L106 68'),
    ],
  },
  {
    cap: '3 ... 2 ... 1 ...',
    parts: [
      P('M60 8C78 24 78 52 70 72L50 72C42 52 42 24 60 8Z'),
      C(60, 38, 7),
      P('M50 58L36 78 50 72M70 58L84 78 70 72'),
      P('M54 76Q60 98 66 76', true),
      P('M16 20h6M19 17v6M100 30h6M103 27v6M20 70h4M22 68v4'),
    ],
  },
  {
    cap: 'bloom',
    parts: [
      P('M60 94C57 78 63 64 60 50'),
      P('M60 80C46 78 42 66 50 62 57 64 60 72 60 80Z'),
      C(60, 21, 9),
      C(72, 30, 9),
      C(68, 44, 9),
      C(52, 44, 9),
      C(48, 30, 9),
      C(60, 34, 6, true),
    ],
  },
];

export default function Doodle() {
  const [idx, setIdx] = useState(0);
  const next = useCallback(() => setIdx((i) => (i + 1) % DOODLES.length), []);
  useEffect(() => pausableInterval(next, 30000, { onResume: () => {} }), [next]);
  const d = DOODLES[idx];

  return (
    <button type="button" className="doodle" onClick={next} aria-label={`sketch pad: a doodle of "${d.cap}". Click for another`} title="draw something else">
      <span className="doodle-tape" aria-hidden="true" />
      <svg key={idx} viewBox="0 0 120 100" width="132" height="110" aria-hidden="true">
        {d.parts.map((p, i) => {
          const common = { pathLength: 1, className: `doodle-stroke ${p.accent ? 'is-accent' : ''}`, style: { '--i': i } };
          return p.t === 'path' ? <path key={i} d={p.d} {...common} /> : <circle key={i} cx={p.cx} cy={p.cy} r={p.r} {...common} />;
        })}
      </svg>
      <span className="doodle-cap">{d.cap}</span>
      <svg key={`p${idx}`} className="doodle-pencil" viewBox="0 0 20 60" width="14" height="42" aria-hidden="true">
        <path d="M5 4h10v38l-5 12-5-12z" fill="#f2c94c" stroke="#2b2b2b" strokeWidth="1.4" />
        <path d="M5 42h10M7.5 48.5h5" stroke="#2b2b2b" strokeWidth="1.2" />
        <path d="M5 4h10V10H5z" fill="#e07a7a" stroke="#2b2b2b" strokeWidth="1.4" />
      </svg>
    </button>
  );
}
