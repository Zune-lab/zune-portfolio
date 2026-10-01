import { Suspense, useState } from 'react';
import SectionHead from '../SectionHead.jsx';
import { LAB_ITEMS, LAB_KINDS, labItemOf } from '../../lab-items.js';
import { pathOf } from '../../lib/paths.js';
import './Lab.css';

// bấm thường -> chuyển view trong app; giữ Ctrl/Cmd/Shift/Alt hoặc chuột giữa -> để trình duyệt mở tab mới
const isPlainClick = (e) => e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);

const chip = (on) =>
  `lab-cell px-3 py-1 rounded-md border font-mono text-[12.5px] ${
    on ? 'border-amber text-ink' : 'border-line text-dim hover:border-amber-dim'
  }`;
const btn =
  'lab-cell px-3.5 py-1.5 rounded-md border border-line hover:border-amber text-ink font-mono text-[13px]';

function Link({ slug, onNavigate, className, children, ...rest }) {
  const view = slug ? `lab/${slug}` : 'lab';
  return (
    <a
      href={pathOf(view)}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        onNavigate?.(view);
      }}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}

// lưới thẻ: bộ lọc theo nhãn + nút random. `kind` nằm ở Lab (không phải ở đây) để mở 1 mục rồi bấm Back vẫn giữ bộ lọc
function LabGrid({ kind, setKind, onNavigate }) {
  const items = kind === 'all' ? LAB_ITEMS : LAB_ITEMS.filter((i) => i.kind === kind);
  const random = () => {
    const pool = items.length ? items : LAB_ITEMS;
    onNavigate?.(`lab/${pool[Math.floor(Math.random() * pool.length)].slug}`);
  };

  return (
    <>
      <p className="font-mono text-[12.5px] text-dim -mt-6 mb-6">
        // {LAB_ITEMS.length} things to poke at: pick one, only that one runs
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {['all', ...LAB_KINDS].map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={chip(kind === k)}>
            {k}
            <span className="text-dim ml-1.5">
              {k === 'all' ? LAB_ITEMS.length : LAB_ITEMS.filter((i) => i.kind === k).length}
            </span>
          </button>
        ))}
        <button type="button" onClick={random} className={`${btn} ml-auto`}>
          random ↯
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <Link
            key={i.slug}
            slug={i.slug}
            onNavigate={onNavigate}
            className="lab-cell group block p-4 rounded-[10px] border border-line hover:border-amber"
            style={{ background: 'var(--panel)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[26px] leading-none" aria-hidden="true">
                {i.icon}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-dim border border-line rounded px-1.5 py-0.5">
                {i.kind}
              </span>
            </div>
            <div className="font-mono font-bold text-[14px] text-ink group-hover:text-amber">{i.name}</div>
            <div className="font-mono text-[12px] text-dim mb-2">{i.file}</div>
            <p className="text-[13px] text-dim leading-snug">{i.blurb}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

// 1 mục đang mở: chỉ mục này được tải (lazy) và chạy
function LabItem({ item, onNavigate }) {
  const idx = LAB_ITEMS.indexOf(item);
  const prev = LAB_ITEMS[(idx - 1 + LAB_ITEMS.length) % LAB_ITEMS.length];
  const next = LAB_ITEMS[(idx + 1) % LAB_ITEMS.length];
  const random = () => {
    const pool = LAB_ITEMS.filter((i) => i !== item);
    onNavigate?.(`lab/${pool[Math.floor(Math.random() * pool.length)].slug}`);
  };
  const { Component } = item;
  const framed = item.frame;

  return (
    <>
      <nav aria-label="Lab" className="flex flex-wrap items-center gap-2 -mt-6 mb-8 font-mono text-[13px]">
        <Link slug={null} onNavigate={onNavigate} className={btn}>
          ← all games
        </Link>
        <Link slug={prev.slug} onNavigate={onNavigate} className={btn} rel="prev" title={prev.file}>
          ‹ prev
        </Link>
        <Link slug={next.slug} onNavigate={onNavigate} className={btn} rel="next" title={next.file}>
          next ›
        </Link>
        <button type="button" onClick={random} className={btn}>
          random ↯
        </button>
        <span className="ml-auto text-dim text-[12px] uppercase tracking-[0.08em]">{item.kind}</span>
      </nav>

      <h3 className="font-mono text-[12.5px] uppercase tracking-[0.08em] text-dim mb-4">// {item.file}</h3>
      <p className="text-[13.5px] text-dim mb-5">{item.blurb}</p>

      <Suspense fallback={<div className="font-mono text-[13px] text-dim py-10">loading {item.file}…</div>}>
        {framed ? (
          <div
            className="relative h-[340px] rounded-[10px] border border-line overflow-hidden"
            style={item.frame.background ? { background: item.frame.background } : undefined}
          >
            <Component />
          </div>
        ) : (
          <Component />
        )}
      </Suspense>
    </>
  );
}

// trang lab: lưới chọn (lab) hoặc 1 mục đang mở (lab/<slug>). `view` do App truyền vào
export default function Lab({ view = 'lab', onNavigate }) {
  const item = labItemOf(view.split('/')[1]);
  const [kind, setKind] = useState('all');

  return (
    <section id="lab" className="pt-10 pb-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="09" title={item ? item.file : 'lab.css'} />
        {item ? <LabItem key={item.slug} item={item} onNavigate={onNavigate} /> : <LabGrid kind={kind} setKind={setKind} onNavigate={onNavigate} />}
      </div>
    </section>
  );
}
