import { Suspense, useEffect, useRef, useState } from 'react';
import ErrorBoundary from '../../layout/ErrorBoundary.jsx';
import SectionHead from '../../ui/SectionHead.jsx';
import LabIcon from './LabIcon.jsx';
import { LAB_ITEMS, LAB_KINDS, labItemOf } from '../../../config/lab-items.js';
import PageLink from '../../ui/PageLink.jsx';
import { spotMove } from '../../../lib/dom.js';
import { pick } from '../../../lib/math.js';
import './Lab.css';
import './LabFx.css';
import { WRAP } from '../../../config/ui.js';

// Lab có thể lên tới hàng trăm mục, nên giao diện tự đổi theo số lượng (không cần sửa code khi thêm mục):
const DENSE_MIN = 12; // nhiều hơn số này: thẻ gọn lại, 4 cột, hiện ô tìm kiếm
const PAGE = 12; // lưới bày trước ngần này thẻ, bấm "more" bày thêm ngần này
const STRIP_MAX = 8; // trang 1 mục: ít hơn/bằng số này thì hiện dải tab, nhiều hơn thì dùng ô "jump to…" có tìm kiếm

// khớp tên, tên file, nhãn hoặc mô tả (không phân biệt hoa thường)
const matches = (i, s) => !s || [i.name, i.file, i.kind, i.blurb].join(' ').toLowerCase().includes(s);

// kiểu hover của nút/chip/thẻ nằm ở LabFx.css (trạng thái đang chọn của chip đọc từ aria-pressed)
const chip = 'lab-chip px-3 py-1 rounded-md border font-mono text-[12.5px]';
const btn = 'lab-btn px-3.5 py-1.5 rounded-md border border-line text-ink font-mono text-[13px]';

// slug rỗng = về lưới lab; có slug = mở 1 mục (lab/<slug>)
const Link = ({ slug, ...props }) => <PageLink view={slug ? `lab/${slug}` : 'lab'} {...props} />;

