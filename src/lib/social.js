import { useSyncExternalStore } from 'react';
import { getStatusKey } from './status.js';

// "Pin xã hội" của Zune dùng chung cho: thẻ zune.sav, sâu chữ ở hero và terminal (lệnh battery / konami).
// Là store ngoài React để canvas (HeroWorm) đọc được mỗi khung hình mà không phải re-render.
export const BASE = { online: 80, busy: 40, focus: 20, offline: 10 };
const REPLIES = ['hi.', 'oh. hello again.', 'ok, that was a lot of talking', 'running low on words...'];
const MAX_MS = 9000;

// hiAt / maxAt: mốc performance.now() của lần "say hi" / mở khoá gần nhất, để sâu chữ biết có sự kiện mới
let state = { drain: 0, months: 0, maxed: false, reply: '', hiAt: 0, maxAt: 0 };
const listeners = new Set();
let chargeTimer = null;
let maxTimer = 0;

const emit = () => listeners.forEach((l) => l());
const set = (patch) => {
  state = { ...state, ...patch };
  emit();
};

export const getSocial = () => state;
export const levelOf = (s = state, key = getStatusKey()) => (s.maxed ? 100 : Math.max(0, BASE[key] - s.drain));
export const isAsleep = (s = state, key = getStatusKey()) => !s.maxed && BASE[key] - s.drain <= 0;

function subscribe(cb) {
  listeners.add(cb);
  if (listeners.size === 1) {
    // sạc lại ~1%/giây (chỉ chạy khi có component đang hiển thị pin)
    chargeTimer = setInterval(() => state.drain > 0 && set({ drain: state.drain - 1 }), 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size) clearInterval(chargeTimer);
  };
}
export const useSocial = () => useSyncExternalStore(subscribe, getSocial);

export function sayHi() {
  if (state.maxed) return set({ reply: 'HI!!! :D (this is not normal)', hiAt: performance.now() });
  const key = getStatusKey();
  if (BASE[key] - state.drain <= 0) return; // hết pin: không nói chuyện được nữa
  const next = state.drain + 20;
  set({
    drain: next,
    hiAt: performance.now(),
    reply: BASE[key] - next <= 0 ? 'zune has left the chat. (recharging...)' : REPLIES[Math.min(next / 20 - 1, 3)],
  });
}

// easter egg: 100% personality (Konami code, bấm 6 lần vào thanh personality, hoặc lệnh `konami` trong terminal)
export function unlock(msg) {
  clearTimeout(maxTimer);
  set({ maxed: true, months: 0, reply: msg, maxAt: performance.now() });
  maxTimer = setTimeout(() => set({ maxed: false, reply: 'ok. that is enough personality for today.' }), MAX_MS);
}

export function friendship() {
  if (state.maxed) return;
  if (state.months + 1 >= 6) return unlock('6 months of friendship in 6 clicks. speedrun accepted.');
  set({ months: state.months + 1, reply: `month ${state.months + 1}/6... keep going` });
}
