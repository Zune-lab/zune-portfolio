import { useEffect, useState } from 'react';
import './Loader.css';

// `show` goes false -> the overlay fades out (~180ms) before it unmounts, instead of cutting away in one frame.
export default function Loader({ show }) {
  const [mounted, setMounted] = useState(show);

  useEffect(() => {
    if (show) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [show]);

  if (!show && !mounted) return null;

  return (
    <div className={`page-loader fixed inset-0 z-[90] flex items-center justify-center${show ? '' : ' is-leaving'}`}>
      <div className="loader">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="loader-square" />
        ))}
      </div>
    </div>
  );
}
