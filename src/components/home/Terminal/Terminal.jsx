import { useEffect, useRef, useState } from 'react';
import { PAGES } from '../../../config/pages.js';
import { stack } from '../../../data/profile.js';
import { site } from '../../../config/site.js';
import { SKINS, SKIN_AUTO, isSkinId, lockedMode, skinById } from '../../../config/skins.js';
import { chooseSkin, getChoice, getSkin, isUnlocked } from '../../../lib/skin.js';
import { spotMove } from '../../../lib/dom.js';
import { has, motionSleep as sleep, prefersReducedMotion } from '../../../lib/env.js';
import { observeOnce } from '../../../lib/observe.js';
import { useStatus } from '../../../lib/status.js';
import { siteDateTime } from '../../../lib/siteTime.js';
import { BATTERY_CELLS, getSocial, levelOf, unlockKonami } from '../../../lib/social.js';
import './Terminal.css';

// mỗi đoạn text chỉ khai báo 1 lần, INTRO / FILES / lệnh dùng chung
const { id, role, location, content } = site;
const WHOAMI = `${id} - ${role.toLowerCase()}, ${location}`;
const MOOD = content.mood;
const HIRE = `hire ${id}`; // `sudo hire <id>`

// the status line follows the badge in the Hero (same shared store), so the two never contradict each other
const introLines = (statusBlurb) => [
  { cmd: 'whoami', out: WHOAMI },
  { cmd: 'cat mood.txt', out: MOOD },
  { cmd: 'echo $STATUS', out: `${statusBlurb} - type help to play around` },
];

const FILES = {
  'mood.txt': MOOD,
  'tea.txt': content.teaLine,
  'stack.txt': stack.join('  '), // lấy từ data/profile.js, không giữ bản thứ hai
};
const QUICK = [
  ['who are you?', 'whoami'],
  ['your mood?', 'cat mood.txt'],
  ['what do you use?', 'cat stack.txt'],
  ['show projects', 'cd projects'],
  ['can I hire you?', `sudo ${HIRE}`],
  ['surprise me', 'theme random'],
];
const TABS = PAGES.map((p) => p.id); // các trang riêng, khai báo ở src/config/pages.js

// `theme`: đổi skin của cả trang (cùng bảng chọn Ctrl+K). theme | theme list | theme set <tên> | theme <tên> | theme random | theme auto
const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));
const modeNote = (s) => (s.modes.length > 1 ? 'dark+light' : `${s.modes[0]} only`);
function themeCmd(arg) {
  const [first = '', ...rest] = arg.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!first) {
    const now = getChoice() === SKIN_AUTO ? `auto (${getSkin()})` : getSkin();
    return [`skin: ${now}`, 'theme list | theme set <name> | theme random | theme auto   (or press Ctrl+K)'];
  }
  if (first === 'list' || first === 'ls') {
    const cur = getChoice();
    const rows = [`${cur === SKIN_AUTO ? '*' : ' '} ${pad('auto', 13)}follows the time of day`];
    for (const s of SKINS) {
      const locked = s.unlock && !isUnlocked(s.id);
      rows.push(`${cur === s.id ? '*' : ' '} ${pad(s.id, 13)}${locked ? `[locked] ${s.unlock.hint}` : modeNote(s)}`);
    }
    return [rows.join('\n')];
  }
  if (first === 'random') {
    const pool = SKINS.filter((s) => isUnlocked(s.id) && s.id !== getSkin());
    const s = pool[Math.floor(Math.random() * pool.length)];
    chooseSkin(s.id);
    return [`-> ${s.id}`];
  }
  const target = (first === 'set' || first === 'use' ? rest : [first, ...rest]).join('-');
  if (!target) return ['theme: set what? try theme list'];
  if (target === SKIN_AUTO) {
    chooseSkin(SKIN_AUTO);
    return ['-> auto (changes with the time of day)'];
  }
  if (!isSkinId(target)) return [`theme: ${target}: no such skin - try theme list`];
  const s = skinById(target);
  if (!isUnlocked(target)) return [`theme: ${target} is locked - ${s.unlock.hint}`];
  chooseSkin(target);
  const lock = lockedMode(target);
  return [`-> ${target}${lock ? ` (${lock} only: the torch switch is locked)` : ''}`];
}

