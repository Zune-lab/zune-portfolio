import { getDpr } from './env.js';

// Chỉnh kích thước bộ đệm canvas theo `w` x `h` (px CSS) và mật độ điểm ảnh, rồi đặt lại hệ toạ độ
// để mã vẽ vẫn dùng px CSS. Trả về dpr đã dùng.
export function fitCanvas(canvas, ctx, w, h, dpr = getDpr()) {
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return dpr;
}
