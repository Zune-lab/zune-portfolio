import { useCallback, useEffect, useRef, useState } from 'react';
import { storageKey, site } from '../../../config/site.js';
import { SKINS } from '../../../config/skins.js';
import { hasFinePointer, prefersReducedMotion } from '../../../lib/env.js';
import { isTypingTarget, scrollToAnchor } from '../../../lib/dom.js';
import { chooseSkin, getSkin, isUnlocked } from '../../../lib/skin.js';
import { sessionGet, sessionSet } from '../../../lib/storage.js';
import { useStatus } from '../../../lib/status.js';
import { onReaction } from '../../../lib/reactions.js';
import { pausableInterval } from '../../../lib/timers.js';
import { HELLO, answer, suggestionsFor } from './brain.js';
import ClippyArt from './ClippyArt.jsx';
import './Assistant.css';

// CLIPPY, TRỢ LÝ THẬT CỦA TRANG, pet riêng của skin retro-os (Cameo chỉ tải và gắn nó khi skin này bật; các skin khác vẫn dùng nút BackToTop và
// khung Terminal như cũ). Nằm góc dưới bên phải, thay cho nút "lên đầu trang" và khung terminal ở skin này.
//   - bấm vào Clippy (hoặc phím ?) mở khung trò chuyện: gõ câu hỏi hoặc bấm gợi ý; bộ não ở brain.js
//   - biết dẫn đường (về trang nào, nhảy tới mục liên hệ), cuộn hộ (lên đầu / xuống cuối), đổi theme và skin, copy email,
//     trả lời về chủ site (stack, giờ giấc, pin xã hội, dự án, lab) và gợi ý đồ chơi ngẫu nhiên
//   - khi cuộn xuống sâu thì hiện nút tròn "Back to Top" ngay cạnh (đúng vai trò của nút cũ)
//   - chủ động nhưng không phiền: chào một lần mỗi phiên, thỉnh thoảng đưa mẹo, hỏi có muốn lên đầu trang khi cuộn tới đáy. "Quiet" tắt hết phần chủ động.
const KEY_HELLO = storageKey('clippy-hello');
const KEY_QUIET = storageKey('clippy-quiet');
const TOP_AFTER = 480; // cuộn quá ngưỡng này (px) thì hiện nút lên đầu trang (giữ đúng ngưỡng của nút cũ)
const smooth = () => (prefersReducedMotion() ? 'auto' : 'smooth');
const isMobile = () => window.matchMedia('(max-width: 640px)').matches;

const TIPS = {
  home: ['Pro tip: grab a letter in the big headline and throw it. I tried once. It hurt.', `${site.name} says "introvert by default". I say: click the contact button anyway.`],
  about: ['This is the about page. I would summarise it, but I am only a paperclip.', 'The log.sh section is the life story as a git log. Try not to blame the first commit.'],
  projects: ['Every card here is a real thing ' + site.name + ' built. I have only ever built a loop.', 'Press / to search the projects. Press ? to search me.'],
  lab: ['The lab is where the experiments live. Some of them move on their own. Do not make eye contact.', 'Ask me for a random toy and I will pick one. I am great at that.'],
  any: ['Did you know? Ctrl+K opens the skin picker. Windows 95 never had that.', 'I can switch dark and light mode for you. The torch in the corner does the same.', 'I see you are using a website. Would you like help using a website?'],
};
const pageKey = (view) => (String(view).startsWith('lab') ? 'lab' : TIPS[view] ? view : 'home');

