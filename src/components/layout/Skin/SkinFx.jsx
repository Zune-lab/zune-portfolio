import { useEffect, useRef, useState } from 'react';
import { skinById } from '../../../config/skins.js';
import useSkin from '../../../lib/useSkin.js';
import { isPaused } from '../../../lib/nap.js';
import { prefersReducedMotion } from '../../../lib/env.js';
import { onThemeChange } from '../../../lib/themeSync.js';

// Lớp hiệu ứng của skin: hai lớp CSS (src/styles/skins/: scanline CRT, mặt trời vaporwave...) + canvas mưa chữ cho skin matrix.
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
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      // thanh địa chỉ iOS / Android co giãn khi cuộn chỉ đổi innerHeight vài chục px: đừng cấp lại canvas (xoá sạch mưa + giật).
      // Không nhân devicePixelRatio: canvas 2x nặng gấp ~2 lần trên điện thoại (đã đo), chữ hơi mềm trên màn retina là đánh đổi có chủ ý.
      if (w && nw === w && Math.abs(nh - h) < 160) return;
      w = canvas.width = nw;
      h = canvas.height = nh;
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

// khay hệ thống của skin retro-os: nút tác vụ + đồng hồ thật nằm trên thanh taskbar (thanh và nút Start vẽ bằng CSS)
function RetroTray() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <>
      <span className="rt-task">zune.dev</span>
      <span className="rt-clock">
        {hh}:{mm}
      </span>
    </>
  );
}

export default function SkinFx() {
  const { skin } = useSkin();
  const name = (skinById(skin)?.label ?? skin).toUpperCase();
  return (
    <>
      <div className="skin-fx-back" aria-hidden="true">
        <i className="fx-tile fx-tile-a" />
        <i className="fx-tile fx-tile-b" />
      </div>
      <div className="skin-fx-top" aria-hidden="true" data-name={name}>
        {skin === 'retro-os' && <RetroTray />}
      </div>
      {skin === 'matrix' && <MatrixRain />}
    </>
  );
}
