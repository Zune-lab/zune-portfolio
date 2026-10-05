import { useEffect, useRef, useState } from 'react';
import Pulse from './Pulse.jsx';
import { setNapState } from '../../../lib/nap.js';
import { prefersReducedMotion } from '../../../lib/env.js';
import { pick, randInt, TAU } from '../../../lib/math.js';
import './Alive.css';

// "Làm cả trang sống động": những chi tiết nhỏ nằm ngoài hero, gom về một chỗ, mỗi cái là một useEffect độc lập.
//  1) nhịp tim: vạch tiến độ cuộn ở mép trên là máy đo ECG (Pulse.jsx), cuộn nhanh thì tim đập nhanh, xuống đáy thì flatline
//  2) tab mood: chuyển sang tab khác thì tiêu đề tab đổi ("psst. still here."), quay lại thì chào "oh. hi again."
//  3) screensaver: ~45s không đụng gì thì một khối `zune.dev` nảy khắp màn hình kiểu logo DVD (đổi màu mỗi lần chạm mép,
//     trúng góc thì "corner!!"); động vào thì biến mất và chào "oh. hi." (giảm chuyển động: chỉ hiện dòng "napping" tĩnh)
//  4) click ra chữ/ký hiệu code: bấm vào chỗ trống (ngoài hero, ngoài nút/ô nhập/game) thì bung vài ký tự `{ } </> 0 1`
//  5) họp khẩn cấp: bật/tắt theme liên tục 4 lần trong ~4s thì "EMERGENCY MEETING" (Among Us)
// Tất cả tắt hoặc giảm khi người dùng bật "giảm chuyển động".

const NAP_MS = 45000;
const AWAY_TITLES = ['psst. still here.', 'come back :(', 'zune.dev misses you', 'did you leave?'];
const POP_CHARS = ['{', '}', '</>', '0', '1', ';', '*', '()', '=>'];
const POP_SKIP = 'a,button,input,textarea,select,label,canvas,summary,[role="button"],[contenteditable],.hero-full,.no-pop';

// screensaver kiểu logo DVD: khối `zune.dev` nảy khắp màn hình, đổi màu mỗi lần chạm mép, trúng đúng góc thì hô "corner!!"
const BOUNCE_COLORS = ['var(--amber)', '#7ee787', '#79c0ff', '#ff7b72', '#d2a8ff'];
function Bouncer() {
  const el = useRef(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const node = el.current;
    const bw = node.offsetWidth;
    const bh = node.offsetHeight;
    let x = Math.random() * Math.max(1, window.innerWidth - bw);
    let y = Math.random() * Math.max(1, window.innerHeight - bh);
    let vx = (Math.random() < 0.5 ? -1 : 1) * 150;
    let vy = (Math.random() < 0.5 ? -1 : 1) * 110;
    let c = 0;
    let last = 0;
    let raf = 0;
    let msgTimer = 0;
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      x += vx * dt;
      y += vy * dt;
      const mx = Math.max(0, window.innerWidth - bw);
      const my = Math.max(0, window.innerHeight - bh);
      let hx = false;
      let hy = false;
      if (x <= 0) {
        x = 0;
        vx = Math.abs(vx);
        hx = true;
      } else if (x >= mx) {
        x = mx;
        vx = -Math.abs(vx);
        hx = true;
      }
      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
        hy = true;
      } else if (y >= my) {
        y = my;
        vy = -Math.abs(vy);
        hy = true;
      }
      if (hx || hy) {
        c = (c + 1) % BOUNCE_COLORS.length;
        node.style.color = BOUNCE_COLORS[c];
      }
      if (hx && hy) {
        setMsg('corner!!');
        clearTimeout(msgTimer);
        msgTimer = window.setTimeout(() => setMsg(''), 1800);
      }
      node.style.transform = `translate(${x}px, ${y}px)`;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(msgTimer);
    };
  }, []);
  return (
    <div ref={el} className="bouncer" aria-hidden="true">
      zune.dev<i />
      {msg && <span className="bouncer-msg">{msg}</span>}
    </div>
  );
}

