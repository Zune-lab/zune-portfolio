import { useCallback, useEffect, useRef, useState } from 'react';
import usePetLife from '../shared/usePetLife.js';
import './Doodle.css';

// Tờ giấy nhớ có cây bút tự vẽ nguệch ngoạc (skin paper): mèo, tên lửa, bông hoa, nét bút hiện dần như đang vẽ thật.
// Tờ giấy dán yên ở khoảng trống đầu trang (cuộn theo trang, không trôi trên màn hình, không nhúc nhích khi rê chuột).
// Bấm vào thì vẽ hình tiếp theo. Nó cũng "nghe" trang và vẽ lại hình hợp cảnh (tờ giấy vẫn đứng yên, chỉ có nét bút đổi): ngủ thì vẽ trăng,
// dậy vẽ mặt trời, chuyển trang vẽ mũi tên, copy xong vẽ trái tim, Konami vẽ ngôi sao, lắc chuột vẽ mặt giật mình.
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
  // ---- hình theo sự kiện (không nằm trong vòng xoay khi bấm): từ vị trí BASE trở đi
  { key: 'moon', cap: 'zzz...', parts: [P('M70 18C48 20 38 40 44 58 51 78 76 84 92 72 70 70 62 50 70 18Z'), P('M24 28h6M27 25v6M98 32h5M100.5 29.5v5'), P('M86 20h9l-9 9h9M100 8h7l-7 7h7', true)] },
  { key: 'sun', cap: 'morning!', parts: [C(60, 50, 14), P('M60 22v8M60 70v8M32 50h8M80 50h8M40 30l6 6M74 64l6 6M40 70l6-6M74 36l6-6', true)] },
  { key: 'arrow', cap: 'this way', parts: [P('M18 74C32 30 66 24 98 44'), P('M98 44L84 38M98 44L90 58', true), C(18, 74, 3)] },
  { key: 'star', cap: 'konami!', parts: [P('M60 14L81.2 81 25.8 40 94.2 40 38.8 81Z'), P('M14 22h6M17 19v6M100 16h5M102.5 13.5v5', true)] },
  { key: 'surprise', cap: '!?', parts: [C(60, 54, 32), C(48, 46, 3), C(72, 46, 3), C(60, 70, 7), P('M42 34L54 38M78 34L66 38'), P('M100 14v16M100 36v3', true)] },
  { key: 'heart', cap: 'copied', parts: [P('M60 88C18 58 26 22 48 28 58 31 60 40 60 40 60 40 62 31 72 28 94 22 102 58 60 88Z', true), P('M30 22h5M32.5 19.5v5M92 74h5M94.5 71.5v5')] },
];
const BASE = 3; // 3 hình đầu là bộ vòng xoay khi bấm
const AT = Object.fromEntries(DOODLES.map((d, i) => [d.key, i]));

export default function Doodle() {
  const [idx, setIdx] = useState(0);
  const base = useRef(0); // hình vòng xoay đang là hình "nền"
  const back = useRef(0);
  const sleeping = useRef(false);
  const next = useCallback(() => {
    clearTimeout(back.current);
    base.current = (base.current + 1) % BASE;
    setIdx(base.current);
  }, []);
  // vẽ một hình theo sự kiện, vài giây sau về hình nền (trừ lúc ngủ: giữ trăng tới khi dậy)
  const show = useCallback((key, ms = 7000) => {
    clearTimeout(back.current);
    setIdx(AT[key]);
    if (ms) back.current = window.setTimeout(() => setIdx(base.current), ms);
  }, []);
  usePetLife((name, detail) => {
    if (name === 'sleep') {
      sleeping.current = true;
      show('moon', 0);
    } else if (name === 'wake') {
      sleeping.current = false;
      show('sun', 5000);
    } else if (sleeping.current) {
      // đang ngủ: kệ
    } else if (name === 'theme') show(detail === 'dark' ? 'moon' : 'sun', 5000);
    else if (name === 'navigate') show('arrow');
    else if (name === 'konami') show('star', 9000);
    else if (name === 'shake') show('surprise', 3500);
    else if (name === 'copy') show('heart', 5000);
  });
  useEffect(() => () => clearTimeout(back.current), []);
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
