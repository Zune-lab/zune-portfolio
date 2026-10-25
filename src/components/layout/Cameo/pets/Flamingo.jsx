import { useEffect, useState } from 'react';
import useBubble from '../shared/useBubble.js';
import './Flamingo.css';

// Hồng hạc đứng một chân trên mặt lưới hoàng hôn (skin vaporwave): cổ đung đưa, chớp mắt, thỉnh thoảng đổi chân.
// Bấm vào thì nó tạo dáng và phán một câu fullwidth.
const LINES = ['ｖｉｂｅ ｃｈｅｃｋ ✓', 'ａ ｅ ｓ ｔ ｈ ｅ ｔ ｉ ｃ', 'ｓｕｎｓｅｔ ｆｏｒ ｅｖｅｒ', 'ｎｏ ｔｈｏｕｇｈｔｓ  ｊｕｓｔ ｐｉｎｋ'];

export default function Flamingo() {
  const [pose, setPose] = useState(false);
  const [n, setN] = useState(0);
  const { text, say } = useBubble(2800);

  useEffect(() => {
    if (!pose) return undefined;
    const id = setTimeout(() => setPose(false), 2200);
    return () => clearTimeout(id);
  }, [pose]);

  return (
    <div className="flamingo">
      <button
        type="button"
        className={`flamingo-body ${pose ? 'is-pose' : ''}`}
        aria-label="a flamingo. Click to make it pose"
        onClick={() => {
          setPose(true);
          say(LINES[n % LINES.length]);
          setN((v) => v + 1);
        }}>
        <svg viewBox="0 0 100 150" width="82" height="123" aria-hidden="true">
          <defs>
            <linearGradient id="fl-pink" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff9ad5" />
              <stop offset="1" stopColor="#ff4fb3" />
            </linearGradient>
          </defs>
          <path d="M60 94V138M60 138h9" fill="none" stroke="#ff4fb3" strokeWidth="3" strokeLinecap="round" />
          <path className="flamingo-leg" d="M70 92L78 110 62 114" fill="none" stroke="#ff4fb3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M30 78C30 62 52 56 66 62 78 66 88 76 80 86 74 96 44 98 34 90 31 87 30 83 30 78Z" fill="url(#fl-pink)" />
          <path d="M44 78C54 70 68 72 76 82" fill="none" stroke="#ffd0ec" strokeWidth="2" strokeLinecap="round" opacity=".8" />
          <g className="flamingo-neck">
            <path d="M38 70C20 64 20 46 36 40 46 36 44 26 34 22" fill="none" stroke="url(#fl-pink)" strokeWidth="7" strokeLinecap="round" />
            <circle cx="33" cy="20" r="6.5" fill="#ff7cc4" />
            <path d="M28 17L14 24 29 26Z" fill="#fff08a" />
            <path d="M14 24L19 21.5 20 25Z" fill="#2b1b3d" />
            <circle className="flamingo-eye" cx="35" cy="18" r="1.7" fill="#2b1b3d" />
          </g>
        </svg>
      </button>
      {text && <div className="cameo-bubble flamingo-bubble">{text}</div>}
    </div>
  );
}
