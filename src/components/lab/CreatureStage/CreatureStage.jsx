import { useEffect, useRef, useState } from 'react';
import { onThemeChange } from '../../../lib/themeSync.js';
import { frameLoop } from '../../../lib/loop.js';
import { cssVar, fitCanvas } from '../../../lib/canvas.js';
import { isCoarsePointer, touchText } from '../../../lib/env.js';
import { PANEL } from '../../../config/ui.js';

// Sân khấu dùng chung cho các sinh vật trong lab (Moths, Reptile, Mother, Choir...).
// Lo hết phần việc lặp lại: canvas + DPR, màu theo theme, con trỏ, vòng lặp "ngủ thật", nút respawn.
// Mỗi sinh vật chỉ là một hàm `make(w, h)` trả về { label, step(api) }:
//   label  chữ nhỏ ở góc khung (vd "move your cursor · 6 legs")
//   step   gọi mỗi khung hình; vẽ trực tiếp lên api.ctx
//   caption (tùy chọn) hàm trả chữ nhỏ ở góc khung; được hỏi mỗi khung nên chữ đổi được theo diễn biến (vd "it's inside")
//   unlock (tùy chọn) gọi NGAY trong sự kiện chạm/bấm của người dùng (pointerdown/up, touchend, click); dùng để bật âm thanh,
//     vì iOS Safari chỉ cho AudioContext chạy khi được bật ngay trong sự kiện, không phải trong vòng vẽ
//   destroy (tùy chọn) dọn dẹp khi respawn / rời trang (vd đóng AudioContext của Choir)
//   Muốn tự vẽ con trỏ: gán ctx.canvas.style.cursor = 'none' trong step; stage tự trả lại khi dọn
// api = {
//   ctx, w, h        canvas và kích thước (px CSS). w/h có thể đổi khi resize: luôn đọc lại, đừng cache
//   t, dt            thời gian chạy (giây) và bước thời gian của khung này (đã chặn ≤ 50ms)
//   colors           { ink, amber, dim, green, line, panel } đã theo theme hiện tại
//   mouse            { x, y, down, inside, clicks }  clicks tăng 1 mỗi lần bấm: so sánh với lần trước để biết có bấm mới
//   aim              { x, y }  nơi sinh vật nên nhìn/đi tới: con trỏ, hoặc điểm đi dạo khi bạn đứng yên > 2.5s
//   idle             số giây kể từ lần con trỏ cử động cuối
// }
const IDLE_S = 2.5;

