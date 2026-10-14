import { useEffect, useRef } from 'react';
import { useLevel } from '../../../lib/social.js';
import { clamp } from '../../../lib/math.js';

// "Pin xã hội cạn dần khi bạn đọc": vạch tiến độ cuộn ở mép TRÊN, thay cho máy đo nhịp tim (ECG) cũ.
//  - vạch (đầu chấm sáng) = tiến độ cuộn; phần chưa đọc là đường chấm chấm mờ
//  - góc trái là pin xã hội của zune: SỐ HIỂN THỊ = pin thật (lib/social.js, cùng số với thẻ zune.sav, sâu chữ ở hero, lệnh
//    `battery`) × (1 - tiến độ cuộn). Ở đầu trang nó trùng khớp với thẻ sav; cuộn xuống thì cạn dần, tới đáy thì "rebooting…";
//    cuộn ngược lại thì "recharging…". Cuộn quá nhanh thì "overstimulated". Pin thật hết (đang ngủ) thì "asleep";
//    mở khoá personality 100% thì ô pin thành cầu vồng.
//  - screensaver (napping): "zzz · recharging"; họp khẩn cấp (panic): "EMERGENCY".
// Thuần DOM/CSS, KHÔNG có vòng rAF: chỉ cập nhật khi cuộn / đổi kích thước / pin đổi (nên đứng yên khi screensaver, và đổi theme
// không thể lệch pha như canvas). Chữ và ô pin chỉ ghi vào DOM khi giá trị thật sự đổi.

const CELLS = 10;
const FAST_PX_S = 2800; // cuộn nhanh hơn mức này (px/giây) thì "overstimulated"
const REVIVE_MS = 1400; // thời gian hiện "recharging…" sau khi cuộn ngược khỏi đáy
const wordFor = (n) => (n >= 80 ? 'chatty' : n >= 60 ? 'still talking' : n >= 40 ? 'small talk only' : n >= 20 ? 'running low' : 'needs a nap');

export default function Battery({ napping, panic }) {
  const level = useLevel();
  const root = useRef(null);
  const cellsEl = useRef(null);
  const pctEl = useRef(null);
  const wordEl = useRef(null);
  const live = useRef({ level, napping, panic });
  live.current = { level, napping, panic };
  const api = useRef(null);

  useEffect(() => {
    const el = root.current;
    let maxScroll = 0;
    let p = 0; // tiến độ cuộn 0..1
    let lastY = window.scrollY;
    let lastT = performance.now();
    let vel = 0; // vận tốc cuộn đã làm mượt (px/s)
    let wasFlat = false;
    let reviveUntil = 0;
    let raf = 0;
    let settleTimer = 0;
    let reviveTimer = 0;
    const shown = { on: -1, tone: '', rainbow: null, crit: null, pct: '', word: '' };

    // đo đoạn có thể cuộn: ép tính bố cục nên KHÔNG đọc mỗi lần cuộn, chỉ đo lại khi trang đổi kích thước
    const measure = () => {
      maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    };

    const render = () => {
      const { level: lv, napping: nap, panic: pan } = live.current;
      const maxed = lv >= 100;
      const asleep = lv <= 0;
      const n = maxed ? 100 : Math.round(lv * (1 - p));
      const flat = !maxed && !asleep && p >= 0.995;
      const now = performance.now();
      if (wasFlat && !flat) {
        reviveUntil = now + REVIVE_MS;
        clearTimeout(reviveTimer);
        reviveTimer = window.setTimeout(render, REVIVE_MS + 50);
      }
      wasFlat = flat;

      let word;
      if (pan) word = 'EMERGENCY';
      else if (nap) word = 'recharging';
      else if (maxed) word = 'personality overflow';
      else if (asleep) word = 'asleep';
      else if (flat) word = 'rebooting…';
      else if (now < reviveUntil) word = 'recharging…';
      else if (vel > FAST_PX_S) word = 'overstimulated';
      else word = wordFor(n);

      const tone = pan ? 'lo' : n > 50 ? 'hi' : n > 20 ? 'mid' : 'lo'; // cùng ngưỡng màu với thẻ zune.sav
      const on = Math.round((n / 100) * CELLS);
      const crit = tone === 'lo' && n <= 10 && !maxed;
      if (shown.tone !== tone) {
        el.dataset.tone = tone;
        shown.tone = tone;
      }
      if (shown.rainbow !== maxed) {
        el.toggleAttribute('data-rainbow', maxed);
        shown.rainbow = maxed;
      }
      if (shown.crit !== crit) {
        el.toggleAttribute('data-crit', crit);
        shown.crit = crit;
      }
      if (shown.on !== on) {
        shown.on = on;
        [...cellsEl.current.children].forEach((c, i) => c.classList.toggle('on', i < on));
      }
      const pct = nap && !pan ? 'zzz' : `${n}%`; // screensaver: "zzz · recharging" (không kèm số)
      const w = ` · ${word}`;
      if (shown.pct !== pct) {
        pctEl.current.textContent = pct;
        shown.pct = pct;
      }
      if (shown.word !== w) {
        wordEl.current.textContent = w;
        shown.word = w;
      }
    };
    const update = () => {
      raf = 0;
      const now = performance.now();
      const y = window.scrollY;
      const target = maxScroll > 40 ? clamp(y / maxScroll, 0, 1) : 0;
      vel = vel * 0.8 + ((Math.abs(y - lastY) / Math.max(1, now - lastT)) * 1000) * 0.2;
      lastY = y;
      lastT = now;
      if (target !== p) {
        p = target;
        el.style.setProperty('--p', p.toFixed(4));
      }
      render();
      // ngừng cuộn thì vận tốc về 0: vẽ lại một lần để bỏ chữ "overstimulated"
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        vel = 0;
        render();
      }, 380);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onSize = () => {
      measure();
      onScroll();
    };

    measure();
    update();
    api.current = render;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onSize);
    // trang đổi chiều cao (nội dung lazy-load, đổi route, mở/đóng mục): đo lại đoạn cuộn
    const ro = new ResizeObserver(onSize);
    ro.observe(document.body);
    ro.observe(document.documentElement);
    return () => {
      api.current = null;
      cancelAnimationFrame(raf);
      clearTimeout(settleTimer);
      clearTimeout(reviveTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onSize);
      ro.disconnect();
    };
  }, []);

  // pin thật đổi (say hi, sạc 1%/giây, mở khoá) hoặc đổi tâm trạng (nap / họp khẩn cấp): vẽ lại ngay
  useEffect(() => {
    api.current?.();
  }, [level, napping, panic]);

  return (
    <div ref={root} className="batt" data-tone="hi" aria-hidden="true">
      <div className="batt-line" />
      <div className="batt-fill" />
      <div className="batt-head" />
      <div className="batt-label">
        <span ref={cellsEl} className="batt-cells">
          {Array.from({ length: CELLS }, (_, i) => (
            <i key={i} style={{ '--i': i }} />
          ))}
        </span>
        <span>
          <b ref={pctEl} className="batt-pct" />
          <span ref={wordEl} />
        </span>
      </div>
    </div>
  );
}
