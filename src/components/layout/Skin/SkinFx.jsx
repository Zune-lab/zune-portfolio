import { useEffect, useRef } from 'react';
import useSkin from '../../../lib/useSkin.js';
import { isPaused } from '../../../lib/nap.js';
import { prefersReducedMotion } from '../../../lib/env.js';
import { onThemeChange } from '../../../lib/themeSync.js';

// Lớp hiệu ứng của skin: hai lớp CSS (src/styles/skins.css: scanline CRT, mặt trời vaporwave...) + canvas mưa chữ cho skin matrix.
// Mọi lớp đều không bắt chuột và ẩn với trình đọc màn hình.
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789{}<>/=;:+*';
const SIZE = 16; // px mỗi ô chữ
const STEP_MS = 70; // ~14 khung/giây: đủ để mưa chữ trôi mà gần như không tốn máy

function MatrixRain() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduce = prefersReducedMotion();
    let w = 0;
    let h = 0;
    let drops = [];
    let raf = 0;
    let last = 0;
    let head = '#ccffd8';
    let body = '#00ff41';

    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      head = css.getPropertyValue('--amber').trim() || head;
      body = css.getPropertyValue('--glow').trim() || body;
    };
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      ctx.font = `${SIZE}px monospace`;
      drops = Array.from({ length: Math.ceil(w / SIZE) }, () => Math.random() * -40);
    };
    const draw = () => {
      // làm mờ dần lớp cũ (xoá một phần độ trong suốt) để chữ để lại vệt, canvas vẫn trong suốt nên thấy nền trang
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * SIZE;
        if (y > 0) {
          ctx.fillStyle = body;
          ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * SIZE, y - SIZE);
          ctx.fillStyle = head;
          ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * SIZE, y);
        }
        drops[i] = y > h && Math.random() > 0.975 ? Math.random() * -20 : drops[i] + 1;
      }
    };
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      if (t - last < STEP_MS || isPaused()) return; // tab ẩn / screensaver: không vẽ gì
      last = t;
      draw();
    };

    readColors();
    resize();
    if (reduce) {
      for (let i = 0; i < 40; i++) draw(); // giảm chuyển động: vẽ sẵn một khung tĩnh rồi đứng yên
    } else {
      raf = requestAnimationFrame(loop);
    }
    const off = onThemeChange(readColors);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      off();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="skin-fx-rain" aria-hidden="true" />;
}

export default function SkinFx() {
  const { skin } = useSkin();
  return (
    <>
      <div className="skin-fx-back" aria-hidden="true" />
      <div className="skin-fx-top" aria-hidden="true" />
      {skin === 'matrix' && <MatrixRain />}
    </>
  );
}
