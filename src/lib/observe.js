// Bọc IntersectionObserver cho hai kiểu dùng lặp lại trong app. Cả hai đều trả về hàm huỷ (dùng làm cleanup của effect).

// Chạy `onEnter` ĐÚNG MỘT LẦN khi `el` (hoặc từng phần tử trong danh sách) vào khung nhìn.
// Trình duyệt không có IntersectionObserver thì chạy ngay, để nội dung không bị ẩn mãi.
export function observeOnce(els, onEnter, threshold = 0.4) {
  const list = (Array.isArray(els) || els instanceof NodeList ? [...els] : [els]).filter(Boolean);
  if (!list.length) return () => {};
  if (!('IntersectionObserver' in window)) {
    list.forEach(onEnter);
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        onEnter(en.target);
      }),
    { threshold }
  );
  list.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

// Báo cho `onChange(visible)` mỗi khi `el` vào/ra khỏi khung nhìn: để vòng lặp animation tạm dừng khi không ai thấy.
export function observeVisible(el, onChange) {
  const io = new IntersectionObserver(([en]) => onChange(en.isIntersecting));
  io.observe(el);
  return () => io.disconnect();
}
