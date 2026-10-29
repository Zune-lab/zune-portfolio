// Bus phản ứng của trang: bất cứ nơi nào cũng có thể "kêu" một sự kiện, các nhân vật (pet theo skin, Clippy) nghe và phản ứng theo tính cách riêng.
// Sự kiện hiện có: 'theme' (detail: 'light' | 'dark'), 'navigate' (detail: tên trang), 'copy' (copy email ở mục liên hệ), 'konami',
// 'nap' / 'wake' (screensaver), 'meeting' (họp khẩn cấp), 'shake' (lắc chuột mạnh). Người nghe là pet của skin đang bật (mỗi skin một pet,
// không pet nào xuất hiện ở skin khác). Không có người nghe thì kêu cũng không sao.
const subs = new Set();

export const emitReaction = (name, detail) => {
  subs.forEach((fn) => {
    try {
      fn(name, detail);
    } catch {
      // một người nghe hỏng không được làm hỏng người khác
    }
  });
};

// đăng ký nghe mọi sự kiện: fn(name, detail). Trả về hàm huỷ.
export const onReaction = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