// lưới thẻ: bộ lọc theo nhãn + ô tìm kiếm + nút random. Bộ lọc `f` ({ kind, q, limit }) nằm ở Lab (không phải ở đây)
// để mở 1 mục rồi bấm Back vẫn giữ nguyên bộ lọc, chữ đã gõ và số thẻ đã bày
function LabGrid({ f, setF, onNavigate }) {
  const filterRef = useRef(null);
  const dense = LAB_ITEMS.length > DENSE_MIN;
  const s = f.q.trim().toLowerCase();
  const filtering = f.kind !== 'all' || Boolean(s);
  const items = LAB_ITEMS.filter((i) => (f.kind === 'all' || i.kind === f.kind) && matches(i, s));
  const shown = items.slice(0, f.limit);
  const set = (patch) => setF((prev) => ({ ...prev, limit: PAGE, ...patch })); // đổi bộ lọc thì thu lại về PAGE thẻ đầu
  const random = () => {
    const pool = items.length ? items : LAB_ITEMS;
    onNavigate?.(`lab/${pick(pool).slug}`);
  };
  // "/" nhảy vào ô tìm kiếm (như GitHub/YouTube), trừ khi đang gõ ở ô khác
  const onKeyDown = (e) => {
    if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey || !dense) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    e.preventDefault();
    filterRef.current?.focus();
  };

  return (
    <div onKeyDown={onKeyDown}>
      <p className="font-mono text-[12.5px] text-dim -mt-6 mb-6">
        {filtering
          ? `// ${items.length} of ${LAB_ITEMS.length} match`
          : `// ${LAB_ITEMS.length} things to poke at: pick one, only that one runs`}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {['all', ...LAB_KINDS].map((k) => (
          <button key={k} type="button" onClick={() => set({ kind: k })} aria-pressed={f.kind === k} className={chip}>
            {k}
            <span className="lab-chip-n opacity-60">
              {k === 'all' ? LAB_ITEMS.length : LAB_ITEMS.filter((i) => i.kind === k).length}
            </span>
          </button>
        ))}
        {dense && (
          <label className="lab-find">
            <span aria-hidden="true">$ grep</span>
            <input
              ref={filterRef}
              type="text"
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return; // đang gõ tiếng Việt (Telex/VNI): Esc thuộc về bộ gõ
                if (e.key === 'Escape') set({ q: '' });
              }}
              placeholder="…"
              aria-label="Filter lab items"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
        )}
        <button type="button" onClick={random} className={`${btn} ml-auto`}>
          random <span className="lab-btn-ico lab-btn-ico--zap" aria-hidden="true">↯</span>
        </button>
      </div>

      <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${dense ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {shown.map((i) => (
          <Link
            key={i.slug}
            slug={i.slug}
            onNavigate={onNavigate}
            onPointerMove={spotMove}
            className={`lab-card group block ${dense ? 'p-3' : 'p-4'} rounded-[10px] border border-line`}
            style={{ background: 'var(--panel)' }}
          >
            <div className={`flex items-center justify-between ${dense ? 'mb-2' : 'mb-3'}`}>
              <span className="lab-card-icon leading-none" aria-hidden="true">
                <LabIcon name={i.slug} />
              </span>
              <span className="lab-card-tag font-mono text-[11px] uppercase tracking-[0.08em] text-dim border border-line rounded-sm px-1.5 py-0.5">
                {i.kind}
              </span>
            </div>
            <div className="font-mono font-bold text-[14px] text-ink group-hover:text-amber">{i.name}</div>
            <div className="font-mono text-[12px] text-dim mb-2">{i.file}</div>
            <p className={`text-[13px] text-dim leading-snug pr-10 ${dense ? 'line-clamp-2' : ''}`}>{i.blurb}</p>
            <span className="lab-card-go" aria-hidden="true">run ›</span>
          </Link>
        ))}
      </div>

      {items.length === 0 && (
        <p className="lab-empty">
          grep: no match.{' '}
          <button type="button" onClick={() => set({ kind: 'all', q: '' })}>
            clear filters
          </button>
        </p>
      )}
      {shown.length < items.length && (
        <button type="button" className="lab-more" onClick={() => setF((prev) => ({ ...prev, limit: prev.limit + PAGE }))}>
          + {items.length - shown.length} more
        </button>
      )}
    </div>
  );
}

