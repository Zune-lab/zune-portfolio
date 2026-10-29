import { useEffect, useRef, useState } from 'react';
import useBubble from '../shared/useBubble.js';
import usePetLife from '../shared/usePetLife.js';
import Zzz from '../shared/Zzz.jsx';
import './Flamingo.css';

// Hồng hạc đứng một chân bên cạnh chiếc boombox trên mặt lưới hoàng hôn (skin ẩn vaporwave).
// Bấm vào hồng hạc hoặc boombox để BẬT NHẠC: kính râm rơi xuống mắt, cổ gật theo nhịp, equalizer nhảy, nốt nhạc và ¥ bay lên. Tự tắt sau 16 giây
// (hoặc bấm lần nữa). Cứ mỗi lần bật thứ ba là "vibe overload": cả cụm đổi màu cầu vồng và một dải chữ neon quét qua màn hình.
// Lúc im lặng nó vẫn sống: cổ đung đưa, chớp mắt, thỉnh thoảng cúi xuống rỉa lông.
// Phản ứng với trang: lắc chuột thì giật mình nhảy lên; chuyển trang thì ngoái cổ nhìn; theme sáng thì đeo kính râm 3 giây; copy xong thì bật nhạc;
// nhập Konami thì lên thẳng "vibe overload"; lâu không ai đụng tới thì rúc đầu vào cánh ngủ (zzz), có động tĩnh là vươn cổ ngáp.
const LINES = ['ｖｉｂｅ ｃｈｅｃｋ ✓', 'ａ ｅ ｓ ｔ ｈ ｅ ｔ ｉ ｃ', 'ｓｕｎｓｅｔ ｆｏｒ ｅｖｅｒ', 'ｎｏ ｔｈｏｕｇｈｔｓ  ｊｕｓｔ ｐｉｎｋ', 'ｎｏｗ ｐｌａｙｉｎｇ： ｍａｌｌ ｓｏｆｔ'];
const NOTES = ['♪', '✦', '¥', '♫', '♪'];

