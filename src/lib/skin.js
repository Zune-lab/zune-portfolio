// SKIN của cả trang (xem src/config/skins.js): store ngoài React, mọi nơi (App, bảng chọn Ctrl+K, Terminal, game) đều gọi vào đây.
//
// Hai thuộc tính trên <html>, độc lập nhau:
//   data-skin  = bộ giao diện đang áp dụng (id thật, không bao giờ là 'auto')
//   data-theme = sáng/tối. Skin chỉ hỗ trợ 1 chế độ thì ÉP data-theme theo nó; rời skin đó, theme quay lại lựa chọn của người dùng.
// `choice` là thứ người dùng CHỌN (id hoặc 'auto'); skin đang áp dụng có thể khác choice khi 'auto' (đổi theo buổi trong ngày) hoặc
// khi đang xem trước.
import { AUTO_BY_TOD, DEFAULT_SKIN, SKINS, SKIN_AUTO, isSkinId, lockedMode, skinById } from '../config/skins.js';
import { storageKey } from '../config/site.js';
import { prefersReducedMotion } from './env.js';
import { readBest, storageGet, storageSet } from './storage.js';
import { createEmitter } from './store.js';
import { timeOfDay } from './siteTime.js';
import { syncThemeColor, syncThemeNow } from './themeSync.js';

const KEY_CHOICE = storageKey('skin'); // 'auto' | id người dùng chọn
const KEY_EFFECTIVE = storageKey('skin-eff'); // skin đang áp dụng lần trước: index.html dùng để vẽ đúng ngay khung đầu khi choice = 'auto'
const KEY_UNLOCKED = storageKey('skins-unlocked'); // các skin ẩn đã mở khoá (danh sách id, ngăn cách bằng dấu phẩy)
const KEY_THEME = storageKey('theme');

const root = document.documentElement;
const emitter = createEmitter();
const toasts = new Set();

let choice = DEFAULT_SKIN;
let memTheme = null; // sáng/tối người dùng đang ưa chuộng (phòng khi localStorage bị chặn)
let previewing = null; // { skin, theme } lúc chưa xem trước, để trả lại đúng khi huỷ
let swapTimer = 0;
let pointer = null; // vị trí bấm gần nhất: gốc của hiệu ứng vòng tròn loang ra

// ---------------------------------------------------------------- mở khoá skin ẩn
const readUnlocked = () => new Set((storageGet(KEY_UNLOCKED) ?? '').split(',').filter(Boolean));
const meetsUnlock = (u) => readBest(storageKey(u.game)) >= u.min;

export const isUnlocked = (id) => {
  const u = skinById(id)?.unlock;
  return !u || meetsUnlock(u) || readUnlocked().has(id);
};
const isUsable = (id) => isSkinId(id) && isUnlocked(id);

export function onSkinToast(cb) {
  toasts.add(cb);
  return () => toasts.delete(cb);
}
// thông báo nhỏ ở đáy màn hình: { text, action?: { label, run } }
export const skinToast = (toast) => toasts.forEach((cb) => cb(toast));

// báo MỘT thông báo cho cả nhóm skin vừa mở khoá (nhiều toast liên tiếp sẽ đè nhau, chỉ còn cái cuối)
function announce(skins) {
  if (!skins.length) return;
  skinToast({
    text: `${skins.length > 1 ? 'skins' : 'skin'} unlocked: ${skins.map((s) => s.label).join(', ')}`,
    action: { label: 'try it', run: () => chooseSkin(skins[0].id) },
  });
}

// gọi sau khi một kỷ lục mới được ghi (useBest): mở khoá và báo những skin vừa đủ điều kiện
export function checkSkinUnlocks() {
  const have = readUnlocked();
  const fresh = SKINS.filter((s) => s.unlock && !have.has(s.id) && meetsUnlock(s.unlock));
  if (!fresh.length) return;
  fresh.forEach((s) => have.add(s.id));
  storageSet(KEY_UNLOCKED, [...have].join(','));
  announce(fresh);
  emitter.emit();
}

// mã Konami: mở hết skin ẩn
export function unlockAllSkins() {
  const have = readUnlocked();
  const fresh = SKINS.filter((s) => s.unlock && !isUnlocked(s.id));
  SKINS.filter((s) => s.unlock).forEach((s) => have.add(s.id));
  storageSet(KEY_UNLOCKED, [...have].join(','));
  announce(fresh);
  emitter.emit();
}

// ---------------------------------------------------------------- áp skin lên <html>
const preferredTheme = () => ((memTheme ?? storageGet(KEY_THEME)) === 'light' ? 'light' : 'dark');
const themeFor = (skin) => lockedMode(skin) ?? preferredTheme();
const resolve = (c) => (c === SKIN_AUTO ? AUTO_BY_TOD[timeOfDay()] ?? DEFAULT_SKIN : c);

