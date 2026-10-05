import { useEffect, useRef } from 'react';
import { onThemeChange } from '../../../lib/themeSync.js';
import { cssVar, fitCanvas } from '../../../lib/canvas.js';
import { frameLoop } from '../../../lib/loop.js';
import { isNapping } from '../../../lib/nap.js';
import { prefersReducedMotion } from '../../../lib/env.js';
import { clamp, TAU } from '../../../lib/math.js';

// "Trang web có nhịp tim": vạch tiến độ cuộn ở mép TRÊN là một máy đo nhịp tim (ECG) chạy ngang màn hình.
//  - đầu vạch (chấm sáng) nằm ở vị trí đang đọc tới (= tiến độ cuộn); phía sau nó là điện tâm đồ chạy lùi về bên trái
//  - nhịp tim thật sự phản ứng: để yên ~58 bpm, cuộn càng nhanh tim càng đập nhanh và mạnh (tối đa ~160 bpm: "doomscrolling")
//  - trang đang ngủ gật (screensaver) thì tim chậm lại; họp khẩn cấp thì loạn nhịp; cuộn xuống đáy trang thì "flatline" (đường thẳng),
//    cuộn ngược lại thì hồi sinh ("it's alive!")
//  - góc phải có dòng chữ: ♥ 72 bpm · reading
// Bật "giảm chuyển động": chỉ còn vạch tiến độ phẳng, không có nhịp, không có chữ.

const H = 18; // cao của dải canvas (px)
const BASE = 13; // đường nền (px từ mép trên); nhịp đập vọt lên phía mép trên
const PEAK = 11; // biên độ tối đa (px)
const L = 140; // khoảng cách giữa hai nhịp (px) trên màn hình

// một nhịp tim PQRST dạng tổng các hàm Gauss; u chạy 0..1 trong một nhịp
const WAVES = [
  [0.12, 0.13, 0.035], // P
  [0.255, -0.14, 0.012], // Q
  [0.285, 1, 0.012], // R (đỉnh cao)
  [0.318, -0.28, 0.014], // S
  [0.54, 0.24, 0.06], // T
];
const beat = (u) => {
  let y = 0;
  for (const [c, a, w] of WAVES) y += a * Math.exp(-(((u - c) / w) ** 2));
  return y;
};

const wordFor = (bpm) => (bpm > 130 ? 'doomscrolling' : bpm > 100 ? 'skimming' : bpm > 72 ? 'reading' : 'resting');

