// bấm thường -> app tự xử lý (chuyển trang mượt, cuộn tới mục); giữ Ctrl/Cmd/Shift/Alt
// hoặc chuột giữa -> trả lại cho trình duyệt (mở tab mới...)
export const isPlainClick = (e) => e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);

// cuộn tới 1 mục theo selector (vd '#socials') mà không thêm #anchor vào URL
export const scrollToAnchor = (href) => document.querySelector(href)?.scrollIntoView({ block: 'start' });
