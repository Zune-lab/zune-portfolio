// bấm thường -> app tự xử lý (chuyển trang mượt, cuộn tới mục); giữ Ctrl/Cmd/Shift/Alt
// hoặc chuột giữa -> trả lại cho trình duyệt (mở tab mới...)
export const isPlainClick = (e) => e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);

// đang gõ vào ô nhập: phím tắt / easter egg toàn trang phải bỏ qua
export const isTypingTarget = (t) =>
  !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

// cuộn tới 1 mục theo selector (vd '#contact') mà không thêm #anchor vào URL
export const scrollToAnchor = (href) => document.querySelector(href)?.scrollIntoView({ block: 'start' });

// effect "spotlight": lưu vị trí chuột vào --mx/--my của phần tử để CSS vẽ ánh sáng/viền chạy theo
export const spotMove = (e) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
};
