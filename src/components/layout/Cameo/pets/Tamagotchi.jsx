import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storageKey } from '../../../../config/site.js';
import { prefersReducedMotion } from '../../../../lib/env.js';
import { storageGet, storageSet } from '../../../../lib/storage.js';
import { pausableInterval } from '../../../../lib/timers.js';
import { PixelRects } from '../shared/Pixels.jsx';
import useBubble from '../shared/useBubble.js';
import useScrollFx from '../shared/useScrollFx.js';
import useTimer from '../../../../lib/useTimer.js';
import './Tamagotchi.css';

// Zunagotchi: thú cưng nuôi trong quả trứng cầm tay (skin gameboy). Cho ăn, chơi, dọn phân; chăm đủ thì lớn lên.
// Trạng thái lưu ở localStorage; lúc bạn vắng mặt nó vẫn đói dần, nhưng không bao giờ chết.
const KEY = storageKey('pet');
const KEY_OPEN = storageKey('pet-open');
const LCD = { bg: '#9bbc0f', light: '#8bac0f', mid: '#306230', dark: '#0f380f' };
const COLORS = { D: LCD.dark, M: LCD.mid, L: LCD.light };

// sprite từng giai đoạn: D viền / mắt, M thân, L vùng sáng. eyes + mouth là toạ độ để vẽ biểu cảm lên trên
const STAGES = [
  {
    name: 'baby',
    rows: ['...DDDD...', '..DMMMMD..', '.DMMMMMMD.', '.DMMMMMMD.', '.DMMMMMMD.', '.DMMMMMMD.', '..DMMMMD..', '...D..D...'],
    eyes: [[3, 3], [6, 3]],
    mouth: [4, 5],
  },
  {
    name: 'kid',
    rows: ['.DD......DD.', '.DMD....DMD.', '..DDDDDDDD..', '.DMMMMMMMMD.', '.DMMMMMMMMD.', '.DMMMMMMMMD.', '.DMMMMMMMMD.', '..DMMMMMMD..', '..DMD..DMD..', '..DD....DD..'],
    eyes: [[3, 4], [8, 4]],
    mouth: [5, 6],
  },
  {
    name: 'adult',
    rows: ['.....DDDD.....', '....DLLLLD....', '..DDDDDDDDDD..', '.DMMMMMMMMMMD.', '.DMMMMMMMMMMD.', '.DMMMMMMMMMMD.', '.DMMMLLLLMMMD.', '.DMMMLLLLMMMD.', '..DMMMMMMMMD..', '..DMD....DMD..', '..DDD....DDD..'],
    eyes: [[4, 4], [9, 4]],
    mouth: [6, 5],
  },
];
const MOUTHS = {
  neutral: [[0, 0], [1, 0]],
  smile: [[-1, -1], [0, 0], [1, 0], [2, -1]],
  open: [[0, 0], [1, 0], [0, 1], [1, 1]],
  sad: [[-1, 1], [0, 0], [1, 0], [2, 1]],
};
const HEART = ['.D.D.', 'DDDDD', 'DDDDD', '.DDD.', '..D..'];
const HEART_EMPTY = ['.D.D.', 'D.D.D', 'D...D', '.D.D.', '..D..'];
const APPLE = ['..D..', '.DDD.', 'DMMMD', 'DMMMD', '.DDD.'];
const BALL = ['.DDD.', 'DMLMD', 'DLMMD', 'DMMMD', '.DDD.'];
const POOP = ['..D..', '.DMD.', '.DMMD', 'DMMMD', 'DDDDD'];
const ZZ = ['DDDD', '..D.', '.D..', 'DDDD'];

const stageOf = (xp) => (xp >= 24 ? 2 : xp >= 9 ? 1 : 0);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function load() {
  const fresh = { food: 2, joy: 2, mess: 0, xp: 0, t: Date.now() };
  try {
    const s = JSON.parse(storageGet(KEY) || 'null');
    if (!s) return fresh;
    const mins = Math.max(0, (Date.now() - (s.t || Date.now())) / 60000);
    // lúc vắng mặt: đói dần (cứ 4 phút mất 1 tim), buồn dần (6 phút), thải phân (10 phút), nhưng luôn còn một chút để không "chết"
    return {
      xp: s.xp || 0,
      food: clamp((s.food ?? 2) - Math.floor(mins / 4), 0, 3),
      joy: clamp((s.joy ?? 2) - Math.floor(mins / 6), 0, 3),
      mess: clamp((s.mess || 0) + Math.floor(mins / 10), 0, 2),
      t: Date.now(),
    };
  } catch {
    return fresh;
  }
}

function sprite(stage, eyes, mouth) {
  const def = STAGES[stage];
  const g = def.rows.map((r) => r.split(''));
  def.eyes.forEach(([x, y]) => {
    if (eyes === 'open') g[y][x] = 'D';
    else {
      g[y][x] = 'M';
      g[y + 1][x] = 'D';
    }
  });
  const [mx, my] = def.mouth;
  MOUTHS[mouth].forEach(([dx, dy]) => (g[my + dy][mx + dx] = 'D'));
  return g.map((r) => r.join(''));
}

