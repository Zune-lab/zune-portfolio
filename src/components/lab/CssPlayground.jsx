import { useState } from 'react';

const DEFAULTS = { radius: 24, rotate: 12, hue: 40, blur: 28, scale: 1 };

const SLIDERS = [
  { key: 'radius', label: 'border-radius', min: 0, max: 50, step: 1, unit: '%' },
  { key: 'rotate', label: 'rotate', min: -180, max: 180, step: 1, unit: 'deg' },
  { key: 'hue', label: 'hue', min: 0, max: 360, step: 1, unit: '' },
  { key: 'blur', label: 'shadow blur', min: 0, max: 60, step: 1, unit: 'px' },
  { key: 'scale', label: 'scale', min: 0.5, max: 1.5, step: 0.05, unit: '' },
];

const rand = (min, max) => Math.round(min + Math.random() * (max - min));

function buildCss(v) {
  return `.box {
  width: 120px;
  height: 120px;
  border-radius: ${v.radius}%;
  background: hsl(${v.hue} 80% 60%);
  box-shadow: 0 10px ${v.blur}px hsl(${v.hue} 80% 40% / 0.6);
  transform: rotate(${v.rotate}deg) scale(${v.scale});
}`;
}

// sân chơi CSS: kéo thanh trượt, hộp đổi ngay, bấm copy để lấy đoạn CSS
export default function CssPlayground() {
  const [v, setV] = useState(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const css = buildCss(v);

  const set = (key, value) => setV((s) => ({ ...s, [key]: Number(value) }));

  const randomize = () =>
    setV({
      radius: rand(0, 50),
      rotate: rand(-180, 180),
      hue: rand(0, 360),
      blur: rand(0, 60),
      scale: 0.5 + rand(0, 20) * 0.05,
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* trình duyệt chặn clipboard: bỏ qua, người xem vẫn tự bôi đen được */
    }
  };

  return (
    <div className="bg-inset border border-line rounded-[10px] p-[26px]">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* xem trước */}
        <div
          className="flex items-center justify-center min-h-[240px] rounded-lg border border-line overflow-hidden"
          style={{ background: 'var(--panel)' }}
        >
          <div
            className="lab-preview-box"
            style={{
              width: 120,
              height: 120,
              borderRadius: `${v.radius}%`,
              background: `hsl(${v.hue} 80% 60%)`,
              boxShadow: `0 10px ${v.blur}px hsl(${v.hue} 80% 40% / 0.6)`,
              transform: `rotate(${v.rotate}deg) scale(${v.scale})`,
            }}
          />
        </div>

        {/* điều khiển */}
        <div className="flex flex-col gap-3.5 font-mono text-[13px]">
          {SLIDERS.map((s) => (
            <label key={s.key} className="grid grid-cols-[110px_1fr_64px] items-center gap-3">
              <span className="text-dim">{s.label}</span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={v[s.key]}
                onChange={(e) => set(s.key, e.target.value)}
                style={{ accentColor: 'var(--amber)' }}
              />
              <span className="text-right" style={{ color: 'var(--green)' }}>
                {v[s.key]}
                {s.unit}
              </span>
            </label>
          ))}
          <div className="flex gap-2.5 mt-1">
            <button type="button" onClick={randomize} className="lab-cell px-3.5 py-1.5 rounded-md border border-line hover:border-amber text-ink">
              random
            </button>
            <button type="button" onClick={() => setV(DEFAULTS)} className="lab-cell px-3.5 py-1.5 rounded-md border border-line hover:border-amber text-ink">
              reset
            </button>
          </div>
        </div>
      </div>

      {/* CSS sinh ra */}
      <div className="relative mt-6">
        <pre className="border border-line rounded-lg px-5 py-4 font-mono text-[13px] overflow-x-auto text-ink" style={{ background: 'var(--panel)' }}>
          {css}
        </pre>
        <button
          type="button"
          onClick={copy}
          className="lab-cell absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md border border-line hover:border-amber font-mono text-[12px] text-dim hover:text-ink"
        >
          {copied ? 'copied!' : 'copy css'}
        </button>
      </div>
    </div>
  );
}
