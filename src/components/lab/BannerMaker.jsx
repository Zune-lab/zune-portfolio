import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  DYES,
  PATTERNS,
  PATTERN,
  SHAPES,
  DEFAULT_FRAME,
  MIN_SIZE,
  MAX_SIZE,
  MAX_LAYERS,
  renderBanner,
  hexOf,
  colorName,
  isCustom,
} from './banner.js';

const STAGE_INNER_W = 296; // vùng xem trước cố định, banner nào cũng co/giãn trong khung này
const STAGE_INNER_H = 362;
const SAVE_LONG_SIDE = 640; // cạnh dài của ảnh PNG khi lưu
const THUMB_LONG_SIDE = 40;
const MAX_UNDO = 50;

const TABS = ['design', 'frame', 'draw', 'code'];
const SIZE_PRESETS = [
  { name: 'portrait', w: 20, h: 40 },
  { name: 'landscape', w: 40, h: 20 },
  { name: 'square', w: 30, h: 30 },
];
const DEFAULT_VIEW = { tilt: 0, shadow: 14, hanger: true };
const RAINBOW = 'conic-gradient(#f43, #fc3, #6d4, #3cf, #84f, #f4b, #f43)';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const btn = 'lab-cell px-3 py-1 rounded-md border border-line hover:border-amber text-ink disabled:opacity-40 disabled:hover:border-line';
const chip = (on) => `lab-cell px-2.5 py-0.5 rounded-md border ${on ? 'border-amber text-ink' : 'border-line text-dim hover:border-amber-dim'}`;

let uid = 0;
const mk = (pattern, color) => ({ id: ++uid, pattern, color });

// phóng to ảnh pixel, tắt làm mượt để giữ nét vuông vức
function scaled(pixels, w, h, scale) {
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  src.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0);
  const out = document.createElement('canvas');
  out.width = w * scale;
  out.height = h * scale;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

