// Đồng bộ màu cho mọi thứ vẽ bằng JS (canvas) với lúc đổi theme.
// Biến màu ở :root chuyển dần ~0.6s (xem @property trong index.css). Nếu chỉ đọc màu MỘT lần ngay khi
// data-theme đổi, ta sẽ đọc trúng giá trị CŨ rồi kẹt màu đó (lỗi "trễ màu"). Nên: trong lúc đang chuyển,
// gọi lại cb MỖI KHUNG HÌNH, và gọi thêm một lần nữa khi đã xong để chốt đúng màu cuối.
const SETTLE_MS = 900; // 0.6s transition + dư để không bao giờ chốt sớm
const listeners = new Set();
let until = 0;
let raf = 0;
let mo = null;

const loop = () => {
  listeners.forEach((cb) => cb());
  raf = performance.now() < until ? requestAnimationFrame(loop) : 0;
};
const kick = () => {
  until = performance.now() + SETTLE_MS;
  if (!raf) raf = requestAnimationFrame(loop);
};

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
