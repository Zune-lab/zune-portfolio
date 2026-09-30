import { useEffect, useRef, useState } from 'react';
import './ProjectCard.css';

// "virtual" viewport width dùng để render trang demo bên trong iframe, rồi
// scale xuống vừa khung card — luôn coi như đang mở trang demo trên màn
// hình desktop 1280px, bất kể card thật rộng bao nhiêu, cho nhất quán.
const VIRTUAL_W = 1280;

function useCardScale() {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.18);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / VIRTUAL_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, scale];
}

// mỗi project chọn 1 kiểu "hé lộ" qua field `reveal` trong data.js:
//   top    - chỉ phần đầu trang, dưới tan dần (mặc định)
//   corner - phóng to riêng 1 góc trên-trái, còn lại chìm hẳn
//   strip  - chỉ 1 dải ngang ở giữa, trên dưới đều tan
//   blur   - cả ảnh nhoè nặng, chỉ còn màu sắc và bố cục
// Muốn thêm kiểu mới: thêm 1 mục vào REVEALS. blur = px, gray = 0..1.
const REVEALS = {
  top: { blur: 3, gray: 0.55, scale: 1.06, origin: 'center top', pos: 'top', mask: 'linear-gradient(to bottom, #000 38%, transparent 92%)' },
  corner: { blur: 2, gray: 0.5, scale: 1.9, origin: '10% 15%', pos: 'left top', mask: 'radial-gradient(ellipse 65% 85% at 12% 18%, #000 0%, transparent 100%)' },
  strip: { blur: 2.5, gray: 0.55, scale: 1.06, origin: 'center', pos: 'center', mask: 'linear-gradient(to bottom, transparent 22%, #000 40%, #000 60%, transparent 78%)' },
  blur: { blur: 9, gray: 0.35, scale: 1.15, origin: 'center top', pos: 'top', mask: 'none' },
};

// ảnh preview tĩnh dự phòng: public/previews/<tên-file-bỏ-đuôi>.png
// demo (tuỳ chọn, khai báo trong data.js): link trang demo đang chạy thật,
// sẽ được crop chỉ hiện phần trên cùng, không tương tác được, giữ bí ẩn.
export default function ProjectCard({ num, file, desc, color, href, demo, reveal = 'top' }) {
  const r = REVEALS[reveal] || REVEALS.top;
  const [imgOk, setImgOk] = useState(true);
  const [cropRef, scale] = useCardScale();
  const slug = file.replace(/\.[^.]+$/, '');
  const hasImg = !demo && imgOk;

  return (
    <a
      id={`project-${num}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      className="project-card relative h-[180px] rounded-[10px] overflow-hidden bg-panel border border-line flex items-center justify-center cursor-pointer transition-[transform,box-shadow,border-color] duration-500 hover:scale-[1.04] hover:shadow-[0_18px_30px_-14px_rgba(0,0,0,0.5)] hover:border-amber-dim scroll-mt-20"
    >
      {demo && (
        <div ref={cropRef} className="project-card-demo-crop absolute inset-0 overflow-hidden">
          <iframe
            src={demo}
            title={`${file} live preview`}
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
            sandbox="allow-scripts"
            style={{ width: VIRTUAL_W, transform: `scale(${scale})` }}
            className="project-card-demo-frame"
          />
          <div className="project-card-demo-fade absolute inset-0" />
        </div>
      )}

      {hasImg && (
        <>
          {/* BASE_URL: site chạy ở subpath /zune-portfolio/, path tuyệt đối "/previews" sẽ 404 */}
          <img
            src={`${import.meta.env.BASE_URL}previews/${slug}.png`}
            alt=""
            loading="lazy"
            onError={() => setImgOk(false)}
            className="project-card-preview absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: r.pos,
              filter: `blur(${r.blur}px) grayscale(${r.gray}) brightness(0.85)`,
              scale: r.scale, // thuộc tính `scale` riêng, không đè hiệu ứng hover dùng transform
              transformOrigin: r.origin,
              WebkitMaskImage: r.mask,
              maskImage: r.mask,
            }}
          />
          <span className="project-card-preview absolute top-2.5 left-3 z-[1] font-mono text-[10px] tracking-[0.18em] text-dim uppercase">
            ▒ preview · redacted
          </span>
          <div className="project-card-preview absolute inset-0 bg-gradient-to-t from-panel via-panel/60 to-transparent" />
        </>
      )}

      <div
        className={`project-card-idle relative z-[1] flex flex-col items-center gap-2 ${
          demo || hasImg ? 'self-end pb-4' : ''
        }`}
        style={{ color }}
      >
        {!demo && !hasImg && (
          <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M20 5H4V19L13.2923 9.70649C13.6828 9.31595 14.3159 9.31591 14.7065 9.70641L20 15.0104V5ZM2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z"
            />
          </svg>
        )}
        <span className="font-mono text-[11px] text-dim">{num}</span>
        <span className="font-mono text-sm text-ink">{file}</span>
      </div>

      <div className="project-card-content absolute top-1/2 left-1/2 w-full h-full box-border p-5 bg-inset flex flex-col justify-center gap-2">
        <span className="font-mono text-[15px] text-ink">{file}</span>
        <span className="text-dim text-[13px] leading-relaxed">{desc}</span>
        <span className="mt-auto self-start font-mono text-[13px] text-amber hover:underline">open →</span>
      </div>
    </a>
  );
}