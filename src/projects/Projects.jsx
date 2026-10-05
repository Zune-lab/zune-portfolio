import { useRef, useState } from 'react';
import SectionHead from '../components/ui/SectionHead.jsx';
import { projects, arts } from './index.js';
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
  const [picked, setPicked] = useState(slugOf(projects[0]));
  const [shotFor, setShotFor] = useState(null); // slug của project đang xem ảnh chụp thay vì Art
  const [brokenShots, setBrokenShots] = useState({});
  const tabs = useRef({});

  const p = projects.find((q) => slugOf(q) === picked) ?? projects[0];
  const slug = slugOf(p);
  const Art = arts[slug];
  const hasShot = Boolean(p.shot) && !brokenShots[slug];
  const showShot = hasShot && shotFor === slug;

  const move = (e, i) => {
    const last = projects.length - 1;
    const to =
      { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: last }[e.key];
    if (to == null) return;
    e.preventDefault();
    const next = projects[Math.min(last, Math.max(0, to))];
    setPicked(slugOf(next));
    tabs.current[slugOf(next)]?.focus();
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
              <div className="proj-art" style={{ color: p.color }} onPointerMove={stageMove} onPointerLeave={stageLeave}>
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
                          <Art />
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
                  <span className="proj-led" aria-hidden="true" />
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

        <div className="proj-shelf">
          <div role="tablist" aria-label="Project cartridges" className="proj-cartridges">
            {projects.map((q, i) => {
              const k = slugOf(q);
              return (
                <button
                  key={k}
                  ref={(el) => {
                    tabs.current[k] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`proj-tab-${k}`}
                  aria-label={q.file}
                  aria-selected={k === slug}
                  aria-controls="proj-panel"
                  tabIndex={k === slug ? 0 : -1}
                  className="proj-cart"
                  style={{ '--c': q.color }}
                  onClick={() => setPicked(k)}
                  onKeyDown={(e) => move(e, i)}
                >
                  <span className="proj-cart-grip" aria-hidden="true" />
                  <span className="proj-cart-label" aria-hidden="true">
                    <span className="proj-cart-ext">{extOf(q)}</span>
                    <span className="proj-cart-name">{k}</span>
                  </span>
                  <span className="proj-cart-pins" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <div className="proj-board" aria-hidden="true" />
        </div>
        <p className="proj-hint">
          <kbd>←</kbd> <kbd>→</kbd> to swap cartridges
        </p>
      </div>
    </section>
  );
}
