import { useEffect, useRef, useState } from 'react';
import { PAGES } from '../../../config/pages.js';
import { stack, role, location } from '../../../data/profile.js';
import { useStatus } from '../../../lib/status.js';
import './Terminal.css';

// mỗi đoạn text chỉ khai báo 1 lần, INTRO / FILES / lệnh dùng chung
const WHOAMI = `zune - ${role.toLowerCase()}, ${location}`;
const MOOD = 'chillax guys. code for fun, ship small weird things.';

// the status line follows the badge in the Hero (same shared store), so the two never contradict each other
const introLines = (statusBlurb) => [
  { cmd: 'whoami', out: WHOAMI },
  { cmd: 'cat mood.txt', out: MOOD },
  { cmd: 'echo $STATUS', out: `${statusBlurb} - type help to play around` },
];

const FILES = {
  'mood.txt': MOOD,
  'tea.txt': 'tea > coffee. always.',
  'stack.txt': stack.join('  '), // lấy từ data/profile.js, không giữ bản thứ hai
};
const TABS = PAGES.map((p) => p.id); // các trang riêng, khai báo ở src/config/pages.js

function exec(raw, { onNavigate, clear }) {
  const [cmd = '', ...args] = raw.trim().split(/\s+/);
  const arg = args.join(' ');
  const dir = arg.replace('/', '');
  switch (cmd) {
    case '':
      return [];
    case 'help':
      return [`help | ls | cat <file> | cd <${TABS.join('|')}> | whoami | date | clear`, 'try: sudo hire zune'];
    case 'whoami':
      return [WHOAMI];
    case 'ls':
      return [Object.keys(FILES).join('  ') + TABS.map((t) => `  ${t}/`).join('')];
    case 'cat':
      return [Object.prototype.hasOwnProperty.call(FILES, arg) ? FILES[arg] : `cat: ${arg || '?'}: No such file or directory`];
    case 'cd':
      if (TABS.includes(dir)) {
        onNavigate?.(dir);
        return [`-> ${dir}/`];
      }
      return [`cd: ${arg || '?'}: No such file or directory`];
    case 'date':
      return [new Date().toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' })];
    case 'sudo':
      return /^hire\s+zune$/.test(arg)
        ? ['[sudo] password for you: ********', 'permission granted - message me in the socials section!']
        : ['sudo: you are not in the sudoers file. this incident will be reported.'];
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

  useEffect(() => {
    let cancelled = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
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
  }, []);

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
    const raw = value;
    if (raw.trim()) history.current.push(raw);
    hIdx.current = -1;
    setText('');
    let cleared = false;
    const out = exec(raw, { onNavigate, clear: () => (cleared = true) });
    if (cleared) return setLines([]);
    setLines((l) => [...l, { t: 'cmd', text: raw }, ...out.map((text) => ({ t: 'out', text }))].slice(-200));
  };

  const onKeyDown = (e) => {
    const h = history.current;
    if (e.key === 'ArrowUp' && h.length) {
      e.preventDefault();
      hIdx.current = Math.min(hIdx.current + 1, h.length - 1);
      setText(h[h.length - 1 - hIdx.current]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hIdx.current = Math.max(hIdx.current - 1, -1);
      setText(hIdx.current === -1 ? '' : h[h.length - 1 - hIdx.current]);
    }
  };

  const typing = !ready;
  const lastIsCmd = lines.length > 0 && lines[lines.length - 1].t === 'cmd';
  const at = value[pos] ?? ' ';

  return (
    <div className="terminal bg-inset border border-line rounded-[10px] overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
      <div className="terminal-bar bg-panel px-3.5 py-2.5 flex items-center gap-2 border-b border-line">
        <span className="w-[11px] h-[11px] rounded-full" style={{ background: '#FF5F57' }} />
        <span className="w-[11px] h-[11px] rounded-full" style={{ background: '#FEBC2E' }} />
        <span className="w-[11px] h-[11px] rounded-full" style={{ background: '#28C840' }} />
        <span className="ml-2 font-mono text-xs text-dim">zune@hcmc: ~</span>
      </div>
      <div
        ref={bodyRef}
        onClick={() => ready && inputRef.current?.focus({ preventScroll: true })}
        className="terminal-body px-5 py-[22px] font-mono text-[13.5px] h-[260px] overflow-y-auto whitespace-pre-wrap text-ink"
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
                className="absolute inset-0 w-full h-full opacity-0 cursor-text bg-transparent outline-none"
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
