import { isNapping, onNapChange } from './nap.js';

// Đồng bộ màu cho mọi thứ vẽ bằng JS (canvas) với lúc đổi theme.
// Biến màu ở :root chuyển dần ~0.6s (xem @property trong index.css). Nếu chỉ đọc màu MỘT lần ngay khi
// data-theme đổi, ta sẽ đọc trúng giá trị CŨ rồi kẹt màu đó (lỗi "trễ màu"). Nên: trong lúc đang chuyển,
// gọi lại cb MỖI KHUNG HÌNH, và gọi thêm một lần nữa khi đã xong để chốt đúng màu cuối.
// Đang screensaver thì không vẽ gì (không ai thấy): màu đổi trong lúc đó được chốt ngay khi dậy.
const SETTLE_MS = 900; // 0.6s transition + dư để không bao giờ chốt sớm
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

// cb sẽ được gọi lại mỗi khung hình trong lúc đổi theme (data-theme) hoặc đổi tông giờ (data-tod).
// Trả về hàm huỷ đăng ký. Không tự gọi cb lần đầu: nơi dùng tự đọc màu lúc khởi tạo.
export function onThemeChange(cb) {
  listeners.add(cb);
  if (!mo) {
    mo = new MutationObserver(kick);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-tod'] });
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