// minFrameMs: giới hạn tốc độ khung (vd 33 = ~30 khung/giây). Khung bị bỏ qua thì KHÔNG xoá canvas, hình cũ giữ nguyên (không nhấp nháy)
export default function CreatureStage({ make, height = 380, minFrameMs = 0 }) {
  const wrap = useRef(null);
  const cvs = useRef(null);
  const labelEl = useRef(null);
  const [label, setLabel] = useState('');
  const [nonce, setNonce] = useState(0);
  const [play, setPlay] = useState(true); // cảm ứng: true = kéo ngón để chơi với con vật, false = kéo để cuộn trang

  useEffect(() => {
    const canvas = cvs.current;
    const box = wrap.current;
    const ctx = canvas.getContext('2d');
    const colors = {};
    canvas.style.cursor = '';

    // màu canvas phải đọc lại NGAY khi đổi theme (xem lib/themeSync.js), nếu không con vật vẽ bằng màu cũ trên nền mới
    const readColors = () => {
      const cs = getComputedStyle(box);
      colors.ink = cs.color;
      colors.amber = cssVar(cs, '--amber');
      colors.dim = cssVar(cs, '--text-dim');
      colors.green = cssVar(cs, '--green');
      colors.line = cssVar(cs, '--line');
      colors.panel = cssVar(cs, '--panel');
    };
    readColors();
    const offTheme = onThemeChange(readColors);

    const api = {
      ctx,
      w: 0,
      h: 0,
      t: 0,
      dt: 0,
      colors,
      mouse: { x: 0, y: 0, down: false, inside: false, clicks: 0 },
      aim: { x: 0, y: 0 },
      idle: IDLE_S + 1, // chưa ai động vào: cho đi dạo ngay
    };
    const resize = () => {
      api.w = box.clientWidth;
      api.h = box.clientHeight;
      fitCanvas(canvas, ctx, api.w, api.h);
    };
    resize();
    api.mouse.x = api.w * 0.75;
    api.mouse.y = api.h * 0.4;

    const coarse = isCoarsePointer();
    const creature = make(api.w, api.h);
    const firstLabel = touchText(creature.label, coarse);
    setLabel(firstLabel);
    if (labelEl.current) labelEl.current.textContent = firstLabel; // respawn: xoá chữ caption cũ ngay, không chờ React

    const move = (e) => {
      const r = canvas.getBoundingClientRect();
      api.mouse.x = e.clientX - r.left;
      api.mouse.y = e.clientY - r.top;
      api.mouse.inside = true;
      api.idle = 0;
    };
    const unlock = () => creature.unlock?.();
    const down = (e) => {
      move(e);
      api.mouse.down = true;
      api.mouse.clicks++;
      unlock();
    };
    const up = () => {
      api.mouse.down = false;
      unlock();
    };
    const leave = () => {
      api.mouse.down = false;
      api.mouse.inside = false;
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', leave);
    // iOS Safari chỉ tính touchend / click là cử chỉ mở khoá âm thanh (pointerdown thì không)
    canvas.addEventListener('touchend', unlock, { passive: true });
    canvas.addEventListener('click', unlock);

    const ro = new ResizeObserver(resize);
    ro.observe(box);

    let last = 0;
    let lastDraw = -Infinity;
    const tick = (ms) => {
      if (ms - lastDraw < minFrameMs) return;
      lastDraw = ms;
      api.dt = last ? Math.min(0.05, (ms - last) / 1000) : 1 / 60;
      last = ms;
      api.t += api.dt;
      api.idle += api.dt;
      if (api.idle > IDLE_S) {
        // bạn đứng yên: sinh vật tự đi dạo theo một quỹ đạo chậm (Lissajous)
        api.aim.x = api.w * (0.5 + 0.34 * Math.sin(api.t * 0.37));
        api.aim.y = api.h * (0.5 + 0.3 * Math.sin(api.t * 0.53 + 1));
      } else {
        api.aim.x = api.mouse.x;
        api.aim.y = api.mouse.y;
      }
      ctx.clearRect(0, 0, api.w, api.h);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = colors.ink;
      ctx.fillStyle = colors.ink;
      ctx.globalAlpha = 1;
      creature.step(api);
      ctx.globalAlpha = 1;
      if (creature.caption && labelEl.current) {
        const text = touchText(creature.caption(), coarse);
        if (text !== lastCaption) {
          lastCaption = text;
          labelEl.current.textContent = text;
        }
      }
    };
    let lastCaption = firstLabel;
    const loop = frameLoop(tick, { watch: box, onResume: () => (last = 0) });

    return () => {
      loop.stop();
      creature.destroy?.();
      canvas.style.cursor = '';
      ro.disconnect();
      offTheme();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('touchend', unlock);
      canvas.removeEventListener('click', unlock);
    };
  }, [nonce, make, minFrameMs]);

  return (
    <div className={PANEL}>
      <div
        ref={wrap}
        className="relative rounded-lg border border-line overflow-hidden text-ink"
        style={{ height, background: 'var(--panel)' }}
      >
        <canvas
          ref={cvs}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: play ? 'none' : 'pan-y' }} // none: kéo ngón là chơi (không bị trang cuộn cướp); pan-y: kéo dọc để cuộn
        />
        <span ref={labelEl} className="absolute top-2.5 left-3 right-3 font-mono text-[12px] text-dim pointer-events-none">{label}</span>
      </div>
      <div className="flex gap-2.5 mt-4">
        <button
          type="button"
          onClick={() => setNonce((n) => n + 1)}
          className="lab-cell px-3.5 py-1.5 rounded-md border border-line hover:border-amber text-ink font-mono text-[13px]"
        >
          respawn
        </button>
        {/* chỉ hiện trên màn cảm ứng: canvas chiếm gần nửa màn hình nên cần cách để cuộn trang khi ngón đang đặt trên đó */}
        <button
          type="button"
          aria-pressed={play}
          onClick={() => setPlay((p) => !p)}
          className="lab-cell hidden pointer-coarse:inline-flex items-center px-3.5 py-1.5 rounded-md border border-line text-ink font-mono text-[13px]"
          style={play ? { borderColor: 'var(--amber)' } : undefined}
        >
          {play ? 'drag: play' : 'drag: scroll'}
        </button>
      </div>
    </div>
  );
}