export default function Alive() {
  const [nap, setNap] = useState('awake'); // 'awake' | 'nap' | 'wake'
  const [meeting, setMeeting] = useState(false);

  // 2) tab mood
  useEffect(() => {
    let saved = null;
    let timer = 0;
    const onVis = () => {
      clearTimeout(timer);
      if (document.hidden) {
        if (saved === null) saved = document.title;
        document.title = pick(AWAY_TITLES);
      } else if (saved !== null) {
        document.title = 'oh. hi again.';
        const back = saved;
        saved = null;
        timer = window.setTimeout(() => {
          document.title = back;
        }, 1600);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearTimeout(timer);
    };
  }, []);

  // 3) không ai đụng vào trang: bật screensaver.
  // Không còn interval 1s thức dậy mãi mãi: chỉ hẹn MỘT timeout tới đúng lúc có thể hết NAP_MS, tới nơi mà còn người đụng thì hẹn lại phần còn thiếu.
  // Tab ẩn hoặc đang nap / wake thì không hẹn gì cả; quay lại tab hoặc dậy hẳn mới hẹn lại.
  useEffect(() => {
    let last = performance.now();
    let state = 'awake';
    let wakeTimer = 0;
    let idleTimer = 0;
    const arm = () => {
      clearTimeout(idleTimer);
      idleTimer = 0;
      if (state !== 'awake' || document.hidden) return;
      idleTimer = window.setTimeout(() => {
        idleTimer = 0;
        if (performance.now() - last >= NAP_MS) set('nap');
        else arm();
      }, Math.max(50, NAP_MS - (performance.now() - last)));
    };
    const set = (s) => {
      state = s;
      setNap(s);
      setNapState(s); // cho mọi nơi khác (CSS, canvas, timer, about.js) biết zune đang ngủ / vừa dậy
      arm();
    };
    const poke = () => {
      last = performance.now();
      if (state === 'nap') {
        set('wake');
        clearTimeout(wakeTimer);
        wakeTimer = window.setTimeout(() => set('awake'), 1700);
      }
    };
    // quay lại tab sau một lúc lâu: tính là vừa có người tới (trước đây `last` còn cũ nên screensaver bật ngay trong vòng 1 giây)
    const onVisible = () => {
      if (!document.hidden) last = performance.now();
      arm();
    };
    document.addEventListener('visibilitychange', onVisible);
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    arm();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(idleTimer);
      clearTimeout(wakeTimer);
      evs.forEach((e) => window.removeEventListener(e, poke));
      setNapState('awake');
    };
  }, []);

  // 4) bấm chỗ trống: bung ký tự code
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let live = 0;
    const onClick = (e) => {
      if (e.button !== 0 || e.target.closest(POP_SKIP) || window.getSelection()?.toString()) return;
      if (/\/lab\/[^/]+/.test(location.pathname) || live > 24) return; // trong game thì đừng làm rối
      const n = randInt(5, 7);
      for (let i = 0; i < n; i++) {
        const el = document.createElement('span');
        el.textContent = pick(POP_CHARS);
        el.setAttribute('aria-hidden', 'true');
        el.className = 'pop-char';
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
        document.body.appendChild(el);
        const a = (TAU * i) / n + Math.random() * 0.8 - 0.4;
        const d = 34 + Math.random() * 46;
        live++;
        const anim = el.animate(
          [
            { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d - 18}px)) scale(1)`, opacity: 1, offset: 0.55 },
            { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.1}px), calc(-50% + ${Math.sin(a) * d + 22}px)) scale(0.9)`, opacity: 0 },
          ],
          { duration: 750 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)' }
        );
        anim.onfinish = () => {
          el.remove();
          live--;
        };
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // 5) họp khẩn cấp: đổi theme 4 lần trong 4 giây
  useEffect(() => {
    const times = [];
    let cool = 0;
    let hide = 0;
    const mo = new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.oldValue === document.documentElement.dataset.theme) continue; // cùng giá trị (React ghi lại) không tính
        const now = performance.now();
        times.push(now);
        while (times.length && now - times[0] > 4000) times.shift();
        if (times.length >= 4 && now > cool) {
          cool = now + 12000;
          times.length = 0;
          setMeeting(true);
          clearTimeout(hide);
          hide = window.setTimeout(() => setMeeting(false), 3000);
        }
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'], attributeOldValue: true });
    return () => {
      mo.disconnect();
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    if (!meeting) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMeeting(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [meeting]);

  return (
    <>
      <Pulse napping={nap === 'nap'} panic={meeting} />
      <div className={`nap-dim${nap === 'nap' ? ' is-on' : ''}`} aria-hidden="true" />

      {nap === 'nap' &&
        (prefersReducedMotion() ? (
          <div className="nap-bubble" role="status">
            zune.dev is napping. wiggle the mouse.
          </div>
        ) : (
          <Bouncer />
        ))}
      {nap === 'wake' && (
        <div className="nap-bubble" role="status">
          oh. hi.
        </div>
      )}

      {meeting && (
        <div className="meeting" role="alertdialog" aria-label="Emergency meeting" onClick={() => setMeeting(false)}>
          <div className="meeting-box">
            <div className="meeting-title">EMERGENCY MEETING</div>
            <div className="meeting-sub">someone keeps flipping the lights. sus.</div>
            <div className="meeting-hint">click or press esc to vote</div>
          </div>
        </div>
      )}
    </>
  );
}
