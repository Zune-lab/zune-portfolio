import { Suspense, useState } from 'react';
import '../../projects/Projects.css'; // chứa .art-center dùng chung cho mọi Art
import '../lab/Lab/LabFx.css'; // chuyển động của LabIcon
import './Chips.css';
import LabIcon from '../lab/Lab/LabIcon.jsx';
import { TECH_COLORS } from '../../config/tech.js';
import TechIcon from '../ui/TechIcon.jsx';
import SectionHead from '../ui/SectionHead.jsx';
import Terminal from './Terminal/Terminal.jsx';
import { featured, arts } from '../../projects/index.js';
import { LAB_ITEMS } from '../../config/lab-items.js';
import { gitLog, stack, aboutBlurb } from '../../data/profile.js';
import { site } from '../../config/site.js';
import PageLink from '../ui/PageLink.jsx';
import { spotMove } from '../../lib/dom.js';
import { canHover, prefersReducedMotion } from '../../lib/env.js';
import useTimer from '../../lib/useTimer.js';
import { WRAP } from '../../config/ui.js';

export function FeaturedProjects({ onNavigate }) {
  const list = featured;
  const [i, setI] = useState(0);
  const hoverT = useTimer();
  const scrollT = useTimer();
  const p = list[i];
  const hoverable = canHover();
  // chờ ~80ms trước khi đổi để lướt chuột ngang qua không làm preview chớp
  const pick = (n) => hoverT.set(() => setI(n), 80);

  if (!p) return null;

  return (
    <section id="featured" className="py-20 border-t border-line scroll-mt-14">
      <div className={WRAP}>
        <SectionHead num="01" title="projects/" />
        <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-8 md:gap-12 items-start">
          {/* mọi Art đều nằm sẵn, chỉ crossfade; cái không chọn thì tạm dừng animation cho nhẹ máy */}
          <a
            href={p.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${p.file}`}
            onMouseMove={spotMove}
            className="spot relative block h-[300px] rounded-[10px] overflow-hidden bg-panel border border-line"
          >
            {list.map((q, n) => {
              const Art = arts[q.file.replace(/\.[^.]+$/, '')];
              return (
                Art && (
                  <div
                    key={q.file}
                    aria-hidden="true"
                    style={{ color: q.color }}
                    className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-out ${
                      n === i ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.94] [&_*]:[animation-play-state:paused]'
                    }`}
                  >
                    <Suspense fallback={null}><Art /></Suspense>
                  </div>
                )
              );
            })}
            <span className="absolute bottom-3 left-4 font-mono text-[12px] text-dim">{p.file}</span>
          </a>

          <ul className="m-0 p-0 list-none border-b border-line">
            {list.map((q, n) => (
              <li key={q.file} className="border-t border-line relative scroll-mt-16">
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 h-full w-[2px] bg-amber origin-top transition-transform duration-500 ease-out ${
                    n === i ? 'scale-y-100' : 'scale-y-0'
                  }`}
                />
                <a
                  href={q.href}
                  target="_blank"
                  rel="noreferrer"
                  onMouseEnter={() => hoverable && pick(n)}
                  onFocus={(e) => e.currentTarget.matches(':focus-visible') && setI(n)}
                  onClick={(e) => {
                    if (hoverable) return;
                    // cảm ứng: chạm dòng chỉ để mở rộng/chọn; muốn mở repo thì chạm nút "open →" của dòng đang mở
                    if (n === i && e.target.closest('[data-open]')) return;
                    e.preventDefault();
                    if (n === i) return;
                    const row = e.currentTarget.closest('li');
                    setI(n);
                    // dòng cũ co lại làm dòng vừa chạm bị đẩy đi: đợi hết animation rồi kéo nó về tầm nhìn
                    scrollT.set(() => row?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }), 520);
                  }}
                  className={`block py-4 pl-4 font-mono transition-transform duration-500 ease-out ${n === i ? 'translate-x-1' : ''}`}
                >
                  <span className="flex items-baseline gap-3">
                    <span className="text-[12px] text-dim">{String(n + 1).padStart(2, '0')}</span>
                    <span className={`text-[15px] transition-colors duration-500 ${n === i ? 'text-amber' : 'text-ink'}`}>{q.file}</span>
                    <span className="feat-chev ml-auto pr-3" data-on={n === i || undefined} aria-hidden="true">›</span>
                  </span>
                  <span
                    className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
                      n === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <span className="block overflow-hidden min-h-0">
                      <span className="block mt-3 pl-8 text-[13px] leading-relaxed">
                        <span className="block text-dim font-sans">{q.desc}</span>
                        {q.facts?.map(([k, v]) => (
                          <span key={k} className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 mt-1.5">
                            <span className="text-dim">{k}</span>
                            <span className="text-ink break-words">{v}</span>
                          </span>
                        ))}
                        <span data-open className="feat-open">open →</span>
                      </span>
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10">
          <PageLink view="projects" onNavigate={onNavigate}>
            All projects →
          </PageLink>
        </div>
      </div>
    </section>
  );
}

export function AboutTeaser({ onNavigate }) {
  return (
    <section id="about-me" className="py-20 border-t border-line scroll-mt-14">
      <div className={WRAP}>
        <SectionHead num="02" title="about.js" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-ink text-lg leading-relaxed max-w-[460px]">
              {site.role} in {site.location}, {aboutBlurb}
            </p>
            <ul className="flex flex-wrap gap-2 mt-6 p-0 list-none">
              {stack.map((s) => (
                <li key={s} className="chip" style={TECH_COLORS[s] ? { '--c': TECH_COLORS[s] } : undefined}>
                  <TechIcon name={s} />
                  {s}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PageLink view="about" onNavigate={onNavigate}>
                More about me →
              </PageLink>
            </div>
          </div>
          <div className="bg-inset border border-line rounded-[10px] px-[22px] py-5 font-mono text-[13px] leading-[1.9]">
            <div className="text-dim mb-3">$ git log --oneline -5</div>
            <ol className="m-0 p-0 list-none">
              {gitLog.slice(-5).map((e) => (
                <li key={e.hash} className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_5rem_1fr] gap-x-3">
                  <span style={{ color: 'var(--amber)' }}>{e.hash}</span>
                  <span style={{ color: 'var(--green)' }}>{e.date}</span>
                  <span className="col-span-2 sm:col-span-1">{e.msg}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LabTeaser({ onNavigate }) {
  return (
    <section id="lab-teaser" className="py-20 border-t border-line scroll-mt-14">
      <div className={WRAP}>
        <SectionHead num="03" title="lab.css" />
        <p className="text-dim text-base max-w-[480px]">Tiny games and toys I build just to see if they work.</p>
        <ul className="flex flex-wrap gap-2.5 mt-6 p-0 list-none">
          {LAB_ITEMS.map((i) => (
            <li key={i.slug}>
              <PageLink
                view={`lab/${i.slug}`}
                onNavigate={onNavigate}
                className="chip tag-lab"
                data-kind={i.kind}
              >
                <LabIcon name={i.slug} size={16} />
                {i.file}
              </PageLink>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <PageLink view="lab" onNavigate={onNavigate}>
            Open the lab →
          </PageLink>
        </div>
      </div>
    </section>
  );
}

export function TerminalSection({ onNavigate }) {
  return (
    <section id="terminal" className="py-20 border-t border-line scroll-mt-14">
      <div className={WRAP}>
        <p className="font-mono text-[12.5px] text-dim mb-5">// type a command, or just click a question below</p>
        <Terminal onNavigate={onNavigate} />
      </div>
    </section>
  );
}