// nhảy thẳng sang mục khác ngay trên trang 1 mục, khỏi quay về lưới.
// Ít mục: dải tab bấm 1 phát. Nhiều mục: ô "jump to…" có tìm kiếm (↓ ↑ chọn, Enter mở mục đầu, Esc đóng).
function LabJump({ item, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef(null);
  const btnRef = useRef(null);
  const inputRef = useRef(null);
  const s = q.trim().toLowerCase();
  const list = LAB_ITEMS.filter((i) => matches(i, s));
  const go = (view) => {
    setOpen(false);
    onNavigate?.(view);
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const away = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (LAB_ITEMS.length <= STRIP_MAX) {
    return (
      <div role="group" aria-label="Switch lab item" className="flex flex-wrap gap-2 mb-8">
        {LAB_ITEMS.map((i) => (
          <Link
            key={i.slug}
            slug={i.slug}
            onNavigate={onNavigate}
            className="lab-tab"
            title={i.file}
            aria-current={i === item ? 'page' : undefined}
          >
            <LabIcon name={i.slug} size={16} />
            {i.name}
          </Link>
        ))}
      </div>
    );
  }

  const arrows = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const nodes = [inputRef.current, ...boxRef.current.querySelectorAll('.lab-jump-row')];
    const at = nodes.indexOf(document.activeElement);
    const to = nodes[Math.max(0, Math.min(nodes.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (to) {
      e.preventDefault();
      to.focus();
    }
  };

  return (
    <div ref={boxRef} className="lab-jump" onKeyDown={arrows}>
      <button ref={btnRef} type="button" className={btn} aria-expanded={open} aria-controls="lab-jump-panel" onClick={() => setOpen((o) => !o)}>
        jump to… <span className="lab-btn-ico" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div id="lab-jump-panel" className="lab-jump-panel">
          <label className="lab-find">
            <span aria-hidden="true">$ grep</span>
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter' && list[0]) {
                  e.preventDefault();
                  go(`lab/${list[0].slug}`);
                }
              }}
              placeholder="…"
              aria-label="Find a lab item"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <div className="lab-jump-list lab-scroll">
            {list.map((i) => (
              <Link key={i.slug} slug={i.slug} onNavigate={go} className="lab-jump-row" aria-current={i === item ? 'page' : undefined}>
                <LabIcon name={i.slug} size={18} />
                <span className="lab-jump-name">
                  {i.name}
                  <i>{i.file}</i>
                </span>
                <span className="lab-jump-kind">{i.kind}</span>
              </Link>
            ))}
            {list.length === 0 && <p className="lab-jump-empty">grep: no match</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// 1 mục đang mở: chỉ mục này được tải (lazy) và chạy
function LabItem({ item, onNavigate }) {
  const idx = LAB_ITEMS.indexOf(item);
  const prev = LAB_ITEMS[(idx - 1 + LAB_ITEMS.length) % LAB_ITEMS.length];
  const next = LAB_ITEMS[(idx + 1) % LAB_ITEMS.length];
  const random = () => {
    const pool = LAB_ITEMS.filter((i) => i !== item);
    onNavigate?.(`lab/${pick(pool).slug}`);
  };
  const { Component } = item;
  const framed = item.frame;

  return (
    <>
      <nav aria-label="Lab" className="flex flex-wrap items-center gap-2 -mt-6 mb-4 font-mono text-[13px]">
        <Link slug={null} onNavigate={onNavigate} className={btn}>
          <span className="lab-btn-ico lab-btn-ico--l" aria-hidden="true">←</span> all
        </Link>
        <Link slug={prev.slug} onNavigate={onNavigate} className={btn} rel="prev" title={prev.file}>
          <span className="lab-btn-ico lab-btn-ico--l" aria-hidden="true">‹</span> prev
        </Link>
        <Link slug={next.slug} onNavigate={onNavigate} className={btn} rel="next" title={next.file}>
          next <span className="lab-btn-ico lab-btn-ico--r" aria-hidden="true">›</span>
        </Link>
        <button type="button" onClick={random} className={btn}>
          random <span className="lab-btn-ico lab-btn-ico--zap" aria-hidden="true">↯</span>
        </button>
        <span className="ml-auto text-dim text-[12px] uppercase tracking-[0.08em]">{item.kind}</span>
      </nav>

      <LabJump item={item} onNavigate={onNavigate} />

      <h2 className="font-mono text-[12.5px] uppercase tracking-[0.08em] text-dim mb-4">// {item.file}</h2>
      <p className="text-[13.5px] text-dim mb-5">{item.blurb}</p>

      <ErrorBoundary inline>
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
      </ErrorBoundary>
    </>
  );
}

// trang lab: lưới chọn (lab) hoặc 1 mục đang mở (lab/<slug>). `view` do App truyền vào
export default function Lab({ view = 'lab', onNavigate }) {
  const item = labItemOf(view.split('/')[1]);
  const [f, setF] = useState({ kind: 'all', q: '', limit: PAGE }); // bộ lọc lưới, giữ khi mở 1 mục rồi Back

  return (
    <section id="lab" className="pt-10 pb-20 border-t border-line">
      <div className={WRAP}>
        <SectionHead num="01" title={item ? item.file : 'lab.css'} level={1} />
        {item ? <LabItem key={item.slug} item={item} onNavigate={onNavigate} /> : <LabGrid f={f} setF={setF} onNavigate={onNavigate} />}
      </div>
    </section>
  );
}
