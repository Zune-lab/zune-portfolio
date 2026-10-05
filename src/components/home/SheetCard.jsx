import { useEffect, useState } from 'react';
import { role, location, mainStack, learning } from '../../data/profile.js';
import { isTypingTarget, spotMove } from '../../lib/dom.js';
import { vnClock } from '../../lib/vnTime.js';
import { cycleStatus, useStatus } from '../../lib/status.js';
import { isNapping, onNapChange } from '../../lib/nap.js';
import { friendship, isAsleep, levelOf, sayHi, unlock, useSocial } from '../../lib/social.js';

// Pin nhỏ nhưng đúng chất Zune: hướng nội, pin xã hội tụt khi bị "say hi", tự sạc lại theo thời gian.
// Trạng thái pin nằm ở lib/social.js (dùng chung với sâu chữ ở hero và lệnh `battery` trong terminal).
const CLASSES = [null, 'Bug Summoner', 'CSS Wizard', 'Tea Enjoyer', 'Introvert (lvl 99)']; // null = role thật
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
const CELLS = 10;

function Meter({ value, color, rainbow }) {
  const on = Math.round((value / 100) * CELLS);
  return (
    <div className={`flex gap-[3px] ${rainbow ? 'sheet-rainbow' : ''}`} role="img" aria-label={`${value}%`}>
      {Array.from({ length: CELLS }, (_, i) => (
        <span key={i} className="h-3 flex-1 rounded-[2px] transition-colors duration-300"
          style={{ background: i < on ? (rainbow ? `hsl(${i * 36} 85% 62%)` : color) : 'var(--line)' }} />
      ))}
    </div>
  );
}

const Row = ({ k, children }) => (
  <div className="grid grid-cols-[84px_1fr] gap-3">
    <span className="text-dim">{k}</span>
    <span className="text-ink">{children}</span>
  </div>
);

export default function SheetCard() {
  const status = useStatus();
  const { drain, months, maxed, reply } = useSocial();
  const [time, setTime] = useState(vnClock);
  const [cls, setCls] = useState(0);

  // đồng hồ 1 giây/lần: screensaver bật thì dừng hẳn (không render lại thẻ vô ích), dậy thì cập nhật ngay rồi chạy tiếp
  useEffect(() => {
    let t = 0;
    const run = () => {
      setTime(vnClock());
      t = window.setInterval(() => setTime(vnClock()), 1000);
    };
    const stop = () => {
      clearInterval(t);
      t = 0;
    };
    if (!isNapping()) t = window.setInterval(() => setTime(vnClock()), 1000);
    const off = onNapChange(() => (isNapping() ? stop() : !t && run()));
    return () => {
      stop();
      off();
    };
  }, []);

  // easter egg: Konami code -> 100% personality (cũng mở được bằng 6 lần bấm thanh personality hoặc lệnh `konami`)
  useEffect(() => {
    let seq = [];
    const onKey = (e) => {
      // Chrome autofill bắn keydown không có `key`; đang gõ trong ô nhập (vd feedback) thì không tính vào mã Konami
      if (typeof e.key !== 'string' || isTypingTarget(e.target)) return;
      seq = [...seq, e.key.toLowerCase()].slice(-KONAMI.length);
      if (seq.join() === KONAMI.join()) unlock('konami accepted. personality 100%. who let this happen?');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const level = levelOf({ drain, maxed }, status.key);
  const empty = isAsleep({ drain, maxed }, status.key);
  const color = level > 50 ? 'var(--green)' : level > 20 ? 'var(--amber)' : '#ff5f56';

  return (
    <aside onMouseMove={spotMove}
      className={`spot bg-inset border rounded-[10px] overflow-hidden font-mono text-[13px] transition-[border-color,box-shadow] duration-500 ${
        maxed ? 'border-amber shadow-[0_0_44px_-8px_var(--amber)]' : 'border-line shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]'
      }`}>
      <div className="bg-panel px-4 py-2.5 border-b border-line flex items-center justify-between">
        <span className="text-dim">{maxed ? 'zune.sav [MAX]' : 'zune.sav'}</span>
        <button type="button" onClick={cycleStatus} className="font-pixel text-[10px] flex items-center gap-2 cursor-pointer"
          style={{ color: status.color }} title="Click to change status (auto → busy → focus → offline). Saved on this device only.">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: status.color }} />
          {status.key}{status.isAuto && <span className="opacity-60">· auto</span>}
        </button>
      </div>

      <div className="p-4 grid gap-2 leading-relaxed">
        <Row k="class">
          <button type="button" onClick={() => setCls((c) => (c + 1) % CLASSES.length)} title="click to change class"
            className="text-left cursor-pointer hover:text-amber transition-colors">
            {CLASSES[cls] ?? role} <span className="text-dim">↻</span>
          </button>
        </Row>
        <Row k="location">{location} <span className="text-dim">· {time} GMT+7</span></Row>
        <Row k="main quest">{mainStack}</Row>
        <Row k="side quest">{learning}</Row>

        <div className="mt-2 grid gap-1.5">
          <div className="flex justify-between"><span className="text-dim">social battery</span><span style={{ color }}>{level}%</span></div>
          <Meter value={level} color={color} rainbow={maxed} />
        </div>
        <div role="button" tabIndex={0} onClick={friendship} onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Space không cuộn trang
            friendship();
          }
        }}
          title="???" className="grid gap-1.5 cursor-pointer select-none">
          <div className="flex justify-between"><span className="text-dim">personality unlocked</span><span className="text-amber">{maxed ? 100 : 12 + months}%</span></div>
          <Meter value={maxed ? 100 : 12 + months} color="var(--amber)" rainbow={maxed} />
          <span className="text-dim text-[12px]">// needs 6+ months of friendship</span>
        </div>

        <div className="flex items-start gap-3 mt-2">
          <button type="button" onClick={sayHi} disabled={empty}
            className="px-3 py-1.5 border border-line rounded-sm text-ink hover:border-amber hover:text-amber disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink transition-colors cursor-pointer disabled:cursor-not-allowed">
            $ say hi
          </button>
          <span className="text-dim text-[12.5px] leading-snug pt-1.5 min-h-[2.8em] min-w-0 flex-1" aria-live="polite">{reply}</span>
        </div>
      </div>
    </aside>
  );
}