function exec(raw, { onNavigate, clear }) {
  const [cmd = '', ...args] = raw.trim().split(/\s+/);
  const arg = args.join(' ');
  const dir = arg.replace('/', '');
  switch (cmd) {
    case '':
      return [];
    case 'help':
      return [`help | ls | cat <file> | cd <${TABS.join('|')}> | whoami | date | battery | theme | clear`, `try: sudo ${HIRE}, or theme list`];
    case 'whoami':
      return [WHOAMI];
    case 'ls':
      return [Object.keys(FILES).join('  ') + TABS.map((t) => `  ${t}/`).join('')];
    case 'cat':
      return [has(FILES, arg) ? FILES[arg] : `cat: ${arg || '?'}: No such file or directory`];
    case 'cd':
      if (TABS.includes(dir)) {
        onNavigate?.(dir);
        return [`-> ${dir}/`];
      }
      return [`cd: ${arg || '?'}: No such file or directory`];
    case 'date':
      return [siteDateTime()];
    case 'theme':
    case 'skin':
      return themeCmd(arg);
    case 'sudo':
      return arg === HIRE
        ? ['[sudo] password for you: ********', 'permission granted - message me in the contact section!']
        : ['sudo: you are not in the sudoers file. this incident will be reported.'];
    case 'battery': {
      // cùng một pin với thẻ sav và con sâu ở hero
      const s = getSocial();
      const lv = levelOf(s);
      const on = Math.round((lv / 100) * BATTERY_CELLS);
      return [
        `social battery: ${lv}% [${'#'.repeat(on)}${'.'.repeat(BATTERY_CELLS - on)}]`,
        s.maxed
          ? 'personality overflow. please stand back.'
          : lv <= 0
            ? `${id} is asleep. zzz`
            : lv <= 20
              ? `running on fumes. maybe let ${id} rest.`
              : 'ok, still some words left.',
      ];
    }
    case 'konami':
      unlockKonami();
      return ['up up down down left right left right b a', `personality: 100%. scroll up and look at ${id}.sav`];
    case 'clear':
      clear();
      return [];
    default:
      return [`${cmd}: command not found - type help`];
  }
}

const Cursor = () => <span className="term-cursor">{'\u00a0'}</span>;
const Prompt = () => <span style={{ color: 'var(--green)' }}>$ </span>;

