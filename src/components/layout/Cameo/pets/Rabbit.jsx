import { useEffect, useRef, useState } from 'react';
import { pausableInterval } from '../../../../lib/timers.js';
import { Pixels } from '../shared/Pixels.jsx';
import useBubble from '../shared/useBubble.js';
import './Rabbit.css';

// Thỉnh thoảng một chú thỏ trắng chạy ngang qua đáy màn hình (skin matrix). Bấm vào thì nó khựng lại, nói một câu rồi chạy tiếp.
const ROWS = [
  '......XX.XX.....',
  '......XX.XX.....',
  '......XX.XX.....',
  '......XXXXXX....',
  '.....XXXXEXXX...',
  '.....XXXXXXXXN..',
  '.XXX..XXXXXX....',
  'XXXXXXXXXXXXX...',
  'XXXXXXXXXXXXXX..',
  'XXXXXXXXXXXXXX..',
  '.XXXXXXXXXXXX...',
  '..XX.XX..XX.XX..',
  '..XX.XX..XX.XX..',
];
const COLORS = { X: '#e9fff0', E: '#00380e', N: '#ff4d6d' };
const LINES = ['wake up.', 'follow me?', 'the rain is just rain. probably.', 'knock knock.', 'you are late for something.'];

export default function Rabbit() {
  const [run, setRun] = useState(0); // 0 = đang nghỉ; số lẻ/chẵn = hướng chạy của lượt này
  const [held, setHeld] = useState(false);
  const n = useRef(0);
  const { text, say } = useBubble(2600);

  useEffect(() => {
    const first = setTimeout(() => setRun((r) => r + 1), 4000);
    const stop = pausableInterval(() => setRun((r) => (r % 2 ? r : r + 1)), () => 22000 + Math.random() * 20000, { onResume: () => {} });
    return () => {
      clearTimeout(first);
      stop();
    };
  }, []);

  const pause = () => {
    if (held) return;
    setHeld(true);
    say(LINES[n.current++ % LINES.length]);
    setTimeout(() => setHeld(false), 2700);
  };

  const running = run % 2 === 1;
  const dir = Math.ceil(run / 2) % 2 ? 'rtl' : 'ltr';
  return running ? (
    <div
      key={run}
      className={`rabbit-run rabbit-${dir} ${held ? 'is-held' : ''}`}
      onAnimationEnd={(e) => e.target === e.currentTarget && setRun((r) => r + 1)}>
      <button type="button" className="rabbit-hit" onClick={pause} aria-label="the white rabbit. Click it">
        <Pixels rows={ROWS} colors={COLORS} px={3} className="rabbit-sprite" />
      </button>
      {text && <div className="cameo-bubble rabbit-bubble">{text}</div>}
    </div>
  ) : null;
}