// hai chỗ cần số ngẫu nhiên đặt ngoài component (luật purity của React: thân component không được gọi hàm không thuần)
const randomSkinId = () => {
  const pool = SKINS.filter((s) => isUnlocked(s.id) && s.id !== getSkin());
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
};
const typingDelay = () => (prefersReducedMotion() ? 0 : 320 + Math.random() * 380);

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand('copy');
      t.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function Assistant({ view, onNavigate, onToggleTheme, onOpenSkins }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [bubble, setBubble] = useState(null); // { text, actions }
  const [blink, setBlink] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [act, setAct] = useState(null); // cử chỉ đang diễn: look | brow | stretch | tap | happy | wave (xem ClippyArt / Assistant.css)
  const [sleeping, setSleeping] = useState(false);
  const [quiet, setQuiet] = useState(() => sessionGet(KEY_QUIET) === '1');
  const { blurb } = useStatus();

  const api = useRef({}); // hàm mới nhất của lần render này, để các callback/timer cũ vẫn gọi đúng bản
  const bodyBtn = useRef(null);
  const logEl = useRef(null);
  const inputEl = useRef(null);
  const nextId = useRef(1);
  const timers = useRef([]);
  const sent = useRef([]); // câu đã gõ (mũi tên lên để gọi lại)
  const sentIdx = useRef(-1);
  const tipIdx = useRef(0);
  const bubbleTimer = useRef(0);
  const actTimer = useRef(0);
  const lastActive = useRef(0);
  const sleepingRef = useRef(false);
  const typingRef = useRef(false);
  const bottomShownFor = useRef('');
  const viewRef = useRef(view);
  const openRef = useRef(open);
  const quietRef = useRef(quiet);
  const bubbleRef = useRef(bubble);
  const blurbRef = useRef(blurb);
  useEffect(() => {
    viewRef.current = view;
    openRef.current = open;
    quietRef.current = quiet;
    bubbleRef.current = bubble;
    blurbRef.current = blurb;
    sleepingRef.current = sleeping;
    typingRef.current = typing;
  });
  const later = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };
  useEffect(() => {
    const list = timers.current;
    return () => {
      list.forEach(clearTimeout);
      clearTimeout(bubbleTimer.current);
      clearTimeout(actTimer.current);
    };
  }, []);

  // diễn một cử chỉ rồi trả về tư thế nghỉ (không diễn khi người dùng bật giảm chuyển động)
  const play = useCallback((name, ms = 1400) => {
    if (prefersReducedMotion()) return;
    clearTimeout(actTimer.current);
    setAct(name);
    actTimer.current = window.setTimeout(() => setAct(null), ms);
  }, []);

  // ---- bóng thoại chủ động
  const closeBubble = useCallback(() => {
    clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);
  const say = useCallback((text, actions = [], ms = 9000) => {
    setBubble({ text, actions });
    if (actions.length) api.current.play?.('tap', 1500);
    setWiggle(true);
    later(() => setWiggle(false), 800);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), actions.length ? Math.max(ms, 14000) : ms);
  }, []);

  // ---- trò chuyện
  const push = (m) => setMsgs((l) => [...l, { id: nextId.current++, ...m }].slice(-80));
  const botSay = (text, actions = []) => {
    push({ from: 'bot', text, actions });
    if (!openRef.current) say(text, actions);
  };

  const waitFor = (selector) => {
    let n = 0;
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) return el.scrollIntoView({ block: 'start' });
      if (++n < 24) later(tick, 150);
    };
    later(tick, 300);
  };
  const go = ({ view: v, scroll, after }) => {
    if (v === viewRef.current) {
      const to = scroll || after;
      if (to) scrollToAnchor(to);
      else window.scrollTo({ top: 0, behavior: smooth() });
    } else {
      onNavigate?.(v, scroll);
      if (after) waitFor(after);
    }
    if (isMobile()) setOpen(false);
  };

  const perform = (a) => {
    switch (a.type) {
      case 'nav':
        return go(a);
      case 'top':
        return window.scrollTo({ top: 0, behavior: smooth() });
      case 'bottom':
        return window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth() });
      case 'ask':
        if (!openRef.current) setOpen(true);
        return send(a.q, a.label);
      case 'link':
        if (a.url.startsWith('mailto:')) window.location.href = a.url;
        else window.open(a.url, '_blank', 'noopener,noreferrer');
        return undefined;
      case 'copy':
        return copyText(a.text).then((ok) => {
          botSay(ok ? `Copied ${a.text} to your clipboard.` : `I could not reach your clipboard. Here it is: ${a.text}`);
          if (ok) play('happy', 1500);
        });
      case 'theme':
        if (document.documentElement.dataset.theme !== a.mode) onToggleTheme?.();
        play('happy', 1500);
        return undefined;
      case 'skin': {
        const id = a.id === 'random' ? randomSkinId() : a.id;
        if (id) chooseSkin(id);
        play('happy', 1500);
        return undefined;
      }
      case 'palette':
        return onOpenSkins?.();
      default:
        return undefined;
    }
  };

  const send = (text, shown) => {
    const t = text.trim();
    if (!t) return;
    push({ from: 'me', text: shown || t });
    setTyping(true);
    const r = answer(t, { view: viewRef.current, blurb: blurbRef.current });
    later(() => {
      setTyping(false);
      if (r.clear) return setMsgs([]);
      if (r.quiet !== undefined) {
        setQuiet(r.quiet);
        sessionSet(KEY_QUIET, r.quiet ? '1' : '0');
      }
      push({ from: 'bot', text: r.text, actions: r.actions });
      if (r.auto >= 0 && r.actions[r.auto]) later(() => perform(r.actions[r.auto]), prefersReducedMotion() ? 0 : 250);
      if (r.close) {
        play('wave', 1500);
        later(() => setOpen(false), 700);
      }
    }, typingDelay());
  };
  useEffect(() => {
    api.current = { perform, send, say, play };
  });

  // ---- mở / đóng
  const openPanel = useCallback(() => {
    closeBubble();
    setOpen(true);
    setMsgs((l) => (l.length ? l : [{ id: nextId.current++, from: 'bot', text: HELLO.text, actions: HELLO.actions }]));
  }, [closeBubble]);
  const closePanel = useCallback((focusBack = true) => {
    setOpen(false);
    if (focusBack) bodyBtn.current?.focus({ preventScroll: true });
  }, []);
  const toggle = () => (openRef.current ? closePanel() : openPanel());

  useEffect(() => {
    if (open) later(() => inputEl.current?.focus({ preventScroll: true }), 60);
  }, [open]);
  useEffect(() => {
    const el = logEl.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing, open]);

  // phím ? gọi / đóng Clippy, Esc đóng
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && openRef.current) return closePanel();
      if (e.key === '?' && !(e.ctrlKey || e.metaKey || e.altKey) && !isTypingTarget(e.target)) {
        e.preventDefault();
        if (openRef.current) closePanel();
        else openPanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPanel, closePanel]);

  // cuộn: hiện nút lên đầu trang; tới đáy thì chủ động hỏi (mỗi trang một lần)
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const y = window.scrollY;
      setShowTop(y > TOP_AFTER);
      const doc = document.documentElement;
      const atBottom = y + window.innerHeight >= doc.scrollHeight - 40 && doc.scrollHeight > window.innerHeight * 1.6;
      if (atBottom && bottomShownFor.current !== viewRef.current && !quietRef.current && !openRef.current && !bubbleRef.current) {
        bottomShownFor.current = viewRef.current;
        api.current.say('You reached the bottom. Would you like to go back to the top?', [{ label: '↑ Back to top', type: 'top' }, { label: 'No thanks', type: 'dismiss' }], 12000);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // lời chào đầu phiên
  useEffect(() => {
    if (quietRef.current || sessionGet(KEY_HELLO) === '1') return undefined;
    const id = setTimeout(() => {
      if (openRef.current || quietRef.current) return;
      sessionSet(KEY_HELLO, '1');
      api.current.say(
        `It looks like you are visiting ${site.name}'s portfolio. Would you like help?`,
        [
          { label: 'Ask Clippy anything', type: 'open' },
          { label: 'Show me the projects', type: 'nav', view: 'projects' },
          { label: 'Be quiet please', type: 'quiet' },
        ],
        20000
      );
    }, 2200);
    return () => clearTimeout(id);
  }, []);

  // nhịp sống: chớp mắt; thỉnh thoảng một mẹo theo trang (khi không bận)
  useEffect(() => {
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
          if (quietRef.current || openRef.current || bubbleRef.current) return;
          const pool = [...TIPS[pageKey(viewRef.current)], ...TIPS.any];
          api.current.say(pool[tipIdx.current++ % pool.length], [{ label: 'Got it', type: 'dismiss' }]);
        },
        () => 70000 + Math.random() * 40000,
        { onResume: () => {} }
      ),
    ];
    return () => stops.forEach((s) => s());
  }, []);

  // cử chỉ ngẫu nhiên lúc rảnh (nhìn quanh, nhướn mày, vươn người, gõ kính); 40 giây không ai đụng tới thì ngủ gật (trước lúc screensaver phủ màn hình), có động tĩnh là tỉnh
  useEffect(() => {
    lastActive.current = Date.now();
    const wake = () => {
      lastActive.current = Date.now();
      if (sleepingRef.current) {
        setSleeping(false);
        api.current.play?.('stretch', 1200);
      }
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'scroll'];
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    const IDLE = ['look', 'brow', 'stretch', 'tap'];
    const stops = [
      pausableInterval(
        () => {
          if (sleepingRef.current || typingRef.current) return;
          api.current.play?.(IDLE[Math.floor(Math.random() * IDLE.length)], 1600);
        },
        () => 6000 + Math.random() * 7000,
        { onResume: () => {} }
      ),
      pausableInterval(
        () => {
          if (!openRef.current && !sleepingRef.current && Date.now() - lastActive.current > 40000) setSleeping(true);
        },
        5000,
        { onResume: () => {} }
      ),
    ];
    return () => {
      events.forEach((e) => window.removeEventListener(e, wake));
      stops.forEach((s) => s());
    };
  }, []);

  // Clippy nghe bus phản ứng của trang: giật mình khi lắc chuột, mừng khi bạn quay lại sau screensaver, mừng khi nhập Konami hay họp khẩn cấp
  useEffect(() => {
    const off = onReaction((name) => {
      const quietNow = quietRef.current || openRef.current || bubbleRef.current;
      const a = api.current;
      if (name === 'shake') {
        a.play?.('tap', 1500);
        if (!quietRef.current && !openRef.current) a.say?.('Whoa, easy there! My eyes are spinning.', [], 3000);
      } else if (name === 'konami') {
        a.play?.('happy', 1800);
        if (!quietRef.current) a.say?.('The Konami code! You have taste.', [], 4000);
      } else if (name === 'wake') {
        if (!quietNow && sleepingRef.current === false) a.say?.('Welcome back! I only dozed off a little.', [], 3500);
      } else if (name === 'meeting') {
        a.play?.('look', 1500);
        if (!quietNow) a.say?.('An emergency meeting? I was in the vents. I mean, the toolbox.', [], 4500);
      } else if (name === 'theme') {
        a.play?.('brow', 1300);
      }
    });
    return off;
  }, []);

  // mắt dõi theo con trỏ: ghi thẳng vào biến CSS, không render lại
  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return undefined;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = bodyBtn.current;
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
  }, []);

  const runAction = (a) => {
    if (a.type === 'dismiss') return closeBubble();
    if (a.type === 'open') return openPanel();
    if (a.type === 'quiet') {
      setQuiet(true);
      sessionSet(KEY_QUIET, '1');
      closeBubble();
      return undefined;
    }
    if (bubbleRef.current) closeBubble();
    return perform(a);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    sent.current.push(t);
    sentIdx.current = -1;
    setInput('');
    send(t);
  };
  const onInputKey = (e) => {
    const h = sent.current;
    if (e.key === 'ArrowUp' && h.length) {
      e.preventDefault();
      sentIdx.current = Math.min(sentIdx.current + 1, h.length - 1);
      setInput(h[h.length - 1 - sentIdx.current]);
    } else if (e.key === 'ArrowDown' && sentIdx.current >= 0) {
      e.preventDefault();
      sentIdx.current -= 1;
      setInput(sentIdx.current < 0 ? '' : h[h.length - 1 - sentIdx.current]);
    }
  };

  const chips = suggestionsFor(view);
  return (
    <div className={`assistant ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className={`assistant-top ${showTop ? 'is-shown' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: smooth() })}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}>
        <svg className="assistant-top-icon" viewBox="0 0 384 512" aria-hidden="true">
          <path
            fill="currentColor"
            d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"
          />
        </svg>
        <span className="assistant-top-label">Back to Top</span>
      </button>

      {open && (
        <div className="terminal assistant-panel bg-inset border border-line rounded-[10px] overflow-hidden" role="dialog" aria-label="Clippy, the site assistant">
          <div className="terminal-bar bg-panel px-3.5 py-2 flex items-center gap-2 border-b border-line">
            {['--danger', '--dot-yellow', '--dot-green'].map((v) => (
              <span key={v} className="assistant-dot w-[11px] h-[11px] rounded-full" style={{ background: `var(${v})` }} />
            ))}
            <span className="ml-2 font-mono text-xs text-dim">clippy@{site.host}: assistant</span>
            <button type="button" className="assistant-close ml-auto font-mono text-sm text-dim hover:text-amber" onClick={() => closePanel()} aria-label="Close assistant">
              ✕
            </button>
          </div>
          <div ref={logEl} className="assistant-log terminal-body scroll-amber" role="log" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`am am-${m.from}`}>
                <p>{m.text}</p>
                {m.actions?.length > 0 && (
                  <div className="am-actions">
                    {m.actions.map((a) => (
                      <button key={a.label} type="button" onClick={() => runAction(a)}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="am am-bot am-typing" aria-label="Clippy is typing">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>
          <div className="assistant-chips">
            {chips.map((c) => (
              <button key={c} type="button" disabled={typing} onClick={() => send(c)}>
                {c}
              </button>
            ))}
          </div>
          <form className="assistant-form" onSubmit={onSubmit}>
            <span className="assistant-prompt" aria-hidden="true">
              $
            </span>
            <input
              ref={inputEl}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Ask me anything..."
              aria-label="Ask Clippy"
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
            />
            <button type="submit" disabled={!input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      {!open && bubble && (
        <div className="assistant-bubble" role="status">
          <p>{bubble.text}</p>
          {bubble.actions.length > 0 && (
            <div className="assistant-actions">
              {bubble.actions.map((a) => (
                <button key={a.label} type="button" onClick={() => runAction(a)}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        ref={bodyBtn}
        className={`assistant-body ${wiggle ? 'is-wiggle' : ''}`}
        onClick={toggle}
        aria-expanded={open}
        aria-label="Clippy, the site assistant. Click to ask for help (shortcut: ?)"
        title="Ask Clippy (?)">
        <ClippyArt blink={blink} act={typing ? 'think' : act} sleeping={sleeping && !open} />
      </button>
    </div>
  );
}
