import { useSyncExternalStore } from 'react';
import { getStatusKey } from './status.js';
import { createEmitter } from './store.js';
import { site } from '../config/site.js';
import { pausableInterval } from './timers.js';

// "Pin xã hội" của Zune dùng chung cho: thẻ zune.sav, sâu chữ ở hero và terminal (lệnh battery / konami).
// Là store ngoài React để canvas (HeroWorm) đọc được mỗi khung hình mà không phải re-render.
const BASE = { online: 80, busy: 40, focus: 20, offline: 10 };
const REPLIES = ['hi.', 'oh. hello again.', 'ok, that was a lot of talking', 'running low on words...'];
const MAX_MS = 9000;

// hiAt / maxAt: mốc performance.now() của lần "say hi" / mở khoá gần nhất, để sâu chữ biết có sự kiện mới
let state = { drain: 0, months: 0, maxed: false, reply: '', hiAt: 0, maxAt: 0 };
let stopCharge = null;
let maxTimer = 0;

const set = (patch) => {
  state = { ...state, ...patch };
  emit();
};

export const getSocial = () => state;
export const levelOf = (s = state, key = getStatusKey()) => (s.maxed ? 100 : Math.max(0, BASE[key] - s.drain));
export const isAsleep = (s = state, key = getStatusKey()) => !s.maxed && BASE[key] - s.drain <= 0;

const chargeTick = () => state.drain > 0 && set({ drain: state.drain - 1 });
// dậy (hết nap hoặc tab hiện lại): cộng bù đúng số giây đã nghỉ, vì pin sạc 1%/giây dù không ai nhìn
const catchUp = (ms) => {
  const slept = Math.floor(ms / 1000);
  if (slept > 0 && state.drain > 0) set({ drain: Math.max(0, state.drain - slept) });
};

// sạc lại ~1%/giây: chỉ chạy khi có component đang hiển thị pin, và timer ngủ hẳn lúc screensaver / tab ẩn (lib/timers.js)
// (khỏi đánh thức React mỗi giây cho thẻ pin không ai nhìn)
const { subscribe, emit } = createEmitter({
  onFirst: () => (stopCharge = pausableInterval(chargeTick, 1000, { onResume: catchUp })),
  onLast: () => {
    stopCharge?.();
    stopCharge = null;
  },
});

export const useSocial = () => useSyncExternalStore(subscribe, getSocial);
// chỉ cần biết zune có đang ngủ không: snapshot là boolean nên component chỉ render lại khi nó đổi (useSocial thì render mỗi giây lúc pin đang sạc)
export const useAsleep = () => useSyncExternalStore(subscribe, () => isAsleep());

export function sayHi() {
  if (state.maxed) return set({ reply: 'HI!!! :D (this is not normal)', hiAt: performance.now() });
  const key = getStatusKey();
  if (BASE[key] - state.drain <= 0) return; // hết pin: không nói chuyện được nữa
  const next = state.drain + 20;
  set({
    drain: next,
    hiAt: performance.now(),
    reply: BASE[key] - next <= 0 ? `${site.id} has left the chat. (recharging...)` : REPLIES[Math.min(next / 20 - 1, 3)],
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
