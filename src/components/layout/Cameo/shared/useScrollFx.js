import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../../../lib/env.js';

// Cho nhân vật phản ứng khi trang cuộn. handler({ y, vel, dir, progress, scrolling }) được gọi mỗi khung hình khi đang cuộn
// (vel: px/giây, có dấu; dir: -1 lên / 1 xuống; progress: 0..1 trên toàn trang), và đúng một lần nữa khi vừa dừng cuộn (scrolling:false, vel:0).
// Còn gọi một lần lúc mount để nhân vật vào đúng chỗ. Không chạy khi người dùng bật "giảm chuyển động".
export default function useScrollFx(handler, { idleMs = 220, enabled = true } = {}) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return undefined;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let vel = 0;
    let dir = 0;
    let raf = 0;
    let idle = 0;
    const progress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 40 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    const emit = (scrolling) => ref.current({ y: window.scrollY, vel, dir, progress: progress(), scrolling });
    const tick = () => {
      raf = 0;
      const now = performance.now();
      const y = window.scrollY;
      const dy = y - lastY;
      vel = vel * 0.7 + (dy / Math.max(1, now - lastT)) * 1000 * 0.3;
      if (dy) dir = Math.sign(dy);
      lastY = y;
      lastT = now;
      emit(true);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
      clearTimeout(idle);
      idle = window.setTimeout(() => {
        vel = 0;
        emit(false);
      }, idleMs);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    emit(false);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      clearTimeout(idle);
    };
  }, [enabled, idleMs]);
}
