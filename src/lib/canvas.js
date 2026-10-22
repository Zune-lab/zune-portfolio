import { getDpr } from './env.js';

// Chỉnh kích thước bộ đệm canvas theo `w` x `h` (px CSS) và mật độ điểm ảnh, rồi đặt lại hệ toạ độ
// để mã vẽ vẫn dùng px CSS. Trả về dpr đã dùng.
export function fitCanvas(canvas, ctx, w, h, dpr = getDpr()) {
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return dpr;
}

// Giá trị dự phòng (bảng màu dark theme, khớp :root trong index.css) cho lúc biến CSS chưa có. Khai báo MỘT chỗ này
// thay vì mỗi canvas tự chép lại mã hex.
const FALLBACK = {
  '--bg': '#0a0c10',
  '--panel': '#10141b',
  '--line': '#1d232c',
  '--text': '#dce1e8',
  '--text-dim': '#8a93a3',
  '--amber': '#ffc857',
  '--green': '#7ee081',
};

// Đọc một biến CSS (vd '--amber') từ computed style `cs`; chưa có thì dùng `fallback` (mặc định: bảng FALLBACK ở trên).
// Canvas không đọc được biến CSS trực tiếp nên mỗi nơi vẽ phải đọc lại bằng hàm này (xem thêm lib/themeSync.js).
export const cssVar = (cs, name, fallback = FALLBACK[name]) => cs.getPropertyValue(name).trim() || fallback;
