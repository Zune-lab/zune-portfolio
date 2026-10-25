import { isNapping, onNapChange } from './nap.js';

// Đồng bộ màu cho mọi thứ vẽ bằng JS (canvas) với lúc đổi theme.
// Biến màu ở :root đổi TỨC THÌ (không còn transition, xem index.css) nên chỉ cần đọc lại màu ngay sau khi data-theme đổi:
//  - syncThemeNow(): App gọi đồng bộ ngay trong lúc đổi theme, canvas có màu mới TRƯỚC khung hình kế tiếp (không trễ khung nào);
//  - MutationObserver bên dưới là lưới an toàn (đổi theme/tông giờ từ nơi khác): đọc lại vài khung liên tiếp để chắc chắn.
// Đang screensaver thì không vẽ gì (không ai thấy): màu đổi trong lúc đó được chốt ngay khi dậy.
const SETTLE_MS = 150; // vài khung hình là đủ, không còn transition phải chờ
// <meta theme-color> (thanh trạng thái / thanh địa chỉ trên điện thoại) lấy thẳng từ --bg đang áp dụng, nên theo cả theme sáng/tối,
// tông giờ (data-tod) LẪN skin (data-skin). Gọi lại sau mỗi lần đổi một trong ba thứ đó.
export const syncThemeColor = () => {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
};

const listeners = new Set();
let until = 0;
let raf = 0;
let mo = null;
let owed = false; // đổi màu xảy ra lúc screensaver đang chạy: nợ một lượt chốt màu, trả khi dậy

const loop = () => {
  raf = 0;
  if (isNapping()) {
    owed = true; // màn hình đang bị phủ tối: dừng hẳn, dậy thì chạy lại từ đầu
    return;
  }
  listeners.forEach((cb) => cb());
  raf = performance.now() < until ? requestAnimationFrame(loop) : 0;
};
// gọi đồng bộ mọi cb ngay lúc này (getComputedStyle trong cb tự ép tính lại style nên đọc được giá trị mới)
export function syncThemeNow() {
  if (isNapping()) {
    owed = true;
    return;
  }
  listeners.forEach((cb) => cb());
}
const kick = () => {
  if (isNapping()) {
    owed = true;
    return;
  }
  until = performance.now() + SETTLE_MS;
  if (!raf) raf = requestAnimationFrame(loop);
};
onNapChange(() => {
  if (owed && !isNapping() && listeners.size) {
    owed = false;
    kick();
  }
});

// cb được gọi lại ngay khi đổi theme (data-theme), đổi tông giờ (data-tod) hoặc đổi skin (data-skin), và thêm vài khung hình sau đó.
// Trả về hàm huỷ đăng ký. Không tự gọi cb lần đầu: nơi dùng tự đọc màu lúc khởi tạo.
export function onThemeChange(cb) {
  listeners.add(cb);
  if (!mo) {
    mo = new MutationObserver(kick);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-tod', 'data-skin'] });
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && mo) {
      mo.disconnect();
      mo = null;
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
