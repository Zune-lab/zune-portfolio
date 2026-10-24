import { useEffect, useRef } from 'react';

// Chữ "giải mã" kiểu terminal: khi rê chuột vào link/nút chứa nó, các ký tự nhảy loạn rồi chốt dần từ trái sang phải.
// Chỉ chạy trên máy có chuột và khi không bật "reduce motion". Font mono nên độ rộng không đổi, không giật layout.
// children phải là một chuỗi.
const GLYPHS = '01<>/\\_-=+*#$%';
const DURATION = 420;

export default function Scramble({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.closest('a, button');
    if (!el || !host) return;
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const final = String(children);
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / DURATION, 1);
        const fixed = Math.floor(p * final.length);
        el.textContent = [...final]
          .map((c, i) => (c === ' ' || i < fixed ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
          .join('');
        if (p < 1) raf = requestAnimationFrame(tick);
        else el.textContent = final;
      };
      raf = requestAnimationFrame(tick);
    };

    host.addEventListener('mouseenter', run);
    return () => {
      host.removeEventListener('mouseenter', run);
      cancelAnimationFrame(raf);
      el.textContent = final;
    };
  }, [children]);

  return <span ref={ref}>{children}</span>;
}