// các ô nằm trên đoạn thẳng giữa hai ô (Bresenham), để kéo chuột nhanh cũng không bị đứt nét
function line([x0, y0], [x1, y1]) {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    cells.push([x, y]);
    if (x === x1 && y === y1) return cells;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// hình vẽ tay lưu dạng { 'x,y': màu }, đổi sang nhóm theo màu để vẽ và để sinh code
function toGroups(paint) {
  const by = new Map();
  for (const [key, color] of Object.entries(paint)) {
    const [x, y] = key.split(',').map(Number);
    if (!by.has(color)) by.set(color, []);
    by.get(color).push([x, y]);
  }
  return [...by].map(([color, cells]) => ({ color, cells: cells.sort((a, b) => a[1] - b[1] || a[0] - b[0]) }));
}

// đoạn code tái tạo đúng thiết kế đang xem, chạy được với renderBanner trong banner.js
function buildCode(base, layers, f, groups) {
  const rows = layers.map((l) => `  { pattern: '${l.pattern}', color: '${l.color}' },`).join('\n');
  let code = `import { renderBanner } from './banner.js';

const base = '${base}';
const layers = [${rows ? `\n${rows}\n` : ''}];
const frame = {
  w: ${f.w}, h: ${f.h}, shape: '${f.shape}',
  radius: ${f.radius}, border: ${f.border}, borderColor: '${f.borderColor}',
};
`;
  if (!groups.length) return `${code}\n// RGBA pixels, w * h * 4\nconst pixels = renderBanner(base, layers, frame);`;
  const paint = groups
    .map(({ color, cells }) => {
      const lines = [];
      for (let i = 0; i < cells.length; i += 6) {
        lines.push(`      ${cells.slice(i, i + 6).map(([x, y]) => `[${x}, ${y}]`).join(', ')},`);
      }
      return `  {\n    color: '${color}',\n    cells: [\n${lines.join('\n')}\n    ],\n  },`;
    })
    .join('\n');
  code += `\nconst paint = [\n${paint}\n];\n\n// RGBA pixels, w * h * 4\nconst pixels = renderBanner(base, layers, frame, paint);`;
  return code;
}

// thanh trượt cùng kiểu với playground cũ: nhãn, thanh, giá trị
function Slider({ label, value, min, max, unit = '', disabled, onChange }) {
  return (
    <label className={`grid grid-cols-[84px_1fr_46px] items-center gap-2.5 ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-dim">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: 'var(--amber)' }}
      />
      <span className="text-right" style={{ color: 'var(--green)' }}>
        {value}
        {unit}
      </span>
    </label>
  );
}

// 16 màu có sẵn + một ô cuối mở bảng chọn màu tuỳ ý của trình duyệt
function ColorPicker({ value, onChange, className }) {
  const custom = isCustom(value);
  return (
    <div className={`grid gap-1.5 ${className}`}>
      {DYES.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onChange(d.id)}
          title={d.name}
          aria-label={d.name}
          aria-pressed={value === d.id}
          className={`aspect-square rounded-md border-2 ${value === d.id ? 'border-amber' : 'border-line hover:border-amber-dim'}`}
          style={{ background: d.hex }}
        />
      ))}
      <label
        title={custom ? `custom ${hexOf(value)}` : 'custom color'}
        className={`relative aspect-square rounded-md border-2 overflow-hidden cursor-pointer focus-within:border-amber ${custom ? 'border-amber' : 'border-line hover:border-amber-dim'}`}
        style={{ background: custom ? hexOf(value) : RAINBOW }}
      >
        <input
          type="color"
          value={hexOf(value)}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Custom color"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
    </div>
  );
}

// thiết kế banner: bốn tab design / frame / draw / code, lưu thành PNG hoặc copy đoạn code
export default function BannerMaker() {
  const [tab, setTab] = useState('design');
  const [base, setBase] = useState('indigo');
  const [layers, setLayers] = useState(() => [mk('rhombus', 'sky'), mk('circle', 'chalk')]);
  const [frame, setFrame] = useState(DEFAULT_FRAME);
  const [view, setView] = useState(DEFAULT_VIEW);
  const [sel, setSel] = useState(1); // -1 = lớp nền, -2 = viền
  const [paint, setPaint] = useState({});
  const [history, setHistory] = useState([]);
  const [tool, setTool] = useState('pencil');
  const [mirror, setMirror] = useState(false);
  const [ink, setInk] = useState('honey');
  const [copied, setCopied] = useState(false); // false | 'ok' | 'fail'
  const canvasRef = useRef(null);
  const stroke = useRef(null); // { last: [x, y], pushed: boolean } trong lúc đang kéo chuột
  const paintRef = useRef(paint); // bản mới nhất của paint, để nhiều sự kiện pointer liên tiếp không đọc nhầm state cũ
  const copiedTimer = useRef(0);

  const { w, h } = frame;
  const drawing = tab === 'draw';
  const selLayer = sel >= 0 ? layers[sel] : null;
  const activeColor = selLayer ? selLayer.color : sel === -2 ? frame.borderColor : base;
  const colorLabel = selLayer ? 'layer color' : sel === -2 ? 'border color' : 'base color';
  const cell = Math.max(3, Math.floor(Math.min(STAGE_INNER_W / w, (STAGE_INNER_H - (view.hanger ? 10 : 0)) / h)));
  const groups = useMemo(() => toGroups(paint), [paint]);
  // chỉ sinh code khi đang mở tab code, vẽ tay không phải dựng lại chuỗi mỗi nét
  const code = useMemo(() => (tab === 'code' ? buildCode(base, layers, frame, groups) : ''), [tab, base, layers, frame, groups]);
  const paintCount = Object.keys(paint).length;

  const setF = (patch) => setFrame((f) => ({ ...f, ...patch }));
  const setV = (patch) => setView((v) => ({ ...v, ...patch }));

  // ảnh nhỏ của từng hoa văn (trắng trên nền xám), vẽ lại khi đổi cỡ vải để thấy đúng tỉ lệ.
  // chỉ dựng khi tab design đang mở (kéo slider ở tab frame không tốn công), và dùng giá trị
  // trì hoãn để kéo slider không phải dựng lại 30 ảnh ở mỗi bước.
  const dw = useDeferredValue(w);
  const dh = useDeferredValue(h);
  const inDesign = tab === 'design';
  const thumbCache = useRef(new Map()); // cache theo cỡ vải: quay lại tab design không dựng lại 30 ảnh
  const thumbs = useMemo(() => {
    if (!inDesign) return null;
    const key = `${dw}x${dh}`;
    const cached = thumbCache.current.get(key);
    if (cached) return cached;
    const scale = Math.max(1, Math.floor(THUMB_LONG_SIDE / Math.max(dw, dh)));
    const made = Object.fromEntries(
      PATTERNS.map((p) => [
        p.id,
        scaled(renderBanner('slate', [{ pattern: p.id, color: 'chalk' }], { w: dw, h: dh }), dw, dh, scale).toDataURL(),
      ]),
    );
    if (thumbCache.current.size >= 8) thumbCache.current.delete(thumbCache.current.keys().next().value); // giữ nhỏ
    thumbCache.current.set(key, made);
    return made;
  }, [inDesign, dw, dh]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(new ImageData(renderBanner(base, layers, frame, groups), w, h), 0, 0);
  }, [base, layers, frame, groups, w, h]);

  const setColor = (c) => {
    if (sel === -1) setBase(c);
    else if (sel === -2) setF({ borderColor: c });
    else setLayers((ls) => ls.map((l, i) => (i === sel ? { ...l, color: c } : l)));
  };

  const setPattern = (p) => setLayers((ls) => ls.map((l, i) => (i === sel ? { ...l, pattern: p } : l)));

  const setBorder = (n) => {
    setF({ border: n });
    if (n === 0 && sel === -2) setSel(-1);
  };

  const addLayer = () => {
    if (layers.length >= MAX_LAYERS) return;
    const prev = layers[layers.length - 1]?.color ?? base;
    const color = pick(DYES.filter((d) => d.id !== prev));
    setLayers((ls) => [...ls, mk(pick(PATTERNS).id, color.id)]);
    setSel(layers.length);
  };

  const removeLayer = (i) => {
    setLayers((ls) => ls.filter((_, j) => j !== i));
    setSel((s) => (s > i ? s - 1 : s === i ? Math.min(i, layers.length - 2) : s));
  };

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= layers.length) return;
    setLayers((ls) => {
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setSel((s) => (s === i ? j : s === j ? i : s));
  };

  const randomize = () => {
    const n = 2 + Math.floor(Math.random() * (MAX_LAYERS - 1));
    const baseColor = pick(DYES).id;
    let prev = baseColor;
    const next = Array.from({ length: n }, () => {
      const color = pick(DYES.filter((d) => d.id !== prev)).id;
      prev = color;
      return mk(pick(PATTERNS).id, color);
    });
    setBase(baseColor);
    setLayers(next);
    setSel(next.length - 1);
  };

  // clear xoá cả các lớp lẫn hình vẽ tay (vẫn undo được phần vẽ)
  const clear = () => {
    setBase('chalk');
    setLayers([]);
    setSel(-1);
    clearPaint();
  };

  const resetFrame = () => {
    setFrame(DEFAULT_FRAME);
    setView(DEFAULT_VIEW);
    if (sel === -2) setSel(-1);
  };

  // --- vẽ tay ---
  const commitPaint = (next) => {
    paintRef.current = next;
    setPaint(next);
  };

  const pushHistory = (snapshot) => setHistory((hs) => [...hs.slice(-(MAX_UNDO - 1)), snapshot]);

  const clearPaint = () => {
    if (!Object.keys(paintRef.current).length) return;
    pushHistory(paintRef.current);
    commitPaint({});
  };

  const undo = () => {
    if (!history.length) return;
    commitPaint(history[history.length - 1]);
    setHistory((hs) => hs.slice(0, -1));
  };

  const cellAt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * w);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * h);
    return [Math.min(w - 1, Math.max(0, x)), Math.min(h - 1, Math.max(0, y))];
  };

  // tô (hoặc xoá) các ô, có đối xứng trái-phải nếu bật mirror.
  // chỉ ghi vào lịch sử undo khi nét đó thật sự làm đổi hình (bấm tẩy lên ô trống không tạo bước undo rỗng)
  const stamp = (cells) => {
    const all = mirror ? cells.flatMap(([x, y]) => [[x, y], [w - 1 - x, y]]) : cells;
    const cur = paintRef.current;
    let next = cur;
    for (const [x, y] of all) {
      const key = `${x},${y}`;
      if (tool === 'eraser') {
        if (!(key in next)) continue;
        if (next === cur) next = { ...cur };
        delete next[key];
      } else if (next[key] !== ink) {
        if (next === cur) next = { ...cur };
        next[key] = ink;
      }
    }
    if (next === cur) return;
    if (stroke.current && !stroke.current.pushed) {
      stroke.current.pushed = true;
      pushHistory(cur);
    }
    commitPaint(next);
  };

  const onPointerDown = (e) => {
    if (!drawing || (e.pointerType === 'mouse' && e.button !== 0)) return; // chuột phải / giữa không vẽ
    const c = cellAt(e);
    if (!c) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* không bắt được con trỏ thì vẫn vẽ được trong khung canvas */
    }
    stroke.current = { last: c, pushed: false };
    stamp([c]);
  };

  const onPointerMove = (e) => {
    const s = stroke.current;
    if (!drawing || !s) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      stroke.current = null; // nhả chuột ngoài cửa sổ mà không nhận được pointerup
      return;
    }
    const c = cellAt(e);
    if (!c || (c[0] === s.last[0] && c[1] === s.last[1])) return;
    stamp(line(s.last, c));
    s.last = c;
  };

  const endStroke = () => {
    stroke.current = null;
  };

  // lưu đúng phần vải (hình dáng, viền, hình vẽ, nền trong suốt), không kèm độ nghiêng hay bóng khi xem
  const save = () => {
    const scale = Math.max(4, Math.floor(SAVE_LONG_SIDE / Math.max(w, h)));
    const out = scaled(renderBanner(base, layers, frame, groups), w, h, scale);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zune-banner.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); // thu hồi ngay có thể làm một số trình duyệt huỷ lượt tải
    }, 'image/png');
  };

  const copy = async () => {
    let result = 'ok';
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      result = 'fail'; // trình duyệt chặn clipboard: báo để người dùng tự bôi đen
    }
    setCopied(result);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), result === 'ok' ? 1500 : 3000);
  };

  const rowCls = (active) =>
    `flex items-center gap-2 px-2 py-1 rounded-md border text-left text-ink ${active ? 'border-amber' : 'border-line'}`;
  const swatch = (c) => <span className="w-3.5 h-3.5 rounded-sm border border-line shrink-0" style={{ background: hexOf(c) }} />;

  return (
    <div className="bg-inset border border-line rounded-[10px] p-5">
      <div className="grid gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
        {/* trái: khung xem trước cao cố định + nút thao tác, đổi cỡ banner không làm trang xê dịch */}
        <div className="flex flex-col gap-3 min-w-0">
          <div
            className="flex items-center justify-center h-[400px] px-3 rounded-lg border border-line overflow-hidden"
            style={{ background: 'var(--panel)' }}
          >
            <div
              className="lab-banner-stage flex flex-col items-center"
              style={{
                transform: `rotate(${drawing ? 0 : view.tilt}deg)`,
                filter: view.shadow > 0 ? `drop-shadow(0 ${Math.round(view.shadow / 2)}px ${view.shadow}px rgba(0,0,0,0.45))` : 'none',
              }}
            >
              {view.hanger && (
                <div
                  className="h-[8px] rounded-[3px] mb-0.5"
                  style={{ width: 'calc(100% + 16px)', background: 'linear-gradient(#a0703f, #6e4a26)' }}
                />
              )}
              <canvas
                ref={canvasRef}
                width={w}
                height={h}
                role="img"
                aria-label="Banner preview"
                className="block"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endStroke}
                onPointerCancel={endStroke}
                style={{
                  width: w * cell,
                  maxWidth: '100%',
                  height: 'auto',
                  imageRendering: 'pixelated',
                  cursor: drawing ? 'crosshair' : 'default',
                  touchAction: drawing ? 'none' : 'auto',
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-[12px]">
            <button type="button" onClick={randomize} className={`${btn} !px-1.5`}>
              random
            </button>
            <button type="button" onClick={clear} className={`${btn} !px-1.5`}>
              clear
            </button>
            <button type="button" onClick={save} className={`${btn} !px-1.5`} style={{ color: 'var(--green)' }}>
              save .png
            </button>
          </div>
        </div>

        {/* phải: bốn tab, phần nội dung cao cố định, dài quá thì cuộn bên trong */}
        <div className="font-mono text-[13px] min-w-0">
          <div role="tablist" className="flex gap-1 border-b border-line mb-4">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`banner-tab-${t}`}
                aria-selected={tab === t}
                aria-controls={`banner-panel-${t}`}
                onClick={() => setTab(t)}
                className={`lab-cell px-3 py-1.5 -mb-px border-b-2 ${tab === t ? 'border-amber text-ink' : 'border-transparent text-dim hover:text-ink'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="banner-body h-[392px] overflow-y-auto lab-scroll pr-1">
            {tab === 'design' && (
              <div role="tabpanel" id="banner-panel-design" aria-labelledby="banner-tab-design" className="flex flex-col gap-4">
                {/* danh sách lớp, lớp trên cùng hiện trước; lớp mới thêm sẽ nằm ngay dưới nút + layer */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-dim text-[12px]">
                      // layers {layers.length}/{MAX_LAYERS}
                    </span>
                    <button
                      type="button"
                      onClick={addLayer}
                      disabled={layers.length >= MAX_LAYERS}
                      title={layers.length >= MAX_LAYERS ? `max ${MAX_LAYERS} layers` : 'add a random layer on top'}
                      className={`${btn} !px-2.5 !py-0.5 text-[12px]`}
                    >
                      + layer
                    </button>
                  </div>
                  {layers.length === 0 && <p className="text-dim text-[12px] px-1">// no layers yet. press + layer to stack a pattern on the base.</p>}
                  {layers
                    .map((l, i) => ({ l, i }))
                    .reverse()
                    .map(({ l, i }) => (
                      <div key={l.id} className={`flex items-center rounded-md border ${sel === i ? 'border-amber' : 'border-line'}`}>
                        <button type="button" onClick={() => setSel(i)} className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1 text-left text-ink">
                          {swatch(l.color)}
                          <span className="truncate">{PATTERN[l.pattern].name}</span>
                          <span className="text-dim text-[12px] truncate">{colorName(l.color)}</span>
                        </button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === layers.length - 1} aria-label="Move layer up" className="px-1.5 text-dim hover:text-ink disabled:opacity-30">
                          ↑
                        </button>
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move layer down" className="px-1.5 text-dim hover:text-ink disabled:opacity-30">
                          ↓
                        </button>
                        <button type="button" onClick={() => removeLayer(i)} aria-label="Remove layer" className="px-2 text-dim hover:text-amber">
                          ✕
                        </button>
                      </div>
                    ))}
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setSel(-1)} className={`${rowCls(sel === -1)} flex-1`}>
                      {swatch(base)}
                      <span>base</span>
                      <span className="text-dim text-[12px]">{colorName(base)}</span>
                    </button>
                    {frame.border > 0 && (
                      <button type="button" onClick={() => setSel(-2)} className={`${rowCls(sel === -2)} flex-1`}>
                        {swatch(frame.borderColor)}
                        <span>border</span>
                        <span className="text-dim text-[12px]">{colorName(frame.borderColor)}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* hoa văn (nền và viền chỉ có màu) cạnh bảng màu */}
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  {selLayer ? (
                    <div className="grid gap-1 content-start grid-cols-[repeat(auto-fill,minmax(38px,1fr))]">
                      {PATTERNS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPattern(p.id)}
                          title={p.name}
                          aria-label={p.name}
                          aria-pressed={selLayer.pattern === p.id}
                          className={`lab-cell flex items-center justify-center h-[40px] p-0.5 rounded-md border ${selLayer.pattern === p.id ? 'border-amber' : 'border-line hover:border-amber-dim'}`}
                        >
                          <img src={thumbs?.[p.id]} alt="" style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-dim text-[12px] self-center">// base and border take a color only. pick a layer to change its pattern.</p>
                  )}
                  <div>
                    <div className="mb-1.5 text-dim text-[12px]">{colorLabel}</div>
                    <ColorPicker value={activeColor} onChange={setColor} className="grid-cols-8 sm:grid-cols-4 w-[216px] sm:w-[124px]" />
                  </div>
                </div>
              </div>
            )}

            {tab === 'frame' && (
              <div role="tabpanel" id="banner-panel-frame" aria-labelledby="banner-tab-frame" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {SIZE_PRESETS.map((p) => (
                    <button key={p.name} type="button" onClick={() => setF({ w: p.w, h: p.h })} aria-pressed={w === p.w && h === p.h} className={chip(w === p.w && h === p.h)}>
                      {p.name}
                    </button>
                  ))}
                  <span className="w-px h-4 bg-line mx-1" />
                  {SHAPES.map((s) => (
                    <button key={s.id} type="button" onClick={() => setF({ shape: s.id })} aria-pressed={frame.shape === s.id} className={chip(frame.shape === s.id)}>
                      {s.name}
                    </button>
                  ))}
                  <button type="button" onClick={resetFrame} className="ml-auto text-dim hover:text-ink">
                    reset
                  </button>
                </div>

                <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                  <Slider label="width" value={w} min={MIN_SIZE} max={MAX_SIZE} unit="px" onChange={(v) => setF({ w: v })} />
                  <Slider label="height" value={h} min={MIN_SIZE} max={MAX_SIZE} unit="px" onChange={(v) => setF({ h: v })} />
                  <Slider label="radius" value={frame.radius} min={0} max={50} unit="%" disabled={frame.shape === 'oval'} onChange={(v) => setF({ radius: v })} />
                  <Slider label="border" value={frame.border} min={0} max={4} unit="px" onChange={setBorder} />
                  <Slider label="tilt" value={view.tilt} min={-30} max={30} unit="deg" onChange={(v) => setV({ tilt: v })} />
                  <Slider label="shadow" value={view.shadow} min={0} max={40} unit="px" onChange={(v) => setV({ shadow: v })} />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-dim text-[12px]">
                  <label className="flex items-center gap-2 text-ink">
                    <input type="checkbox" checked={view.hanger} onChange={(e) => setV({ hanger: e.target.checked })} style={{ accentColor: 'var(--amber)' }} />
                    <span>wooden bar</span>
                  </label>
                  <span>// tilt, shadow and bar are preview only, not saved in the .png</span>
                </div>
              </div>
            )}

            {tab === 'draw' && (
              <div role="tabpanel" id="banner-panel-draw" aria-labelledby="banner-tab-draw" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => setTool('pencil')} aria-pressed={tool === 'pencil'} className={chip(tool === 'pencil')}>
                    pencil
                  </button>
                  <button type="button" onClick={() => setTool('eraser')} aria-pressed={tool === 'eraser'} className={chip(tool === 'eraser')}>
                    eraser
                  </button>
                  <label className="flex items-center gap-2 ml-2 text-ink">
                    <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} style={{ accentColor: 'var(--amber)' }} />
                    <span>mirror</span>
                  </label>
                  <span className="ml-auto flex items-center gap-3">
                    <button type="button" onClick={undo} disabled={!history.length} className="text-dim hover:text-ink disabled:opacity-40">
                      undo
                    </button>
                    <button type="button" onClick={clearPaint} disabled={!paintCount} className="text-dim hover:text-ink disabled:opacity-40">
                      clear drawing
                    </button>
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                  <div>
                    <div className="mb-1.5 text-dim text-[12px]">pencil color</div>
                    <ColorPicker value={ink} onChange={(c) => { setInk(c); setTool('pencil'); }} className="grid-cols-9 w-[250px]" />
                  </div>
                  <div className="text-dim text-[12px] flex flex-col gap-1.5 self-start">
                    <p>// click or drag on the banner to paint pixels.</p>
                    <p>// drawing sits on top of every layer and keeps its position when you resize; pixels outside the frame are hidden, not lost.</p>
                    <p className="text-ink">{paintCount} painted pixel{paintCount === 1 ? '' : 's'}</p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'code' && (
              <div role="tabpanel" id="banner-panel-code" aria-labelledby="banner-tab-code" className="relative h-full">
                <pre className="h-full overflow-auto lab-scroll border border-line rounded-lg px-4 py-3 font-mono text-[12.5px] text-ink" style={{ background: 'var(--panel)' }}>
                  {code}
                </pre>
                <button
                  type="button"
                  onClick={copy}
                  className="lab-cell absolute top-2 right-3 px-2.5 py-1 rounded-md border border-line hover:border-amber font-mono text-[12px] text-dim hover:text-ink"
                  style={{ background: 'var(--panel)' }}
                >
                  {copied === 'ok' ? 'copied!' : copied === 'fail' ? 'blocked: select & copy by hand' : 'copy code'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
