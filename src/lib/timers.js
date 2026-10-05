import { isPaused, onPauseChange } from './nap.js';

// Timer lặp "ngủ thật": bị HUỶ HẲN khi screensaver (nap) đang chạy hoặc tab bị ẩn (không còn đánh thức luồng chính),
// tự hẹn lại khi hết nghỉ. Dùng cho mọi việc định kỳ nằm ngoài vòng rAF (đồng hồ, kiểm tra giờ, sạc pin, ma tự làm việc...).
//   fn        việc cần làm mỗi lượt
//   ms        số ms giữa hai lượt, hoặc hàm trả số ms (vd ngẫu nhiên) gọi lại trước MỖI lượt
//   onResume  (tuỳ chọn) chạy ngay khi hết nghỉ, nhận số ms đã nghỉ; mặc định gọi fn một lần để cập nhật tức thì
// Trả về hàm huỷ (dùng thẳng làm cleanup của useEffect).
export function pausableInterval(fn, ms, { onResume = () => fn() } = {}) {
  let id = 0;
  let pausedAt = 0;
  let dead = false;
  const arm = () => {
    id = window.setTimeout(() => {
      id = 0;
      fn();
      if (!dead && !id && !isPaused()) arm();
    }, typeof ms === 'function' ? ms() : ms);
  };
  const sync = () => {
    if (dead) return;
    if (isPaused()) {
      if (!id) return;
      clearTimeout(id);
      id = 0;
      pausedAt = performance.now();
    } else if (!id) {
      const gap = pausedAt ? performance.now() - pausedAt : 0;
      pausedAt = 0;
      arm();
      if (gap) onResume(gap);
    }
  };
  const off = onPauseChange(sync);
  sync();
  return () => {
    dead = true;
    clearTimeout(id);
    id = 0;
    off();
  };
}
