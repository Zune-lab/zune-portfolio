import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../../lib/env.js';
import './BackToTop.css';

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Back to top"
      className={`back-to-top fixed right-6 bottom-6 z-[60] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer overflow-hidden bg-panel border border-line shadow-[0_4px_20px_-6px_rgba(0,0,0,0.5)] ${
        show ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-3'
      }`}
    >
      <svg className="back-to-top-icon w-3.5 h-3.5 flex-none text-ink" viewBox="0 0 384 512">
        <path
          fill="currentColor"
          d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"
        />
      </svg>
      <span
        className="back-to-top-label absolute inset-0 flex items-center justify-center font-mono text-xs whitespace-nowrap"
        style={{ color: 'var(--on-amber)' }}
      >
        Back to Top
      </span>
    </button>
  );
}
