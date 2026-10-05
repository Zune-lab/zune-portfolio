import { useSyncExternalStore } from 'react';

// Trạng thái screensaver ('awake' | 'nap' | 'wake'): Alive.jsx ghi vào, các trang khác (about.js...) chỉ đọc.
let state = 'awake';
const listeners = new Set();

export const isNapping = () => state === 'nap'; // screensaver đang phủ màn hình: mọi animation nền đều vô hình, nên dừng hẳn

export const setNapState = (s) => {
  if (s === state) return;
  state = s;
  // CSS đọc cờ này để tạm dừng MỌI animation vô hạn (xem index.css, khối `data-nap`) mà không phải sửa từng component
  document.documentElement.toggleAttribute('data-nap', s === 'nap');
  listeners.forEach((l) => l());
};
const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
// cho code ngoài React (vòng rAF, interval): gọi cb mỗi khi đổi trạng thái, dùng isNapping() để biết đang ngủ hay vừa dậy. Trả về hàm huỷ.
export const onNapChange = subscribe;
export const useNap = () => useSyncExternalStore(subscribe, () => state);
