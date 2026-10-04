import { useSyncExternalStore } from 'react';

// Trạng thái screensaver ('awake' | 'nap' | 'wake'): Alive.jsx ghi vào, các trang khác (about.js...) chỉ đọc.
let state = 'awake';
const listeners = new Set();

export const getNapState = () => state;
export const isNapping = () => state === 'nap'; // screensaver đang phủ màn hình: mọi animation nền đều vô hình, nên dừng hẳn

export const setNapState = (s) => {
  if (s === state) return;
  state = s;
  listeners.forEach((l) => l());
};
const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
export const useNap = () => useSyncExternalStore(subscribe, () => state);