export default function Pulse({ napping, panic }) {
  const cvs = useRef(null);
  const heart = useRef(null);
  const text = useRef(null);
  const mood = useRef({ napping, panic });
  mood.current = { napping, panic };

  useEffect(() => {
    const canvas = cvs.current;
    const ctx = canvas.getContext('2d');
    const rm = prefersReducedMotion();
    let W = 0;
    let fl = null; // frameLoop (lib/loop.js): huỷ hẳn rAF khi screensaver / tab ẩn
    let last = 0;
    let ph = 0; // pha nhịp tim (số nhịp đã đập)
    let beats = 0;
    let vel = 0; // vận tốc cuộn đã làm mượt (px/s)
    let bpm = 58;
    let p = 0; // tiến độ cuộn (đã làm mượt) 0..1
    let life = 1; // 1 = sống, 0 = flatline
    let wasFlat = false;
    let reviveUntil = 0;
    let lastY = window.scrollY;
    let labelAt = 0;
    let amber = '#ffc857';
    let dim = '#8a93a3';

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      amber = cssVar(cs, '--amber', amber);
      dim = cssVar(cs, '--text-dim', dim);
    };
    readColors();
    // chế độ giảm chuyển động không có vòng rAF: phải tự vẽ lại khi đổi theme, không thì vạch kẹt màu cũ
    const offTheme = onThemeChange(() => {
      readColors();
      if (rm) drawStatic();
    });

    const resize = () => {
      W = canvas.clientWidth || window.innerWidth;
      fitCanvas(canvas, ctx, W, H);
    };
    resize();

    // tiến độ cuộn 0..1 (trang quá ngắn thì coi như 0)
    const scrollProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 40 ? clamp(window.scrollY / max, 0, 1) : 0;
    };

    const draw = (t, dt) => {
      const k = dt / 16.667;
      const target = scrollProgress();
      p += (target - p) * Math.min(1, 0.3 * k);
      const headX = Math.max(3, p * (W - 6));
      const flat = target >= 0.995;

      // --- nhịp tim
      const dy = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      vel = vel * 0.86 + ((dy / Math.max(1, dt)) * 1000) * 0.14;
      const m = mood.current;
      const want = m.panic ? 190 : m.napping ? 36 : 58 + clamp(vel / 22, 0, 100) + Math.sin(t / 1300) * 2;
      bpm += (want - bpm) * Math.min(1, (want > bpm ? 0.12 : 0.025) * k); // tăng nhanh, hạ chậm như tim thật
      ph += (bpm / 60) * (dt / 1000);
      if (Math.floor(ph) !== beats) {
        beats = Math.floor(ph);
        if (!flat) heart.current?.animate([{ transform: 'scale(1.7)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
      }
      life += ((flat ? 0 : 1) - life) * Math.min(1, 0.1 * k);
      if (wasFlat && !flat) reviveUntil = t + 1600;
      wasFlat = flat;
      const amp = (0.5 + clamp(vel / 3200, 0, 0.5) + (m.panic ? 0.2 : 0)) * life;

      // --- vẽ
      ctx.clearRect(0, 0, W, H);
      // phần đã đọc: điện tâm đồ
      ctx.globalAlpha = 1;
      ctx.strokeStyle = amber;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let yHead = BASE;
      for (let x = 0; x <= headX; x += 2) {
        const u = ph - (headX - x) / L; // nhịp sinh ra ở đầu vạch rồi trôi dần về bên trái
        const y = BASE - beat(u - Math.floor(u)) * amp * PEAK;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        yHead = y;
      }
      ctx.stroke();
      // mờ dần về phía mép trái (mặt nạ theo alpha, không pha màu nên không bị đục)
      const fade = ctx.createLinearGradient(0, 0, Math.max(headX, 1), 0);
      fade.addColorStop(0, 'rgba(0,0,0,0.12)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, Math.max(headX, 1), H);
      ctx.globalCompositeOperation = 'source-over';
      // phần chưa tới: đường nền chấm chấm mờ
      ctx.setLineDash([2, 7]);
      ctx.strokeStyle = dim;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(headX, BASE);
      ctx.lineTo(W, BASE);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // chấm sáng ở đầu vạch
      ctx.fillStyle = amber;
      ctx.shadowColor = amber;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(headX, yHead, 2.4, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;

      // --- chữ ở góc phải (cập nhật ~6 lần/giây)
      if (t - labelAt > 160 && text.current) {
        labelAt = t;
        let s;
        if (flat && life < 0.2) s = '0 bpm · flatline';
        else if (t < reviveUntil) s = `${Math.round(bpm)} bpm · it's alive!`;
        else if (m.panic) s = `${Math.round(bpm)} bpm · EMERGENCY`;
        else if (m.napping) s = `${Math.round(bpm)} bpm · napping`;
        else s = `${Math.round(bpm)} bpm · ${wordFor(bpm)}`;
        if (text.current.textContent !== s) text.current.textContent = s;
      }
    };

    // giảm chuyển động: chỉ vẽ vạch tiến độ phẳng khi cuộn / đổi cỡ
    const drawStatic = () => {
      const x = Math.max(3, scrollProgress() * (W - 6));
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = amber;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, BASE);
      ctx.lineTo(x, BASE);
      ctx.stroke();
      ctx.fillStyle = amber;
      ctx.beginPath();
      ctx.arc(x, BASE, 2.4, 0, TAU);
      ctx.fill();
    };

    const onResize = () => {
      resize();
      if (rm) drawStatic();
    };
    window.addEventListener('resize', onResize);
    let ro = null;
    if (rm) {
      drawStatic();
      window.addEventListener('scroll', drawStatic, { passive: true });
      ro = new ResizeObserver(drawStatic); // trang đổi chiều cao thì vẽ lại
      ro.observe(document.body);
    } else {
      const tick = (t) => {
        const dt = last ? Math.min(50, t - last) : 16.667;
        last = t;
        draw(t, Math.max(1, dt));
      };
      // screensaver (napping) phủ mờ cả màn hình -> HUỶ hẳn vòng rAF (không chỉ bỏ qua khung), đường ECG đứng yên ở khung cuối;
      // dậy thì chạy lại (last = 0 để không bị tính một bước dt khổng lồ)
      fl = frameLoop(tick, {
        onResume: () => (last = 0),
        onPause: () => {
          if (!isNapping() || !text.current) return;
          text.current.textContent = 'zzz · napping'; // đứng hình ở khung cuối; chữ đổi theo
          labelAt = 0;
        },
      });
    }
    return () => {
      fl?.stop();
      offTheme();
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', drawStatic);
    };
  }, []);

  return (
    <div className="pulse" aria-hidden="true">
      <canvas ref={cvs} className="pulse-cvs" style={{ height: H }} />
      <div className="pulse-label">
        <span ref={heart} className="pulse-heart">
          ♥
        </span>
        <span ref={text}>58 bpm · resting</span>
      </div>
    </div>
  );
}
