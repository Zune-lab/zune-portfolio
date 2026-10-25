import { useCallback, useEffect, useRef, useState } from 'react';
import { storageKey } from '../../../../config/site.js';
import { hasFinePointer, prefersReducedMotion } from '../../../../lib/env.js';
import { sessionGet, sessionSet } from '../../../../lib/storage.js';
import { pausableInterval } from '../../../../lib/timers.js';
import useTimer from '../../../../lib/useTimer.js';
import useScrollFx from '../shared/useScrollFx.js';
import './Clippy.css';

// Clippy: trợ lý kẹp giấy kiểu Office 97 (skin retro-os). Chào một lần mỗi phiên, thỉnh thoảng đưa mẹo theo trang đang xem,
// chớp mắt, mắt dõi theo con trỏ. Và đi theo thanh cuộn: đầu trang đứng ngay dưới navbar, cuộn xuống thì trượt xuống theo (như cái ngón tay của
// thanh cuộn), nghiêng người theo tốc độ, mắt nhìn theo hướng cuộn; cuộn tới đáy thì hỏi có muốn lên đầu trang không. Bấm vào để nghe thêm mẹo, "Hide Clippy" chỉ ẩn trong phiên này (lần sau nó lại hỏi han).
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

// đường tâm sợi dây theo hình Clippit gốc (toạ độ trong viewBox 42x81)
const WIRE = 'M36 38V66.25A11.75 11.75 0 0 1 12.5 66.25V11.75A8.75 8.75 0 0 1 30 11.75V56.25A5.75 5.75 0 0 1 18.5 56.25V36';

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
    (text, actions = [], ms = 9000) => {
      setMsg({ text, actions });
      setWiggle(true);
      setTimeout(() => setWiggle(false), 800);
      bubbleTimer.set(() => setMsg(null), actions.length > 1 ? 18000 : ms);
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
        20000
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
        const k = Math.min(1, d / 160) * 1.5;
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

  // đi theo cuộn: --ride = độ cao so với mặt sàn (đầu trang = cao nhất, đáy trang = sát sàn), --lean = độ nghiêng theo vận tốc
  const atBottom = useRef(false);
  useScrollFx(
    ({ vel, dir, progress, scrolling }) => {
      const el = root.current;
      if (!el) return;
      const range = Math.max(0, window.innerHeight - 76 - 94 - 56); // trừ navbar, thân Clippy và mặt sàn (taskbar)
      const ride = (1 - progress) * range;
      el.style.setProperty('--ride', `${ride.toFixed(0)}px`);
      el.style.setProperty('--lean', `${Math.max(-12, Math.min(12, vel / 140)).toFixed(1)}deg`);
      el.classList.toggle('is-top', ride > range * 0.55); // ở nửa trên màn hình thì bóng thoại mọc xuống dưới
      if (scrolling && dir) {
        el.style.setProperty('--py', `${dir * 1.5}px`);
        el.style.setProperty('--px', '0px');
      }
      if (progress > 0.985 && !atBottom.current && !document.querySelector('.clippy-bubble')) {
        atBottom.current = true;
        say('You have reached the bottom of the page. Would you like to go back up?', [
          { label: 'Take me up', run: () => { close(); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
          { label: 'No, I live here now', run: close },
        ]);
      } else if (progress < 0.9) atBottom.current = false;
    },
    { enabled: !gone }
  );

  if (gone) return null;

  // Một con mắt: viền kim loại cùng màu dây, tròng trắng, đồng tử đen to có đốm sáng. Chớp = ép dẹp theo trục dọc.
  // Đồng tử dõi theo con trỏ qua biến CSS --px/--py (xem useEffect phía trên), điểm nghỉ lệch nhẹ về phía dưới-phải như bản gốc.
  const eye = (cx, cy, k) => (
    <g transform={`translate(${cx} ${cy}) scale(${k} ${blink ? 0.1 : k})`}>
      <ellipse rx="6.7" ry="5.7" fill="url(#clippy-rim)" stroke="#333366" strokeWidth="0.9" />
      <ellipse rx="5.2" ry="4.3" fill="url(#clippy-white)" stroke="#333366" strokeWidth="0.55" />
      <g transform="translate(0.9 0.5)">
        <g className="clippy-pupil">
          <ellipse rx="3.3" ry="3.3" fill="#0a0a12" />
          <ellipse cx="-1.05" cy="-1.1" rx="0.75" ry="0.65" fill="#fff" opacity="0.9" />
        </g>
      </g>
      <path d="M-5.1 -1.4A5.2 4.3 0 0 1 5.1 -1.4" fill="none" stroke="#333366" strokeWidth="0.8" opacity="0.35" />
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
        <svg viewBox="0 0 42 81" width="40" height="77" aria-hidden="true">
          <defs>
            <radialGradient id="clippy-rim" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#d8d8f2" />
              <stop offset="0.55" stopColor="#9999cc" />
              <stop offset="1" stopColor="#666699" />
            </radialGradient>
            <radialGradient id="clippy-white" cx="0.4" cy="0.35" r="0.75">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#c9c9d6" />
            </radialGradient>
          </defs>
          {/* sợi dây: 3 khúc uốn (vòng to dưới đáy, cung hẹp trên đỉnh, vòng nhỏ bên trong), vẽ chồng nhiều lớp cho ra ống kim loại */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={WIRE} stroke="#333366" strokeWidth="5" />
            <path d={WIRE} stroke="#666699" strokeWidth="3.9" />
            <path d={WIRE} stroke="#9999cc" strokeWidth="2.7" transform="translate(-0.2 -0.2)" />
            <path d={WIRE} stroke="#d6d6f0" strokeWidth="1.1" transform="translate(-0.75 -0.6)" opacity="0.9" />
          </g>
          {/* mắt trái nhỏ và cao hơn, mắt phải to và thấp hơn */}
          {eye(11.5, 25, 0.95)}
          {eye(28.2, 29.2, 1.04)}
          {/* lông mày đen vuốt nhọn: trái hất lên, phải xụ xuống */}
          <path className="clippy-brow" d="M7.5 17.5C9.5 14.8 13 13.2 17.2 13.8C14.4 16.7 10.5 17.9 7.5 17.5Z" fill="#0a0a12" />
          <path className="clippy-brow" d="M28.6 20.4C31.6 18.2 35.4 18.9 37.6 23.4C35.2 21.8 31.8 21.5 28.6 20.4Z" fill="#0a0a12" />
        </svg>
      </button>
    </div>
  );
}
