import { useSyncExternalStore } from 'react';
import { createEmitter } from './store.js';

// Trạng thái screensaver ('awake' | 'nap' | 'wake'): Alive.jsx ghi vào, mọi nơi khác chỉ đọc.
// Đây là NGUỒN DUY NHẤT cho câu hỏi "có nên dừng animation / timer không?":
//   - CSS: cờ `data-nap` trên <html> tạm dừng mọi animation CSS (xem index.css)
//   - SVG: SMIL (<animate>) không chịu ảnh hưởng của CSS nên bị dừng thẳng ở đây
//   - JS: dùng isPaused() / onPauseChange() (hoặc lib/loop.js, lib/timers.js đã bọc sẵn) cho rAF, interval, timeout
let state = 'awake';
const { subscribe, emit } = createEmitter();

export const isNapping = () => state === 'nap'; // screensaver đang phủ màn hình: mọi animation nền đều vô hình, nên dừng hẳn

// "Không ai nhìn": screensaver đang chạy HOẶC tab bị ẩn. Vòng lặp nền nào cũng nên đứng yên khi giá trị này true.
export const isPaused = () => isNapping() || document.hidden;

// SMIL chạy theo đồng hồ riêng của từng <svg>, `animation-play-state` không với tới được
const setSvgPaused = (paused) =>
  document.querySelectorAll('svg').forEach((svg) => (paused ? svg.pauseAnimations?.() : svg.unpauseAnimations?.()));

export const setNapState = (s) => {
  if (s === state) return;
  const wasNap = state === 'nap';
  state = s;
  // CSS đọc cờ này để tạm dừng MỌI animation vô hạn (xem index.css, khối `data-nap`) mà không phải sửa từng component
  document.documentElement.toggleAttribute('data-nap', s === 'nap');
  if ((s === 'nap') !== wasNap) setSvgPaused(s === 'nap');
  emit();
};

// cho code ngoài React (vòng rAF, interval): gọi cb mỗi khi đổi trạng thái, dùng isNapping() để biết đang ngủ hay vừa dậy. Trả về hàm huỷ.
export const onNapChange = subscribe;

// như onNapChange nhưng gọi cả khi tab ẩn / hiện lại: dùng isPaused() trong cb để biết đang dừng hay chạy tiếp
export function onPauseChange(cb) {
  const off = subscribe(cb);
  document.addEventListener('visibilitychange', cb);
  return () => {
    off();
    document.removeEventListener('visibilitychange', cb);
  };
}

export const useNap = () => useSyncExternalStore(subscribe, () => state);
