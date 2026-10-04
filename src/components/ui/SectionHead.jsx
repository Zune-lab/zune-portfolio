import { useEffect, useRef } from 'react';

// level=1 cho tiêu đề chính của các trang riêng (About / Projects / Lab); trang chủ đã có <h1> ở Hero nên dùng 2
// Tiêu đề tự gõ ra khi cuộn tới (CSS ở index.css: .sh-type, chỉ chạy khi không bật "giảm chuyển động").
// Chiều rộng animate theo số ký tự (font mono nên 1ch = 1 ký tự); chữ vẫn nằm sẵn trong DOM nên đọc màn hình bình thường.
export default function SectionHead({ num, title, level = 2 }) {
  const H = `h${level}`;
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-in');
      return undefined;
    }
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) {
          el.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="flex items-baseline gap-3.5 mb-10">
      <span className="font-mono text-sm" style={{ color: 'var(--amber-dim)' }}>
        {num}
      </span>
      <H className="font-mono font-bold text-[clamp(24px,3.6vw,36px)]">
        <span ref={ref} className="sh-type" style={{ '--n': title.length }}>
          {title}
        </span>
      </H>
    </div>
  );
}
