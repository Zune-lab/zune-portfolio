import { useEffect, useState } from 'react';
import './Preloader.css';
import { site } from '../../../config/site.js';

export default function Preloader() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timers = [];
    const wait = (ms) => new Promise((resolve) => timers.push(setTimeout(resolve, ms)));
    const minDelay = wait(900);
    let onLoad = null;
    const pageLoad = new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else {
        onLoad = resolve;
        window.addEventListener('load', onLoad, { once: true });
      }
    });
    // Không chờ vô hạn: nếu 1 resource (vd Google Fonts) treo thì vẫn mở site sau 4s.
    const maxWait = wait(4000);

    Promise.all([minDelay, Promise.race([pageLoad, maxWait])]).then(() => {
      if (cancelled) return;
      setHidden(true);
      timers.push(setTimeout(() => setRemoved(true), 500));
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (onLoad) window.removeEventListener('load', onLoad);
    };
  }, []);

  if (removed) return null;

  return (
    <div
      id="preloader"
      className={`fixed inset-0 z-[999] bg-bg flex flex-col items-center justify-center gap-[22px] ${
        hidden ? 'hide' : ''
      }`}
    >
      <div className="relative w-[72px] h-[72px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="banter-loader__box" />
        ))}
      </div>
      <span className="font-mono text-[13px] text-dim">booting {site.handle} …</span>
    </div>
  );
}
