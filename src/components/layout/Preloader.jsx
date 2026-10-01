import { useEffect, useState } from 'react';
import './Preloader.css';

export default function Preloader() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, 900));
    const pageLoad = new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });
    // Không chờ vô hạn: nếu 1 resource (vd Google Fonts) treo thì vẫn mở site sau 4s.
    const maxWait = new Promise((resolve) => setTimeout(resolve, 4000));

    let removeTimer;
    Promise.all([minDelay, Promise.race([pageLoad, maxWait])]).then(() => {
      setHidden(true);
      removeTimer = setTimeout(() => setRemoved(true), 500);
    });
    return () => clearTimeout(removeTimer);
  }, []);

  if (removed) return null;

  return (
    <div
      id="preloader"
      className={`fixed inset-0 z-[999] bg-bg flex flex-col items-center justify-center gap-[22px]${
        hidden ? ' hide' : ''
      }`}
    >
      <div className="relative w-[72px] h-[72px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="banter-loader__box" />
        ))}
      </div>
      <span className="font-mono text-[13px] text-dim">booting zune.dev …</span>
    </div>
  );
}
