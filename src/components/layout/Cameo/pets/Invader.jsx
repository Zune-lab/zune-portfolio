import { useEffect, useRef, useState } from 'react';
import { Pixels } from '../shared/Pixels.jsx';
import useBubble from '../shared/useBubble.js';
import useScrollFx from '../shared/useScrollFx.js';
import './Invader.css';

// Quái vật arcade đi tuần dưới đáy màn hình (skin crt). Bấm vào là "bắn": tia laser từ đáy màn, nổ thành điểm ảnh, lát sau nó hồi sinh.
const A = ['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'];
const B = ['..X.....X..', 'X..X...X..X', 'X.XXXXXXX.X', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..X.....X..', '.X.......X.'];
const COLORS = { X: 'currentColor' };
const QUIPS = ['ouch', 'direct hit', 'insert coin', 'GAME OVER?', 'i will be back'];

// Cuộn trang thì nó hành quân nhanh theo tốc độ cuộn (tối đa x5), dừng cuộn thì về nhịp cũ.
export default function Invader() {
  const patrol = useRef(null);
  const [dead, setDead] = useState(false);
  const [kills, setKills] = useState(0);
  const { text, say } = useBubble(1600);

  useScrollFx(({ vel, scrolling }) => {
    const rate = scrolling ? Math.min(5, 1 + Math.abs(vel) / 450) : 1;
    patrol.current?.getAnimations({ subtree: true }).forEach((a) => {
      a.playbackRate = rate;
    });
  });

  useEffect(() => {
    if (!dead) return undefined;
    const id = setTimeout(() => setDead(false), 2800);
    return () => clearTimeout(id);
  }, [dead]);

  const shoot = () => {
    if (dead) return;
    setDead(true);
    setKills((k) => k + 1);
    say(QUIPS[kills % QUIPS.length]);
  };

  return (
    <>
      <div className="invader-patrol" ref={patrol}>
        {!dead && (
          <button type="button" className="invader-hit" onClick={shoot} aria-label="shoot the space invader" title="shoot!">
            <span className="invader-f invader-f1"><Pixels rows={A} colors={COLORS} px={3} /></span>
            <span className="invader-f invader-f2"><Pixels rows={B} colors={COLORS} px={3} /></span>
          </button>
        )}
        {dead && (
          <div className="invader-boom" aria-hidden="true">
            <div className="invader-beam" />
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} style={{ '--a': `${i * 45}deg` }} />
            ))}
          </div>
        )}
        {text && <div className="cameo-bubble invader-bubble">{text}</div>}
      </div>
      {kills > 0 && <div className="invader-score" aria-live="polite">KILLS {String(kills).padStart(3, '0')}</div>}
    </>
  );
}
