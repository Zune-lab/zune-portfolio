import { useCallback, useEffect, useRef, useState } from 'react';
import { storageKey } from '../../../../config/site.js';
import { hasFinePointer, prefersReducedMotion } from '../../../../lib/env.js';
import { sessionGet, sessionSet } from '../../../../lib/storage.js';
import { pausableInterval } from '../../../../lib/timers.js';
import useTimer from '../../../../lib/useTimer.js';
import './Clippy.css';

// Clippy: trợ lý kẹp giấy kiểu Office 97 (skin retro-os). Chào một lần mỗi phiên, thỉnh thoảng đưa mẹo theo trang đang xem,
// chớp mắt, mắt dõi theo con trỏ. Bấm vào để nghe thêm mẹo, "Hide Clippy" chỉ ẩn trong phiên này (lần sau nó lại hỏi han).
const KEY_HIDE = storageKey('clippy-hidden');
const KEY_HELLO = storageKey('clippy-hello');

const TIPS = {
  home: [
    'Pro tip: grab a letter in the big headline and throw it. I tried once. It hurt.',
    'The torch up in the corner switches light and dark. Yes, really. Click it.',
    'Zune says "introvert by default". I say: click the contact button anyway.',
  ],
  about: [
    'This is the about page. I would summarise it, but I am only a paperclip.',
    'Looks like you are reading a life story. Would you like me to make it longer?',
  ],
  projects: [
    'It looks like you are browsing projects. Would you like help? ...No? Great, I am excellent at that.',
    'Every card here is a real thing Zune built. I have only ever built a loop.',
  ],
  lab: [
    'The lab is where the experiments live. Some of them move on their own. Do not make eye contact.',
    'There is a snake game in the lab. I am a snake, but bent in fewer places.',
  ],
  any: [
    'Did you know? Pressing Ctrl+K opens the skin picker. Windows 95 never had that.',
    'You have excellent taste in operating systems.',
    'I see you are using a website. Would you like help using a website?',
  ],
};
const pageOf = (view) => (String(view).startsWith('lab') ? 'lab' : TIPS[view] ? view : 'home');

export default function Clippy({ view, onNavigate }) {
  const [gone, setGone] = useState(() => sessionGet(KEY_HIDE) === '1');
  const [msg, setMsg] = useState(null); // { text, actions: [{ label, run }] }
  const [blink, setBlink] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const root = useRef(null);
  const tipIdx = useRef(0);
  const bubbleTimer = useTimer();
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const close = useCallback(() => {
    bubbleTimer.clear();
    setMsg(null);
  }, [bubbleTimer]);
  const say = useCallback(
    (text, actions = [], ms = 11000) => {
      setMsg({ text, actions });
      setWiggle(true);
      setTimeout(() => setWiggle(false), 800);
      bubbleTimer.set(() => setMsg(null), actions.length > 1 ? 25000 : ms);
    },
    [bubbleTimer]
  );
  const nextTip = useCallback(() => {
    const pool = [...TIPS[pageOf(viewRef.current)], ...TIPS.any];
    const text = pool[tipIdx.current++ % pool.length];
    say(text, [{ label: 'Got it', run: close }]);
  }, [say, close]);

  const hide = () => {
    sessionSet(KEY_HIDE, '1');
    close();
    setGone(true);
  };

  // lời chào đầu phiên
  useEffect(() => {
    if (gone || sessionGet(KEY_HELLO) === '1') return undefined;
    const id = setTimeout(() => {
      sessionSet(KEY_HELLO, '1');
      say(
        'It looks like you are visiting a portfolio. Would you like help?',
        [
          { label: 'Show me the projects', run: () => { close(); onNavigate?.('projects'); } },
          { label: 'Who is Zune?', run: () => { close(); onNavigate?.('about'); } },
          { label: 'Hide Clippy', run: hide },
        ],
        25000
      );
    }, 1600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gone]);

  // nhịp sống: chớp mắt, thỉnh thoảng một mẹo (khi không đang nói)
  useEffect(() => {
    if (gone) return undefined;
    const stops = [
      pausableInterval(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 160);
        },
        () => 2800 + Math.random() * 3200,
        { onResume: () => {} }
      ),
      pausableInterval(
        () => {
          if (document.querySelector('.clippy-bubble')) return;
          nextTip();
        },
        () => 60000 + Math.random() * 30000,
        { onResume: () => {} }
      ),
    ];
    return () => stops.forEach((s) => s());
  }, [gone, nextTip]);

  // mắt dõi theo con trỏ: ghi thẳng vào biến CSS, không render lại
  useEffect(() => {
    if (gone || !hasFinePointer() || prefersReducedMotion()) return undefined;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = root.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 3);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 160) * 2.6;
        el.style.setProperty('--px', `${((dx / d) * k).toFixed(2)}px`);
        el.style.setProperty('--py', `${((dy / d) * k).toFixed(2)}px`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, [gone]);

  if (gone) return null;
  const eye = (cx) => (
    <g>
      <ellipse cx={cx} cy="27" rx="7" ry={blink ? 0.9 : 8.5} fill="#fff" stroke="#111" strokeWidth="1.2" />
      {!blink && <circle cx={cx} cy="27" r="3.1" className="clippy-pupil" fill="#111" />}
    </g>
  );

  return (
    <div className="clippy" ref={root}>
      {msg && (
        <div className="clippy-bubble" role="status">
          <p>{msg.text}</p>
          {msg.actions.length > 0 && (
            <div className="clippy-actions">
              {msg.actions.map((a) => (
                <button key={a.label} type="button" onClick={a.run}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button type="button" className={`clippy-body ${wiggle ? 'is-wiggle' : ''}`} onClick={nextTip} aria-label="Clippy, the helpful paperclip. Click for a tip" title="Clippy">
        <svg viewBox="0 0 64 100" width="60" height="94" aria-hidden="true">
          <path d="M18 84V30C18 8 46 8 46 30V70C46 86 28 86 28 70V38" fill="none" stroke="#6b7078" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 84V30C18 8 46 8 46 30V70C46 86 28 86 28 70V38" fill="none" stroke="#c9ced6" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16.5 80V32" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
          <path d="M17 14 24 12M47 14 40 12" stroke="#111" strokeWidth="1.8" strokeLinecap="round" className="clippy-brow" />
          {eye(24)}
          {eye(40)}
        </svg>
      </button>
    </div>
  );
}