// App báo lại lựa chọn sáng/tối của người dùng (chỉ khi theme KHÔNG bị skin ép) để nhớ cho lúc quay lại skin hỗ trợ cả hai
export const rememberTheme = (t) => {
  memTheme = t === 'light' ? 'light' : 'dark';
};
// theme hiện đang bị skin ép? ('dark' | 'light' | null)
export const forcedTheme = () => lockedMode(root.dataset.skin);

const setAttrs = (skin, theme) => {
  root.dataset.skin = skin;
  root.dataset.theme = theme;
};

// đổi thuộc tính TỨC THÌ và đồng bộ (cùng cách App.swapColors làm với theme sáng/tối): DOM + canvas đổi màu trong cùng một khung hình.
// data-skin-swap báo cho Alive biết đây không phải người dùng bấm công tắc sáng/tối liên tục (không kích hoạt "cuộc họp").
function swap(change) {
  window.clearTimeout(swapTimer);
  root.setAttribute('data-skin-swap', '');
  root.classList.add('theme-anim');
  change();
  syncThemeNow();
  syncThemeColor();
  emitter.emit();
  swapTimer = window.setTimeout(() => {
    root.classList.remove('theme-anim');
    root.removeAttribute('data-skin-swap');
  }, 160);
}

// đổi bằng View Transitions: skin mới loang ra như vòng tròn từ chỗ bấm. Trình duyệt chưa hỗ trợ / bật "giảm chuyển động" -> đổi thẳng.
function transition(change, origin) {
  if (prefersReducedMotion() || typeof document.startViewTransition !== 'function') return swap(change);
  const { x, y } = origin ?? pointer ?? { x: innerWidth / 2, y: innerHeight / 2 };
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  let vt;
  try {
    vt = document.startViewTransition(() => swap(change));
  } catch {
    return swap(change);
  }
  vt.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    })
    .catch(() => {});
  vt.finished.catch(() => {});
}

// ---------------------------------------------------------------- API
// người dùng chọn một skin (hoặc 'auto'). origin = { x, y } toạ độ màn hình để vòng tròn loang ra; bỏ trống thì lấy chỗ bấm gần nhất.
export function chooseSkin(next, origin) {
  if (next !== SKIN_AUTO && !isUsable(next)) return false;
  const was = previewing;
  previewing = null;
  if (was) setAttrs(was.skin, was.theme); // trả về nguyên trạng TRƯỚC khi xem trước, để vòng tròn loang từ giao diện cũ thật sự
  choice = next;
  storageSet(KEY_CHOICE, next);
  const skin = resolve(next);
  const theme = themeFor(skin);
  transition(() => {
    setAttrs(skin, theme);
    storageSet(KEY_EFFECTIVE, skin);
  }, origin);
  return true;
}

// xem thử một skin (rê chuột / mũi tên trong bảng chọn): đổi tức thì, không lưu. endPreview() trả lại như cũ.
export function previewSkin(id) {
  const skin = id === SKIN_AUTO ? resolve(SKIN_AUTO) : id;
  if (!isUsable(skin) || (previewing === null && root.dataset.skin === skin)) return;
  previewing ??= { skin: root.dataset.skin, theme: root.dataset.theme };
  if (root.dataset.skin === skin) return;
  swap(() => setAttrs(skin, themeFor(skin)));
}
export function endPreview() {
  if (!previewing) return;
  const { skin, theme } = previewing;
  previewing = null;
  swap(() => setAttrs(skin, theme));
}

// 'auto': App gọi mỗi khi tông giờ (data-tod) đổi
export function refreshAuto() {
  if (choice !== SKIN_AUTO || previewing) return;
  const skin = resolve(SKIN_AUTO);
  if (skin === root.dataset.skin) return;
  swap(() => {
    setAttrs(skin, themeFor(skin));
    storageSet(KEY_EFFECTIVE, skin);
  });
}

export const getChoice = () => choice;
export const getSkin = () => root.dataset.skin;

// cho useSyncExternalStore: một chuỗi đổi mỗi khi lựa chọn, skin, theme hay trạng thái mở khoá đổi
export const subscribeSkin = emitter.subscribe;
export const getSkinSnapshot = () => `${choice}|${root.dataset.skin}|${root.dataset.theme}|${storageGet(KEY_UNLOCKED) ?? ''}`;

// ---------------------------------------------------------------- khởi tạo (chạy một lần lúc nạp module)
// index.html đã đặt sẵn data-skin / data-theme trước khi vẽ (không nháy); ở đây chỉ chốt lại cho khớp state và loại skin ẩn chưa mở khoá.
(function init() {
  const saved = storageGet(KEY_CHOICE);
  choice = saved === SKIN_AUTO ? SKIN_AUTO : isUsable(saved) ? saved : DEFAULT_SKIN;
  const skin = resolve(choice);
  setAttrs(skin, themeFor(skin));
  storageSet(KEY_EFFECTIVE, skin);
  window.addEventListener(
    'pointerdown',
    (e) => {
      pointer = { x: e.clientX, y: e.clientY };
    },
    { capture: true, passive: true }
  );
})();
