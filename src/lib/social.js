import { useSyncExternalStore } from 'react';
import { getStatusKey } from './status.js';
import { emitReaction } from './reactions.js';
import { createEmitter } from './store.js';
import { site } from '../config/site.js';
import { pausableInterval } from './timers.js';
import { unlockAllSkins } from './skin.js';

// "Pin xã hội" của Zune dùng chung cho: thẻ zune.sav, sân chữ ở hero (HeroLetters) và terminal (lệnh battery / konami).
// Là store ngoài React để HeroLetters nghe được mà không phải re-render cả hero.
const BASE = { online: 80, busy: 40, focus: 20, offline: 10 };
const REPLIES = ['hi.', 'oh. hello again.', 'ok, that was a lot of talking', 'running low on words...'];
const MAX_MS = 9000;

// Cách hiển thị pin dùng chung (thẻ zune.sav, thanh Battery ở mép trên, lệnh `battery`): mốc màu và số ô nằm MỘT chỗ để không lệch nhau
export const BATTERY_CELLS = 10;
export const toneOf = (level) => (level > 50 ? 'hi' : level > 20 ? 'mid' : 'lo'); // 'hi' xanh | 'mid' amber | 'lo' đỏ

// hiAt / maxAt: mốc performance.now() của lần "say hi" / mở khoá gần nhất, để sân chữ ở hero biết có sự kiện mới
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

// cho code ngoài React (HeroLetters): gọi cb mỗi khi pin đổi. Trả về hàm huỷ.
export const onSocialChange = subscribe;
export const useSocial = () => useSyncExternalStore(subscribe, getSocial);
// mức pin hiện tại (0..100, maxed = 100). Snapshot là SỐ nên component chỉ render lại khi số đổi (tối đa 1 lần/giây lúc đang sạc)
export const useLevel = () => useSyncExternalStore(subscribe, () => levelOf());
// chỉ cần biết zune có đang ngủ không: snapshot là boolean nên component chỉ render lại khi nó đổi (useSocial thì render mỗi giây lúc pin đang sạc)
export const useAsleep = () => useSyncExternalStore(subscribe, () => isAsleep());

// câu trả lời theo mức đã tốn pin: (0,20] -> 0, (20,40] -> 1, ... Pin sạc 1%/giây nên `next` hiếm khi là bội của 20;
// chia thẳng rồi trừ 1 sẽ ra số lẻ -> REPLIES[số lẻ] = undefined -> ô trả lời trống.
export function sayHi() {
  if (state.maxed) return set({ reply: 'HI!!! :D (this is not normal)', hiAt: performance.now() });
  const key = getStatusKey();
  if (BASE[key] - state.drain <= 0) return; // hết pin: không nói chuyện được nữa
  const next = state.drain + 20;
  set({
    drain: next,
    hiAt: performance.now(),
    reply: BASE[key] - next <= 0 ? `${site.id} has left the chat. (recharging...)` : REPLIES[Math.min(Math.ceil(next / 20) - 1, REPLIES.length - 1)],
  });
}

// easter egg: 100% personality (Konami code, bấm 6 lần vào thanh personality, hoặc lệnh `konami` trong terminal)
function unlock(msg) {
  clearTimeout(maxTimer);
  set({ maxed: true, months: 0, reply: msg, maxAt: performance.now() });
  maxTimer = setTimeout(() => set({ maxed: false, reply: 'ok. that is enough personality for today.' }), MAX_MS);
}

// Konami (gõ phím hoặc lệnh `konami` trong terminal): cùng một câu cho mọi nơi gọi
export const unlockKonami = () => {
  emitReaction('konami');
  unlock('konami accepted. personality 100%. who let this happen?');
  unlockAllSkins(); // phần thưởng thêm: mở hết skin ẩn (xem src/config/skins.js)
};

export function friendship() {
  if (state.maxed) return;
  if (state.months + 1 >= 6) return unlock('6 months of friendship in 6 clicks. speedrun accepted.');
  set({ months: state.months + 1, reply: `month ${state.months + 1}/6... keep going` });
}
