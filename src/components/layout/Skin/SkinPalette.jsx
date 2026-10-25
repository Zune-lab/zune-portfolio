import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AUTO_BY_TOD, GROUP_LABEL, SKINS, SKIN_AUTO, skinById, swatchOf } from '../../../config/skins.js';
import { chooseSkin, endPreview, isUnlocked, previewSkin } from '../../../lib/skin.js';
import useSkin from '../../../lib/useSkin.js';
import './Skin.css';

const PREVIEW_DELAY_MS = 70; // rê chuột lướt qua nhanh thì không đổi cả trang liên tục

const modeTag = (s) => (s.modes.length > 1 ? 'dark + light' : `${s.modes[0]} only`);
const isLocked = (it) => Boolean(it.unlock) && !isUnlocked(it.id);

// Bảng chọn skin kiểu command palette (Ctrl+K hoặc nút ở navbar): gõ để lọc, ↑↓ hoặc rê chuột để XEM THỬ NGAY cả trang,
// Enter / bấm để chọn, Esc để huỷ (trả lại như cũ).
export default function SkinPalette({ open, onClose }) {
  const { choice, theme } = useSkin();
  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const items = useMemo(() => {
    const auto = {
      id: SKIN_AUTO,
      group: 'original',
      label: 'auto',
      note: 'follows the time of day (VN)',
      modes: ['dark', 'light'],
      swatch: null,
    };
    const q = query.trim().toLowerCase();
    const all = [SKINS[0], auto, ...SKINS.slice(1)];
    return q ? all.filter((s) => `${s.label} ${s.id} ${s.note} ${GROUP_LABEL[s.group]}`.toLowerCase().includes(q)) : all;
    // `theme` / `choice` đổi thì thứ tự không đổi nhưng ô màu mẫu cần vẽ lại: render đọc trực tiếp, không cần phụ thuộc ở đây
  }, [query]);

  // mở bảng: đặt lại ô tìm, đưa dấu chọn tới skin đang dùng, nhớ chỗ focus cũ để trả lại khi đóng
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    setQuery('');
    setIdx(Math.max(0, [SKINS[0], { id: SKIN_AUTO }, ...SKINS.slice(1)].findIndex((s) => s.id === choice)));
    inputRef.current?.focus();
    return () => {
      endPreview();
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
    // chỉ chạy lúc mở/đóng: `choice` đọc ở thời điểm mở là đủ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // dấu chọn nhảy tới đâu thì xem thử skin đó; mục bị khoá thì trả về giao diện cũ
  useEffect(() => {
    if (!open) return undefined;
    const it = items[idx];
    if (!it || isLocked(it)) {
      endPreview();
      return undefined;
    }
    const t = window.setTimeout(() => previewSkin(it.id), PREVIEW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [open, idx, items]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [idx, items]);

  const pick = (it) => {
    if (!it || isLocked(it)) return;
    chooseSkin(it.id);
    onClose();
  };

  // phím điều khiển nghe ở cấp window khi bảng mở: dù focus lỡ rời ô tìm (bấm vào hàng...) Esc / ↑↓ / Enter vẫn chạy
  const keys = useRef(null);
  keys.current = { items, idx, pick, onClose };
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      const { items: list, idx: cur, pick: choose, onClose: close } = keys.current;
      const n = list.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (n) setIdx((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        choose(list[cur]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        e.preventDefault(); // hộp thoại giữ focus ở ô tìm
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  let lastGroup = null;
  return createPortal(
    <div
      className="skin-pal-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Choose a site skin" className="skin-pal">
        <div className="skin-pal-head">
          <span className="skin-pal-prompt" aria-hidden="true">
            $ theme
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIdx(0);
            }}
            placeholder="search skins…"
            spellCheck={false}
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls="skin-list"
            aria-activedescendant={items[idx] ? `skin-opt-${items[idx].id}` : undefined}
            aria-label="Search skins"
            className="skin-pal-input"
          />
          <kbd className="skin-pal-kbd">esc</kbd>
        </div>

        <div
          id="skin-list"
          ref={listRef}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()} // bấm hàng không cướp focus của ô tìm
          aria-label="Skins"
          className="skin-pal-list scroll-amber"
        >
          {items.length === 0 && <div className="skin-pal-empty">no skin matches “{query}”</div>}
          {items.map((it, i) => {
            const showHead = !query && it.group !== lastGroup;
            lastGroup = it.group;
            const locked = isLocked(it);
            const colors =
              it.id === SKIN_AUTO
                ? Object.values(AUTO_BY_TOD).map((id) => swatchOf(skinById(id), theme)[2])
                : swatchOf(it, theme);
            return (
              <div key={it.id}>
                {showHead && <div className="skin-pal-group">// {GROUP_LABEL[it.group]}</div>}
                <div
                  id={`skin-opt-${it.id}`}
                  role="option"
                  aria-selected={i === idx}
                  aria-disabled={locked || undefined}
                  className={`skin-row${i === idx ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}
                  onPointerMove={(e) => e.pointerType === 'mouse' && i !== idx && setIdx(i)}
                  onClick={() => pick(it)}
                >
                  <span className="skin-row-chip" aria-hidden="true">
                    {colors.map((c, k) => (
                      <i key={k} style={{ background: locked ? 'var(--line)' : c }} />
                    ))}
                  </span>
                  <span className="skin-row-main">
                    <span className="skin-row-name">{it.label}</span>
                    <span className="skin-row-note">{locked ? `locked · ${it.unlock.hint}` : it.note}</span>
                  </span>
                  <span className="skin-row-tag">{choice === it.id ? '● current' : locked ? '' : modeTag(it)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="skin-pal-foot">
          <span>↑↓ preview</span>
          <span>enter apply</span>
          <span>esc cancel</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