export default function Terminal({ onNavigate }) {
  const { blurb } = useStatus();
  const blurbRef = useRef(blurb); // read once when the intro starts; typing animation shouldn't restart on a status change
  blurbRef.current = blurb;
  const [lines, setLines] = useState([]);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState('');
  const [pos, setPos] = useState(0);
  const [focused, setFocused] = useState(false);
  const history = useRef([]);
  const hIdx = useRef(-1);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const [started, setStarted] = useState(false); // intro chỉ chạy khi terminal vào khung nhìn, không chạy lúc không ai thấy
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return observeOnce(wrapRef.current, () => setStarted(true), 0.4);
  }, []);

  useEffect(() => {
    if (!started) return undefined;
    let cancelled = false;
    const reduce = prefersReducedMotion();
    const INTRO = introLines(blurbRef.current);
    const buf = [];
    const flush = () => setLines([...buf]);

    (async () => {
      setReady(false);
      for (const s of INTRO) {
        buf.push({ t: 'cmd', text: reduce ? s.cmd : '' });
        flush();
        if (!reduce) {
          for (let i = 1; i <= s.cmd.length; i++) {
            await sleep(45);
            if (cancelled) return;
            buf[buf.length - 1].text = s.cmd.slice(0, i);
            flush();
          }
        }
        await sleep(250);
        if (cancelled) return;
        buf.push({ t: 'out', text: s.out });
        flush();
        await sleep(350);
        if (cancelled) return;
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [started]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines, value]);

  const setText = (v) => {
    setValue(v);
    setPos(v.length);
  };
  const syncPos = (e) => setPos(e.target.selectionStart ?? e.target.value.length);

  const submit = (e) => {
    e.preventDefault();
    if (busy) return; // nút "ask" đang tự gõ: run() sửa dòng cuối của `lines`, chen lệnh tay vào sẽ làm mất/lẫn dòng
    const raw = value;
    if (raw.trim()) history.current.push(raw);
    hIdx.current = -1;
    setText('');
    let cleared = false;
    const out = exec(raw, { onNavigate, clear: () => (cleared = true) });
    if (cleared) return setLines([]);
    setLines((l) => [...l, { t: 'cmd', text: raw }, ...out.map((text) => ({ t: 'out', text }))].slice(-200));
  };

  // bấm nút câu hỏi: lệnh tự gõ từng chữ rồi in kết quả, người xem không cần biết lệnh
  const run = async (cmd) => {
    if (!ready || busy) return;
    setBusy(true);
    setLines((l) => [...l, { t: 'cmd', text: '' }]);
    for (let i = 1; i <= cmd.length; i++) {
      await sleep(35);
      setLines((l) => [...l.slice(0, -1), { t: 'cmd', text: cmd.slice(0, i) }]);
    }
    await sleep(250);
    const out = exec(cmd, { onNavigate, clear: () => {} });
    setLines((l) => [...l, ...out.map((text) => ({ t: 'out', text }))].slice(-200));
    setBusy(false);
  };

  const onKeyDown = (e) => {
    const h = history.current;
    if (e.key === 'ArrowUp' && h.length) {
      e.preventDefault();
      hIdx.current = Math.min(hIdx.current + 1, h.length - 1);
      setText(h[h.length - 1 - hIdx.current]);
    } else if (e.key === 'ArrowDown' && hIdx.current >= 0) {
      // chỉ khi đang duyệt lịch sử: nếu không, ↓ lúc đang gõ dở sẽ xoá sạch dòng lệnh
      e.preventDefault();
      hIdx.current = Math.max(hIdx.current - 1, -1);
      setText(hIdx.current === -1 ? '' : h[h.length - 1 - hIdx.current]);
    }
  };

  const typing = !ready;
  const lastIsCmd = lines.length > 0 && lines[lines.length - 1].t === 'cmd';
  const at = value[pos] ?? ' ';

  return (
    <div ref={wrapRef} onMouseMove={spotMove} className="spot terminal bg-inset border border-line rounded-[10px] overflow-hidden shadow-[0_20px_60px_-20px_rgb(var(--shade)/calc(0.6_*_var(--shade-k)))]">
      <div className="terminal-bar bg-panel px-3.5 py-2.5 flex items-center gap-2 border-b border-line">
        {['--danger', '--dot-yellow', '--dot-green'].map((v) => (
          <span key={v} className="w-[11px] h-[11px] rounded-full" style={{ background: `var(${v})` }} />
        ))}
        <span className="ml-2 font-mono text-xs text-dim">{id}@{site.host}: ~</span>
      </div>
      <div
        ref={bodyRef}
        onClick={() => ready && inputRef.current?.focus({ preventScroll: true })}
        className="terminal-body scroll-amber px-5 py-[22px] font-mono text-[13.5px] h-[260px] overflow-y-auto whitespace-pre-wrap text-ink"
      >
        {lines.map((line, i) => (
          <div key={i} className={line.t === 'out' ? 'text-dim mb-2' : ''}>
            {line.t === 'cmd' && <Prompt />}
            {line.text}
            {typing && i === lines.length - 1 && line.t === 'cmd' && <Cursor />}
          </div>
        ))}
        {typing && !lastIsCmd && (
          <div>
            <Prompt />
            <Cursor />
          </div>
        )}
        {ready && (
          <form onSubmit={submit} className="flex items-start">
            <Prompt />
            <div className="relative flex-1 min-w-0 min-h-[1.5em]">
              <span aria-hidden="true" className="whitespace-pre-wrap break-all">
                {value.slice(0, pos)}
                <span key={`${value}|${pos}`} className={`term-cursor${focused ? '' : ' is-idle'}`}>
                  {at === ' ' ? '\u00a0' : at}
                </span>
                {value.slice(pos + 1)}
              </span>
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  syncPos(e);
                }}
                onKeyDown={onKeyDown}
                onKeyUp={syncPos}
                onClick={syncPos}
                onSelect={syncPos}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                spellCheck={false}
                autoComplete="off"
                aria-label="terminal input"
                className="absolute inset-0 w-full h-full opacity-0 cursor-text bg-transparent outline-hidden"
              />
            </div>
          </form>
        )}
      </div>
      <div className="px-5 py-3 border-t border-line flex flex-wrap items-center gap-2 font-mono text-[12px] min-h-[52px]">
        {ready && (
          <>
            <span className="text-dim mr-1">ask:</span>
            {QUICK.map(([label, cmd]) => (
              <button
                key={cmd}
                type="button"
                disabled={busy}
                onClick={() => run(cmd)}
                className="px-2.5 py-1 border border-line rounded-sm text-dim hover:text-amber hover:border-amber-dim disabled:opacity-50 transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