export default function Flamingo() {
  const [vibe, setVibe] = useState(false);
  const [overload, setOverload] = useState(false);
  const times = useRef(0);
  const { text, say } = useBubble(2800);
  const [fx, setFx] = useState(''); // hop | look | stretch
  const [shades, setShades] = useState(false);
  const fxTimer = useRef(0);
  const shadeTimer = useRef(0);

  useEffect(() => {
    if (!vibe) return undefined;
    const id = setTimeout(() => setVibe(false), 16000);
    return () => clearTimeout(id);
  }, [vibe]);
  useEffect(() => {
    if (!overload) return undefined;
    const id = setTimeout(() => setOverload(false), 2800);
    return () => clearTimeout(id);
  }, [overload]);

  const flash = (name, ms) => {
    setFx(name);
    clearTimeout(fxTimer.current);
    fxTimer.current = window.setTimeout(() => setFx(''), ms);
  };
  const asleep = usePetLife((name, detail) => {
    if (name === 'sleep') setVibe(false);
    else if (name === 'wake') {
      flash('stretch', 1300);
      say('ｙａｗｎ', 1600);
    } else if (name === 'shake') {
      flash('hop', 900);
      say('ｗｈｏａ', 1300);
    } else if (name === 'navigate') flash('look', 1100);
    else if (name === 'theme') {
      if (detail === 'light') {
        setShades(true);
        clearTimeout(shadeTimer.current);
        shadeTimer.current = window.setTimeout(() => setShades(false), 3500);
        say('ｓｕｎｓ ｏｕｔ', 1800);
      } else say('ｎｉｇｈｔ ｍｏｄｅ', 1800);
    } else if (name === 'copy') {
      setVibe(true);
      say('ｎｏｗ ｐｌａｙｉｎｇ', 1800);
    } else if (name === 'konami') {
      setVibe(true);
      setOverload(true);
      say('ＶＩＢＥ ＯＶＥＲＬＯＡＤ', 2800);
    }
  });
  useEffect(
    () => () => {
      clearTimeout(fxTimer.current);
      clearTimeout(shadeTimer.current);
    },
    []
  );

  const toggle = () => {
    if (vibe) {
      setVibe(false);
      say('ｓｉｌｅｎｃｅ', 1800);
      return;
    }
    times.current += 1;
    setVibe(true);
    if (times.current % 3 === 0) {
      setOverload(true);
      say('ＶＩＢＥ ＯＶＥＲＬＯＡＤ', 2800);
    } else say(LINES[times.current % LINES.length]);
  };

  return (
    <>
      <div className={`flamingo ${vibe ? 'is-vibe' : ''} ${overload ? 'is-overload' : ''} ${asleep ? 'is-asleep' : ''} ${shades ? 'is-shades' : ''} ${fx ? `is-fx-${fx}` : ''}`}>
        <button type="button" className="flamingo-box" onClick={toggle} aria-label={vibe ? 'boombox, playing. Click to stop the music' : 'boombox. Click to play some music'}>
          <svg viewBox="0 0 64 42" width="58" height="38" aria-hidden="true">
            <path d="M18 9Q32 -3 46 9" fill="none" stroke="#ff71ce" strokeWidth="2" strokeLinecap="round" />
            <rect x="2" y="9" width="60" height="31" rx="4" fill="#2a1252" stroke="#ff71ce" strokeWidth="2" />
            <g className="flamingo-woofer">
              <circle cx="15" cy="26" r="8" fill="#10081f" stroke="#05ffa1" strokeWidth="1.5" />
              <circle cx="15" cy="26" r="3" fill="#05ffa1" />
            </g>
            <g className="flamingo-woofer">
              <circle cx="49" cy="26" r="8" fill="#10081f" stroke="#05ffa1" strokeWidth="1.5" />
              <circle cx="49" cy="26" r="3" fill="#05ffa1" />
            </g>
            <rect x="24" y="14" width="16" height="13" rx="1.5" fill="#10081f" stroke="#ff71ce" strokeWidth="1" />
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} className="flamingo-bar" style={{ '--i': i }} x={25.6 + i * 2.8} y="16" width="2" height="9" fill={i % 2 ? '#05ffa1' : '#ff71ce'} />
            ))}
            <rect x="26" y="31" width="12" height="3" rx="1.5" fill="#ff71ce" opacity=".7" />
          </svg>
        </button>
        <button type="button" className="flamingo-body" onClick={toggle} aria-label="a flamingo. Click to start (or stop) the vibes">
          <svg viewBox="0 0 100 150" width="54" height="81" aria-hidden="true">
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
            <g className="flamingo-preen">
              <g className="flamingo-neck">
                <path d="M38 70C20 64 20 46 36 40 46 36 44 26 34 22" fill="none" stroke="url(#fl-pink)" strokeWidth="7" strokeLinecap="round" />
                <circle cx="33" cy="20" r="6.5" fill="#ff7cc4" />
                <path d="M28 17L14 24 29 26Z" fill="#fff08a" />
                <path d="M14 24L19 21.5 20 25Z" fill="#2b1b3d" />
                <circle className="flamingo-eye" cx="35" cy="18" r="1.7" fill="#2b1b3d" />
                <g className="flamingo-shades">
                  <rect x="30" y="14" width="11" height="7.5" rx="2.6" fill="#10081f" stroke="#05ffa1" strokeWidth="1" />
                  <path d="M41 17.2L46 15.6" stroke="#05ffa1" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M32 16.3h3.5" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".55" />
                </g>
              </g>
            </g>
          </svg>
        </button>
        {vibe &&
          NOTES.map((g, i) => (
            <span key={i} className="flamingo-note" style={{ '--i': i }} aria-hidden="true">
              {g}
            </span>
          ))}
        <Zzz show={asleep} />
        {text && <div className="cameo-bubble flamingo-bubble">{text}</div>}
      </div>
      {overload && (
        <div className="flamingo-banner" aria-hidden="true">
          ＶＩＢＥ ＯＶＥＲＬＯＡＤ
        </div>
      )}
    </>
  );
}
