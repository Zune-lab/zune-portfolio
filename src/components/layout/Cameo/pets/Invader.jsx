import { useCallback, useEffect, useRef, useState } from 'react';
import { storageKey } from '../../../../config/site.js';
import { prefersReducedMotion } from '../../../../lib/env.js';
import { readBest, saveBest } from '../../../../lib/storage.js';
import { pausableInterval } from '../../../../lib/timers.js';
import { Pixels } from '../shared/Pixels.jsx';
import useBubble from '../shared/useBubble.js';
import usePetLife from '../shared/usePetLife.js';
import Zzz from '../shared/Zzz.jsx';
import './Invader.css';

// Một ván Space Invaders thu nhỏ dưới đáy màn hình (skin crt). Con quái hành quân qua lại, thỉnh thoảng thả bom xuống sàn (chỉ để doạ).
// Bấm vào quái = bắn hạ (+10 × wave), nó hồi sinh sau ít giây. Cứ 4 con hạ được thì lên wave mới: hành quân nhanh hơn, bom dày hơn.
// Thỉnh thoảng một chiếc UFO bay ngang phía trên: bấm trúng được +300. Điểm cao nhất được lưu lại.
// Phản ứng với trang: chuyển trang thì thả một quả bom; lắc chuột thì nhảy né kêu HEY!; nhập Konami thì gọi UFO ra ngay ("30 LIVES!");
// lâu không ai đụng tới thì máy arcade vào chế độ chờ: quái đứng im, nhấp nháy INSERT COIN và ngủ (zzz), có động tĩnh là chạy lại.
const A = ['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'];
const B = ['..X.....X..', 'X..X...X..X', 'X.XXXXXXX.X', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..X.....X..', '.X.......X.'];
const UFO = ['....XXXXXX....', '..XXXXXXXXXX..', 'XXXXXXXXXXXXXX', 'XX.XX.XX.XX.XX', '..XXX....XXX..', '...X......X...'];
const COLORS = { X: 'currentColor' };
const QUIPS = ['ouch', 'direct hit', 'insert coin', 'GAME OVER?', 'i will be back'];
const KEY_HI = storageKey('invader-hi');
const pad = (n) => String(n).padStart(5, '0');

export default function Invader() {
  const patrol = useRef(null);
  const [dead, setDead] = useState(false);
  const [kills, setKills] = useState(0);
  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(() => readBest(KEY_HI));
  const [bomb, setBomb] = useState(null); // { id, x }
  const [ufo, setUfo] = useState(null); // { id, dir, hit }
  const { text, say } = useBubble(1600);
  const [snooze, setSnooze] = useState(false);
  const [dodge, setDodge] = useState(false);
  const wave = 1 + Math.floor(kills / 4);
  const speed = Math.min(2.6, 1 + (wave - 1) * 0.3);

  // wave càng cao càng hành quân nhanh (tăng tốc độ phát của animation CSS, không phải render lại)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      patrol.current?.getAnimations().forEach((a) => {
        a.playbackRate = speed;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [speed]);

  useEffect(() => {
    if (!dead) return undefined;
    const id = setTimeout(() => setDead(false), 2800);
    return () => clearTimeout(id);
  }, [dead]);

  // điểm và kỷ lục giữ thêm trong ref để tính điểm mới mà không gọi hiệu ứng phụ (lưu, setState khác) bên trong hàm cập nhật state
  const scoreRef = useRef(0);
  const hiRef = useRef(hi);
  const addScore = useCallback((pts) => {
    const next = scoreRef.current + pts;
    scoreRef.current = next;
    setScore(next);
    if (next > hiRef.current) {
      hiRef.current = next;
      setHi(next);
      saveBest(KEY_HI, next);
    }
  }, []);

  // bom: thả từ chỗ con quái đang đứng, rơi xuống sàn rồi tan (không trúng ai cả)
  const deadRef = useRef(dead);
  const waveRef = useRef(wave);
  useEffect(() => {
    deadRef.current = dead;
    waveRef.current = wave;
  });
  const dropBomb = () => {
    const el = patrol.current;
    if (!el || deadRef.current) return;
    const r = el.getBoundingClientRect();
    setBomb({ id: Math.random(), x: r.left + r.width / 2 });
  };
  const spawnUfo = () => {
    setUfo((u) => (u ? u : { id: Math.random(), dir: Math.random() < 0.5 ? 1 : -1, hit: false }));
  };
  const sleepRef = useRef(false);
  const dodgeTimer = useRef(0);
  usePetLife((name) => {
    if (name === 'sleep') {
      sleepRef.current = true;
      setSnooze(true);
    } else if (name === 'wake') {
      sleepRef.current = false;
      setSnooze(false);
      say('READY', 1200);
    } else if (sleepRef.current) {
      // máy đang ở chế độ chờ: kệ
    } else if (name === 'navigate') dropBomb();
    else if (name === 'konami') {
      spawnUfo();
      say('30 LIVES!', 2200);
    } else if (name === 'shake') {
      setDodge(true);
      say('HEY!', 1200);
      clearTimeout(dodgeTimer.current);
      dodgeTimer.current = window.setTimeout(() => setDodge(false), 700);
    } else if (name === 'copy') say('GG', 1500);
  });
  useEffect(() => () => clearTimeout(dodgeTimer.current), []);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const stopBombs = pausableInterval(
      () => {
        if (!sleepRef.current) dropBomb();
      },
      () => Math.max(2500, 9000 - waveRef.current * 1100) * (0.7 + Math.random() * 0.6),
      { onResume: () => {} }
    );
    const stopUfo = pausableInterval(
      () => {
        if (!sleepRef.current) spawnUfo();
      },
      () => 26000 + Math.random() * 20000,
      { onResume: () => {} }
    );
    return () => {
      stopBombs();
      stopUfo();
    };
  }, []);

  const shoot = () => {
    if (dead) return;
    setDead(true);
    const k = kills + 1;
    setKills(k);
    addScore(10 * wave);
    say(k % 4 === 0 ? `WAVE ${1 + k / 4}` : QUIPS[kills % QUIPS.length], k % 4 === 0 ? 2000 : 1600);
  };
  const hitUfo = () => {
    if (!ufo || ufo.hit) return;
    setUfo({ ...ufo, hit: true });
    addScore(300);
    say('UFO! +300', 1800);
  };

  return (
    <>
      <div className={`invader-patrol ${snooze ? 'is-snooze' : ''} ${dodge ? 'is-dodge' : ''}`} ref={patrol}>
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
        <Zzz show={snooze} />
        {snooze && <div className="invader-coin" aria-hidden="true">INSERT COIN</div>}
        {text && <div className="cameo-bubble invader-bubble">{text}</div>}
      </div>
      {bomb && <i key={bomb.id} className="invader-bomb" style={{ left: bomb.x }} onAnimationEnd={() => setBomb(null)} aria-hidden="true" />}
      {ufo && (
        <div key={ufo.id} className={`invader-ufo ${ufo.dir > 0 ? 'is-ltr' : 'is-rtl'} ${ufo.hit ? 'is-hit' : ''}`} onAnimationEnd={(e) => e.target === e.currentTarget && setUfo(null)}>
          <button type="button" className="invader-ufo-hit" onClick={hitUfo} aria-label="shoot the bonus UFO" tabIndex={-1}>
            <Pixels rows={UFO} colors={COLORS} px={3} />
          </button>
        </div>
      )}
      {(kills > 0 || score > 0) && (
        <div className="invader-score" aria-live="off">
          SCORE {pad(score)} · HI {pad(hi)} · WAVE {wave}
        </div>
      )}
    </>
  );
}
