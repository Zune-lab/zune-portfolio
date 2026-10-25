import { useEffect, useRef, useState } from 'react';
import useBubble from '../shared/useBubble.js';
import useScrollFx from '../shared/useScrollFx.js';
import './Compass.css';

// Compa vẽ kỹ thuật biết đi (skin blueprint): hai chân thay nhau bước dưới đáy màn hình. Bấm vào thì nó dừng lại đo và vẽ một vòng tròn.
// Cuộn trang thì nó cũng dừng lại "đo trang": cắm chân, vẽ vòng và đọc ra bạn đã cuộn được bao nhiêu phần trăm.
const READINGS = ['Ø 12.0 mm', 'r = 42 ± 0.1', '∠ 37.5°', 'tolerance: vibes', 'scale 1:1 (trust me)'];

export default function Compass() {
  const [measuring, setMeasuring] = useState(false);
  const [n, setN] = useState(0);
  const { text, say } = useBubble(2600);
  const byScroll = useRef(false);
  const lastPct = useRef(-1);
  useScrollFx(({ progress, scrolling }) => {
    if (scrolling) {
      byScroll.current = true;
      setMeasuring(true);
      const pct = Math.round(progress * 100);
      if (pct !== lastPct.current) {
        lastPct.current = pct;
        say(`page: ${pct}%`, 1100);
      }
    } else if (byScroll.current) {
      byScroll.current = false;
      lastPct.current = -1;
      setMeasuring(false);
    }
  });

  useEffect(() => {
    if (!measuring || byScroll.current) return undefined; // đo do cuộn thì tự thôi khi dừng cuộn, không hẹn giờ
    const id = setTimeout(() => setMeasuring(false), 2600);
    return () => clearTimeout(id);
  }, [measuring]);

  return (
    <div className={`compass ${measuring ? 'is-measuring' : ''}`}>
      <div className="compass-flip">
        <button
          type="button"
          className="compass-hit"
          aria-label="the walking drafting compass. Click to measure"
          onClick={() => {
            setMeasuring(true);
            say(READINGS[n % READINGS.length]);
            setN((v) => v + 1);
          }}>
          <svg viewBox="-6 0 72 84" width="64" height="76" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {measuring && <circle className="compass-ring" cx="30" cy="48" r="34" pathLength="1" strokeDasharray="0.02 0.03" />}
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
      {text && <div className="cameo-bubble compass-bubble">{text}</div>}
    </div>
  );
}
