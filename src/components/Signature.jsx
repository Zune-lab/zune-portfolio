import { useEffect, useRef, useState } from 'react';
import './Signature.css';

export function Signature() {
  const ref = useRef(null);
  const [drawn, setDrawn] = useState(false); // V đã vẽ nét chưa (khi cuộn tới)
  const [open, setOpen] = useState(false); // V → √uong
  const pointer = useRef('mouse'); // loại con trỏ của lần nhấn gần nhất

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // chuột: hover mở/đóng. cảm ứng/bút: onClick bật tắt (không dùng :hover vì bị "dính" trên mobile)
  const isMouse = (e) => e.pointerType === 'mouse';
  const onClick = () => pointer.current !== 'mouse' && setOpen((o) => !o);
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  return (
    <section id="signature" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8 flex justify-center">
        <div
          ref={ref}
          role="button"
          tabIndex={0}
          aria-pressed={open}
          aria-label="Vuong, zune.dev"
          className={`sig-card relative w-[300px] h-[190px] bg-panel grid place-content-center rounded-[10px] overflow-hidden transition-all duration-500${open ? ' is-open' : ''}`}
          onPointerEnter={(e) => isMouse(e) && setOpen(true)}
          onPointerLeave={(e) => isMouse(e) && setOpen(false)}
          onPointerDown={(e) => (pointer.current = e.pointerType)}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        >
          <div className="sig-border absolute inset-0 border-2 rounded-[10px]" style={{ borderColor: 'var(--amber)' }} />
          <div className="text-center">
            {/* mặc định chỉ là chữ V; mở: V thành dấu căn, thanh gạch dài ra phủ "uong" */}
            <div className="sig-logo mx-auto mb-1">
              <svg viewBox="0 0 200 74" className={`sig-svg${drawn ? ' is-drawn' : ''}`} aria-hidden="true">
                <path className="sig-v" d="M8 16 L26 58 L44 16" pathLength="100" />
                <path className="sig-bar" d="M44 16 H194" pathLength="100" />
                <text className="sig-rest" x="56" y="58" textLength="130" lengthAdjust="spacing">
                  uong
                </text>
              </svg>
            </div>
            <span className="font-mono text-[13px] text-dim tracking-[0.14em]">zune.dev</span>
          </div>
          <span
            className="sig-bottom absolute left-1/2 -translate-x-1/2 bottom-3.5 font-mono text-[9px] uppercase bg-panel px-1.5 whitespace-nowrap"
            style={{ color: 'var(--amber)' }}
          >
            handcrafted, not templated
          </span>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="py-9 text-center font-mono text-[12.5px] text-dim border-t border-line">
      // built solo in Ho Chi Minh City · © 2026 zune
    </footer>
  );
}
