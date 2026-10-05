import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import SectionHead from '../components/ui/SectionHead.jsx';
import { projects, arts, tags } from './index.js';
import { WRAP } from '../config/ui.js';
import { BASE } from '../lib/paths.js';
import { canHover, prefersReducedMotion } from '../lib/env.js';
import './Projects.css';

// Trang projects = một cái máy chơi game + kệ băng:
//  - phía trên: "máy" gồm màn hình CRT (Art hoặc ảnh chụp) và bảng thông tin (đoạn code mô tả + nút mở repo)
//  - phía dưới: kệ băng, mỗi project là một cartridge; bấm để nạp vào máy, mũi tên trái/phải để đổi băng
// Dữ liệu vẫn đọc từ src/projects/<tên>/meta.js như cũ ({ file, desc, color, href, facts?, shot? }).

const slugOf = (p) => p.file.replace(/\.[^.]+$/, '');
const extOf = (p) => p.file.slice(p.file.lastIndexOf('.'));
const repoPathOf = (p) => new URL(p.href).pathname.replace(/^\//, '');
// Project có bật GitHub Pages không? Hỏi API công khai (có CORS, trả `has_pages`) chứ không gọi thẳng trang .github.io:
// trang 404 của GitHub Pages không có header CORS nên trình duyệt chặn và báo lỗi đỏ trong console.
// Kết quả cache trong sessionStorage vì API giới hạn 60 lượt/giờ/IP.
const checkPages = async (p, signal) => {
  const repo = repoPathOf(p);
  const key = `pages:${repo}`;
  try {
    const hit = sessionStorage.getItem(key);
    if (hit) return hit;
  } catch {
    /* sessionStorage bị chặn: bỏ qua cache */
  }
  const r = await fetch(`https://api.github.com/repos/${repo}`, { signal, headers: { Accept: 'application/vnd.github+json' } });
  if (r.status === 404) return 'off'; // repo không tồn tại hoặc private
  if (!r.ok) return 'unknown'; // vd hết lượt rate limit: không kết luận
  const v = (await r.json()).has_pages ? 'live' : 'off';
  try {
    sessionStorage.setItem(key, v);
  } catch {
    /* bỏ qua */
  }
  return v;
};
// 'made with' -> madeWith, 'a-dumb-gift' -> aDumbGift (dùng làm tên khoá / tên biến trong đoạn code)
const camel = (s) => s.replace(/[^a-z0-9]+(.)?/gi, (_, c) => (c ? c.toUpperCase() : ''));

function Readout({ p }) {
  const rows = [...(p.facts ?? []), ['repo', repoPathOf(p)]];
  // --i = thứ tự dòng, CSS dùng để "gõ" từng dòng nối tiếp nhau mỗi lần mở file
  const line = (i) => ({ '--i': i });
  return (
    <div className="proj-code" role="group" aria-label={`Details of ${p.file}`}>
      <p className="c" style={line(0)}>{`// ${p.desc}`}</p>
      <p style={line(1)}>
        <span className="k">const</span> <span className="n">{camel(slugOf(p))}</span> {'= {'}
      </p>
      {rows.map(([label, value], i) => (
        <p key={label} className="i" style={line(i + 2)}>
          <span className="n">{camel(label)}</span>: <span className="s">{`'${value}'`}</span>,
        </p>
      ))}
      <p style={line(rows.length + 2)}>{'};'}</p>
    </div>
  );
}

// Chuột lướt trên khung preview: ánh sáng theo con trỏ (--mx/--my) + Art/chữ nền trôi ngược chiều nhau (--px/--py, -1..1).
// Ghi thẳng vào style của 1 phần tử (không qua state) nên không render lại React.
function stageMove(e) {
  if (!canHover() || prefersReducedMotion()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  el.style.setProperty('--mx', `${x}px`);
  el.style.setProperty('--my', `${y}px`);
  el.style.setProperty('--px', ((x / r.width) * 2 - 1).toFixed(3));
  el.style.setProperty('--py', ((y / r.height) * 2 - 1).toFixed(3));
}
function stageLeave(e) {
  e.currentTarget.style.setProperty('--px', '0');
  e.currentTarget.style.setProperty('--py', '0');
}

export default function Projects() {
  const [picked, setPicked] = useState(() => (typeof location === 'undefined' ? '' : location.hash.slice(1)));
  const [shotFor, setShotFor] = useState(null); // slug của project đang xem ảnh chụp thay vì Art
  const [brokenShots, setBrokenShots] = useState({});
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState({}); // slug -> 'live' | 'off' | 'unknown' (chưa có = đang dò)
  const [mode, setMode] = useState('shelf'); // 'shelf' (kệ băng) | 'ls' (danh sách gọn)
  const tabs = useRef({});
  const rail = useRef(null);

  // lọc như `ls projects/ | grep <q> --<tag>`: khớp tên, mô tả hoặc tag
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return projects.filter(
      (x) =>
        (!tag || x.tags?.includes(tag)) &&
        (!s || [x.file, x.desc, ...(x.tags ?? [])].join(' ').toLowerCase().includes(s)),
    );
  }, [q, tag]);

  const p = list.find((x) => slugOf(x) === picked) ?? list[0] ?? projects[0];
  const slug = p ? slugOf(p) : '';
  const at = list.findIndex((x) => slugOf(x) === slug);
  const Art = arts[slug];
  const st = status[slug];
  const hasShot = Boolean(p?.shot) && !brokenShots[slug];
  const showShot = hasShot && shotFor === slug;

  // đổi băng -> ghi vào #hash (F5 / gửi link vẫn giữ) và cuộn băng đó ra giữa kệ
  useEffect(() => {
    if (!slug) return;
    history.replaceState(history.state, '', `#${slug}`);
    const c = rail.current;
    const el = tabs.current[slug];
    if (c && el) {
      c.scrollTo({
        left: el.offsetLeft - (c.clientWidth - el.offsetWidth) / 2,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }, [slug, mode]);

  useEffect(() => {
    if (!p || status[slug]) return;
    let stale = false;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const done = (v) => !stale && setStatus((s) => ({ ...s, [slug]: v }));
    checkPages(p, ctl.signal)
      .then(done)
      .catch(() => done('unknown')) // mất mạng: không kết luận là tắt
      .finally(() => clearTimeout(timer));
    return () => {
      stale = true;
      clearTimeout(timer);
      ctl.abort();
    };
  }, [p, slug, status]);

  const move = (e, i) => {
    const last = list.length - 1;
    const to =
      { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: last }[e.key];
    if (to == null) return;
    e.preventDefault();
    const next = list[Math.min(last, Math.max(0, to))];
    setPicked(slugOf(next));
    tabs.current[slugOf(next)]?.focus();
  };
  const nudge = (d) => rail.current?.scrollBy({ left: d * rail.current.clientWidth * 0.8, behavior: 'smooth' });

  if (!p) {
    return (
      <section id="projects" className="py-20 border-t border-line">
        <div className={WRAP}>
          <SectionHead num="01" title="projects/" level={1} />
          <p className="proj-empty">{'// nothing here yet'}</p>
        </div>
      </section>
    );
  }

  const cart = (x, i) => {
    const k = slugOf(x);
    const common = {
      key: k,
      ref: (el) => {
        tabs.current[k] = el;
      },
      type: 'button',
      role: 'tab',
      id: `proj-tab-${k}`,
      'aria-label': x.file,
      'aria-selected': k === slug,
      'aria-controls': 'proj-panel',
      tabIndex: k === slug ? 0 : -1,
      style: { '--c': x.color },
      'data-off': status[k] === 'off' || undefined,
      onClick: () => setPicked(k),
      onKeyDown: (e) => move(e, i),
    };
    return mode === 'ls' ? (
      <button {...common} className="proj-row">
        <span className="proj-row-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        <span className="proj-row-f">{x.file}</span>
        <span className="proj-row-d">{x.desc}</span>
        <span className="proj-row-t" aria-hidden="true">{x.tags?.join(' ')}</span>
      </button>
    ) : (
      <button {...common} className="proj-cart">
        <span className="proj-cart-grip" aria-hidden="true" />
        <span className="proj-cart-label" aria-hidden="true">
          <span className="proj-cart-ext">{extOf(x)}</span>
          <span className="proj-cart-name">{k}</span>
        </span>
        <span className="proj-cart-pins" aria-hidden="true" />
      </button>
    );
  };

  return (
    <section id="projects" className="py-20 border-t border-line">
      <div className={WRAP}>
        <SectionHead num="01" title="projects/" level={1} />
        <p className="-mt-6 mb-8 text-dim text-[14px] max-w-[60ch]">
          Small things I built for fun. Grab a cartridge to load it.
        </p>

        <div id="proj-panel" role="tabpanel" aria-labelledby={`proj-tab-${slug}`} className="proj-console">
          <div key={slug} className="proj-console-body">
            <div className="proj-screen">
              <div className="proj-art" data-off={st === 'off' || undefined} style={{ color: p.color }} onPointerMove={stageMove} onPointerLeave={stageLeave}>
                {st === 'off' && (
                  <div className="proj-static" aria-hidden="true">
                    <span>NO SIGNAL</span>
                  </div>
                )}
                <div className="proj-crt">
                  {showShot ? (
                    <img
                      src={`${BASE}previews/${slug}.png`}
                      alt={`Screenshot of ${p.file}`}
                      className="proj-shot"
                      onError={() => setBrokenShots((b) => ({ ...b, [slug]: true }))}
                    />
                  ) : (
                    <>
                      {/* tên project khổng lồ làm nền: chỉ có nét viền, cỡ chữ tự co theo số ký tự để luôn vừa bề ngang */}
                      <span className="proj-ghost" style={{ '--n': slug.length }} aria-hidden="true">
                        {slug}
                      </span>
                      {Art && (
                        <div className="proj-art-inner" aria-hidden="true">
                          <Suspense fallback={null}><Art /></Suspense>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="proj-info">
              <div className="flex items-center justify-between gap-3 min-h-8">
                <span className="flex items-center gap-2.5 font-mono text-[13px] text-ink min-w-0">
                  <span
                    className="proj-led"
                    data-state={st === 'live' ? 'on' : st === 'off' ? 'off' : st ? 'idle' : 'check'}
                    title={st === 'live' ? 'live on GitHub Pages' : st === 'off' ? 'not deployed' : 'checking…'}
                    role="img"
                    aria-label={st === 'live' ? 'Deployed' : st === 'off' ? 'Not deployed' : 'Checking deployment'}
                  />
                  <span className="truncate">{p.file}</span>
                </span>
                {hasShot && (
                  <span className="proj-switch" role="group" aria-label="Preview type">
                    <button type="button" aria-pressed={!showShot} onClick={() => setShotFor(null)}>
                      art
                    </button>
                    <button type="button" aria-pressed={showShot} onClick={() => setShotFor(slug)}>
                      screenshot
                    </button>
                  </span>
                )}
              </div>
              <Readout p={p} />
              <a href={p.href} target="_blank" rel="noreferrer" className="proj-open">
                Open on GitHub
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </div>
        </div>

        <div className="proj-bar">
          <label className="proj-prompt">
            <span aria-hidden="true">$ ls projects/ | grep</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="…"
              aria-label="Filter projects"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <span className="proj-count" aria-live="polite">
            {String(at + 1).padStart(2, '0')}
            <i>/{String(list.length).padStart(2, '0')}</i>
          </span>
          {projects.length > 1 && (
            <span className="proj-switch" role="group" aria-label="Layout">
              <button type="button" aria-pressed={mode === 'shelf'} onClick={() => setMode('shelf')}>shelf</button>
              <button type="button" aria-pressed={mode === 'ls'} onClick={() => setMode('ls')}>ls</button>
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="proj-tags" role="group" aria-label="Filter by tag">
            {['', ...tags].map((t) => (
              <button key={t || 'all'} type="button" aria-pressed={tag === t} onClick={() => setTag(t)}>
                {t ? `--${t}` : '--all'}
              </button>
            ))}
          </div>
        )}

        {list.length === 0 ? (
          <p className="proj-empty">grep: no match. try another flag.</p>
        ) : mode === 'ls' ? (
          <div role="tablist" aria-label="Project list" className="proj-ls">{list.map(cart)}</div>
        ) : (
          <div className="proj-shelf">
            <button type="button" className="proj-nudge l" onClick={() => nudge(-1)} aria-label="Scroll left">‹</button>
            <div ref={rail} role="tablist" aria-label="Project cartridges" className="proj-cartridges">
              {list.map(cart)}
            </div>
            <button type="button" className="proj-nudge r" onClick={() => nudge(1)} aria-label="Scroll right">›</button>
            <div className="proj-board" aria-hidden="true" />
          </div>
        )}
        <p className="proj-hint">
          <kbd>←</kbd> <kbd>→</kbd> to swap cartridges
        </p>
      </div>
    </section>
  );
}
