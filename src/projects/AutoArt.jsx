import ArtSvg from './ArtSvg.jsx';
import './AutoArt.css';

// ICON TỰ VẼ cho project chưa có Art.jsx riêng. Thêm project mới chỉ cần meta.js là có icon ngay:
//  - chọn hình theo tags (sound -> thanh equalizer, game -> tay cầm, js/html/css -> </>, ...)
//  - không khớp tag nào -> vẽ "chòm sao" sinh từ tên project (cùng tên luôn ra cùng hình, khác tên ra hình khác)
//  - rải thêm vài chấm nhỏ sinh từ tên để hai project cùng tag vẫn không giống hệt
// Muốn icon riêng: tạo src/projects/<tên>/Art.jsx, nó sẽ thay thế icon tự vẽ này.

// hash chuỗi -> số, rồi bộ random có seed (mulberry32): không dùng Math.random để mỗi lần render đều giống nhau
const seedOf = (s) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
const rngOf = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const Equalizer = ({ rnd }) =>
  [0, 1, 2, 3, 4].map((i) => {
    const h = 28 + Math.round(rnd() * 44);
    return (
      <rect key={i} className="auto-bar" x={20 + i * 18} y={96 - h} width="10" height={h} rx="4"
        style={{ animationDelay: `${-i * 0.23}s`, animationDuration: `${0.9 + rnd() * 0.5}s` }} />
    );
  });

const Gamepad = () => (
  <g className="auto-float">
    <path className="auto-fill" d="M30 40 H90 C104 40 110 58 106 78 C103 90 94 92 88 84 L82 76 H38 L32 84 C26 92 17 90 14 78 C10 58 16 40 30 40 Z" />
    <path d="M36 52 V68 M28 60 H44" />
    <circle cx="82" cy="54" r="4" /><circle cx="92" cy="64" r="4" />
  </g>
);

const Code = () => (
  <g className="auto-float">
    <path d="M44 38 L22 60 L44 82" /><path d="M76 38 L98 60 L76 82" />
    <path className="auto-slash" d="M66 30 L54 90" />
  </g>
);

const Browser = () => (
  <g className="auto-float">
    <rect className="auto-fill" x="14" y="26" width="92" height="68" rx="8" />
    <path d="M14 44 H106" /><circle cx="26" cy="35" r="2" /><circle cx="35" cy="35" r="2" />
    <path d="M28 60 H62 M28 72 H84" />
  </g>
);

const Terminal = () => (
  <g className="auto-float">
    <rect className="auto-fill" x="14" y="28" width="92" height="64" rx="8" />
    <path d="M30 50 L44 60 L30 70" /><path className="auto-cursor" d="M54 72 H72" />
  </g>
);

const Gift = () => (
  <g className="auto-float">
    <rect className="auto-fill" x="22" y="54" width="76" height="44" rx="6" /><rect className="auto-fill" x="16" y="40" width="88" height="16" rx="5" />
    <path d="M60 40 V98 M60 40 C50 22 34 28 42 38 M60 40 C70 22 86 28 78 38" />
  </g>
);

const Constellation = ({ rnd }) => {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + rnd() * 0.8;
    const r = 24 + rnd() * 28;
    return [60 + Math.cos(a) * r, 60 + Math.sin(a) * r];
  });
  return (
    <g className="auto-spin">
      <path className="auto-fill" d={`M${pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L')} Z`} />
      {pts.map(([x, y], i) => <circle key={i} className="auto-dot" cx={x.toFixed(1)} cy={y.toFixed(1)} r={i % 3 === 0 ? 5 : 3} />)}
    </g>
  );
};

// tag đứng trước thắng; thêm hình mới chỉ cần thêm 1 dòng ở đây
const MOTIFS = [
  [['sound', 'music', 'audio', 'beat'], Equalizer],
  [['game', 'play'], Gamepad],
  [['gift'], Gift],
  [['cli', 'tool', 'terminal', 'node'], Terminal],
  [['web', 'site', 'app', 'ui'], Browser],
  [['js', 'html', 'css', 'ts', 'react', 'code'], Code],
];

export function makeAutoArt(slug, tags = []) {
  const Motif = MOTIFS.find(([keys]) => keys.some((k) => tags.includes(k)))?.[1] ?? Constellation;
  return function AutoArt() {
    const rnd = rngOf(seedOf(slug));
    const sparks = Array.from({ length: 4 }, () => [10 + Math.round(rnd() * 100), 8 + Math.round(rnd() * 20)]);
    return (
      <ArtSvg>
        <Motif rnd={rnd} />
        {sparks.map(([x, y], i) => <circle key={i} className="auto-spark" cx={x} cy={i % 2 ? y : 112 - y} r="1.8" style={{ animationDelay: `${-i * 0.7}s` }} />)}
      </ArtSvg>
    );
  };
}