function Meter({ x, icon, value }) {
  return (
    <g transform={`translate(${x} 1)`}>
      <PixelRects rows={icon} colors={COLORS} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={6 + i * 4} y={1} width={3} height={3} fill={i < value ? LCD.dark : LCD.light} stroke="none" />
      ))}
    </g>
  );
}

export default function Tamagotchi() {
  const [st, setSt] = useState(load);
  const [open, setOpen] = useState(() => {
    const saved = storageGet(KEY_OPEN);
    return saved === '1'; // lần đầu vào: chỉ hiện quả trứng nhỏ, bấm vào mới mở ra cho đỡ che nội dung
  });
  const [act, setAct] = useState(null); // hành động đang diễn: { kind, n, len, done }
  const [bob, setBob] = useState(0);
  const [dx, setDx] = useState(0);
  const [blink, setBlink] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const touched = useRef(0); // lần cuối có người đụng tới (ms); ghi lúc mount, không gọi Date.now() khi render
  const { text, say } = useBubble();
  // cuộn trang quá nhanh thì chóng mặt: mặt quả trứng thành @_@, đang mở thì kêu lên (nghỉ 6 giây giữa hai lần)
  const [dizzy, setDizzy] = useState(false);
  const dizzyTimer = useTimer();
  const dizzyCool = useRef(0);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useScrollFx(({ vel }) => {
    if (Math.abs(vel) < 2400 || performance.now() < dizzyCool.current) return;
    dizzyCool.current = performance.now() + 6000;
    setDizzy(true);
    if (openRef.current) say(['whoa... too fast', 'the room is spinning', 'stop scrolling... @_@'][Math.floor(Math.random() * 3)], 2200);
    dizzyTimer.set(() => setDizzy(false), 2200);
  });
  const stRef = useRef(st);
  const stage = stageOf(st.xp);

  useEffect(() => {
    stRef.current = st;
    storageSet(KEY, JSON.stringify(st));
  }, [st]);
  const toggleOpen = () => {
    setOpen((o) => {
      storageSet(KEY_OPEN, o ? '0' : '1');
      return !o;
    });
  };

  // nhịp sống: nhún nhảy, đi qua lại, chớp mắt (đều dừng khi tab ẩn / screensaver)
  useEffect(() => {
    if (!open) return undefined;
    touched.current = Date.now();
    const calm = prefersReducedMotion();
    const stops = [
      pausableInterval(() => setBob((b) => 1 - b), 650, { onResume: () => {} }),
      pausableInterval(
        () => {
          if (!calm) setDx((d) => clamp(d + (Math.random() < 0.5 ? -2 : 2), -6, 6));
        },
        2600,
        { onResume: () => {} }
      ),
      pausableInterval(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 180);
        },
        () => 2500 + Math.random() * 3000,
        { onResume: () => {} }
      ),
      // đói / buồn / thải phân theo thời gian đang xem
      pausableInterval(
        () => {
          setSt((s) => ({
            ...s,
            food: clamp(s.food - (Math.random() < 0.55 ? 1 : 0), 0, 3),
            joy: clamp(s.joy - (Math.random() < 0.4 ? 1 : 0), 0, 3),
            mess: clamp(s.mess + (Math.random() < 0.3 ? 1 : 0), 0, 2),
          }));
        },
        75000,
        { onResume: () => {} }
      ),
      // không ai đụng tới một lúc thì ngủ gật
      pausableInterval(() => setAsleep(Date.now() - touched.current > 90000), 5000, { onResume: () => {} }),
    ];
    return () => stops.forEach((stop) => stop());
  }, [open]);

  // chạy từng khung của một hành động (mỗi khung 140ms), xong thì gọi done
  useEffect(() => {
    if (!act) return undefined;
    const id = setTimeout(() => {
      if (act.n + 1 >= act.len) {
        act.done?.();
        setAct(null);
      } else setAct({ ...act, n: act.n + 1 });
    }, 140);
    return () => clearTimeout(id);
  }, [act]);

  const start = useCallback((kind, len, done) => setAct({ kind, n: 0, len, done }), []);
  const wake = () => {
    touched.current = Date.now();
    setAsleep(false);
  };
  // cập nhật chỉ số (và điểm lớn lên); đủ điểm thì phát hoạt ảnh tiến hoá. Đọc state qua ref để không gọi hiệu ứng phụ trong updater.
  const update = (fn, xp = 0) => {
    const s = stRef.current;
    const next = { ...s, ...fn(s), xp: s.xp + xp };
    stRef.current = next;
    setSt(next);
    if (stageOf(next.xp) > stageOf(s.xp)) setTimeout(() => start('evolve', 10, () => say('i grew up!', 3200)), 500);
  };

  const feed = () => {
    wake();
    if (act) return;
    if (st.food >= 3) return say('i am full!');
    start('eat', 10, () => {
      update((s) => ({ food: clamp(s.food + 1, 0, 3) }), 2);
      say('nom nom!');
    });
  };
  const play = () => {
    wake();
    if (act) return;
    if (st.food === 0) return say('too hungry...');
    start('play', 12, () => {
      update((s) => ({ joy: clamp(s.joy + 1, 0, 3), food: clamp(s.food - (Math.random() < 0.3 ? 1 : 0), 0, 3) }), 3);
      say('wheee!');
    });
  };
  const clean = () => {
    wake();
    if (act) return;
    if (!st.mess) return say('all clean');
    start('clean', 9, () => {
      update((s) => ({ mess: 0, joy: clamp(s.joy + 1, 0, 3) }));
      say('sparkly~');
    });
  };
  const pat = () => {
    wake();
    if (act) return;
    start('pat', 7, () => update((s) => ({ joy: clamp(s.joy + (Math.random() < 0.5 ? 1 : 0), 0, 3) })));
    say(st.food === 0 ? 'feed me...' : 'hehe');
  };

  const sad = st.food === 0 || st.joy === 0 || st.mess > 0;
  const kind = act?.kind;
  const eating = kind === 'eat' && act.n >= 6;
  const happy = kind === 'play' || kind === 'pat' || (kind === 'eat' && act.n >= 6);
  const mouth = eating ? (act.n % 2 ? 'open' : 'neutral') : happy ? 'smile' : asleep ? 'neutral' : sad ? 'sad' : 'neutral';
  const eyes = asleep || blink ? 'closed' : 'open';
  const rows = useMemo(() => sprite(stage, eyes, mouth), [stage, eyes, mouth]);
  const h = rows.length;
  const w = rows[0].length;
  const hop = kind === 'play' ? (act.n % 2 ? -3 : 0) : kind === 'pat' ? (act.n % 2 ? -2 : 0) : asleep ? 0 : bob;
  const px = Math.round(18 - w / 2 + dx);
  const py = 24 - h - hop;
  const evolveFlash = kind === 'evolve' && act.n % 2 === 0;

  return (
    <div className={`tama ${open ? '' : 'tama-shut'}`} data-stage={STAGES[stage].name}>
      {!open && (
        <button type="button" className="tama-egg" onClick={toggleOpen} aria-label="open Zunagotchi, the virtual pet" title="Zunagotchi">
          <span aria-hidden="true">{dizzy ? '@_@' : sad ? '·︵·' : '·‿·'}</span>
        </button>
      )}
      {open && (
        <div className="tama-shell">
          <button type="button" className="tama-min" onClick={toggleOpen} aria-label="hide Zunagotchi" title="hide (back to egg)">
            ×
          </button>
          <div className="tama-brand">zunagotchi</div>
          <button type="button" className="tama-lcd" onClick={pat} aria-label={`pet the ${STAGES[stage].name}`}>
            <svg viewBox="0 0 36 26" width="100%" height="100%" shapeRendering="crispEdges" aria-hidden="true">
              <rect width="36" height="26" fill={LCD.bg} />
              <Meter x={1} icon={APPLE} value={st.food} />
              <Meter x={19} icon={sad ? HEART_EMPTY : HEART} value={st.joy} />
              <rect x="0" y="24" width="36" height="1" fill={LCD.dark} />
              <rect x="0" y="25" width="36" height="1" fill={LCD.mid} />
              <g transform={`translate(${px} ${py})`}>
                <PixelRects rows={rows} colors={COLORS} />
              </g>
              {Array.from({ length: st.mess }, (_, i) => (
                <g key={i} transform={`translate(${28 - i * 6 + (kind === 'clean' ? act.n * 4 : 0)} 19)`}>
                  <PixelRects rows={POOP} colors={COLORS} />
                </g>
              ))}
              {kind === 'eat' && act.n < 6 && (
                <g transform={`translate(${px + (w - 5) / 2} ${8 + act.n * 2.2})`}>
                  <PixelRects rows={APPLE} colors={COLORS} />
                </g>
              )}
              {kind === 'play' && (
                <g transform={`translate(${4 + act.n * 2.2} ${19 - Math.abs(Math.sin(act.n * 0.9)) * 11})`}>
                  <PixelRects rows={BALL} colors={COLORS} />
                </g>
              )}
              {kind === 'pat' && (
                <g transform={`translate(${px + w / 2 - 2} ${py - 4 - act.n})`}>
                  <PixelRects rows={HEART} colors={COLORS} />
                </g>
              )}
              {asleep && (
                <g transform="translate(27 9)">
                  <PixelRects rows={ZZ} colors={COLORS} />
                </g>
              )}
              {(asleep || evolveFlash) && <rect width="36" height="26" fill={LCD.dark} opacity={evolveFlash ? 0.85 : 0.22} />}
            </svg>
          </button>
          <div className="tama-btns">
            {[
              ['feed', feed, 'tama-b-feed'],
              ['play', play, 'tama-b-play'],
              ['clean', clean, 'tama-b-clean'],
            ].map(([label, fn, cls]) => (
              <button key={label} type="button" className={`tama-btn ${cls}`} onClick={fn} aria-label={label}>
                <span>{label}</span>
              </button>
            ))}
          </div>
          {text && (
            <div className="cameo-bubble tama-bubble" role="status">
              {text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
