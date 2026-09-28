import { useEffect, useRef, useState } from 'react';
import './Signature.css';

export function Signature() {
  const ref = useRef(null);
  const [drawn, setDrawn] = useState(false);

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

  return (
    <section id="signature" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8 flex justify-center">
        <div
          ref={ref}
          className="sig-card relative w-[300px] h-[190px] bg-panel grid place-content-center rounded-[10px] overflow-hidden transition-all duration-500 hover:scale-105"
        >
          <div className="sig-border absolute inset-0 border-2 rounded-[10px]" style={{ borderColor: 'var(--amber)' }} />
          <div className="text-center transition-all duration-500">
            <svg viewBox="0 0 200 70" className="w-[200px] h-[70px] mx-auto mb-1 overflow-visible" role="img" aria-label="Zune">
              <text x="100" y="52" textAnchor="middle" className={`sig-text${drawn ? ' is-drawn' : ''}`}>
                Zune
              </text>
            </svg>
            <span className="font-mono text-[13px] text-dim tracking-[0.14em]">zune.dev</span>
          </div>
          <span
            className="sig-bottom absolute left-1/2 -translate-x-1/2 bottom-3.5 font-mono text-[9px] uppercase tracking-[3px] bg-panel px-1.5 whitespace-nowrap"
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