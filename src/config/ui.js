// Class Tailwind lặp lại ở nhiều trang: sửa ở đây là đổi cho tất cả.

// khung nội dung của mỗi mục (cùng bề rộng tối đa + lề hai bên)
export const WRAP = 'wrap max-w-[1040px] mx-auto px-8';

// ô bảng nền tối bo góc: khung ngoài của mini game và của Reptile
export const PANEL = 'bg-inset border border-line rounded-[10px] p-[26px]';

// mỗi mục lớn: khoảng đệm + đường kẻ trên. Mục trên trang chủ còn là đích cuộn nên chừa chỗ cho navbar (--nav-h, index.css)
export const SECTION = 'py-20 border-t border-line';
export const SECTION_ANCHOR = `${SECTION} scroll-mt-[var(--nav-h)]`;
// đích cuộn nằm trong một trang (mục con của about, máy chiếu của projects): chừa navbar + một khoảng thở
export const SCROLL_MT_SUB = 'scroll-mt-[calc(var(--nav-h)+1.5rem)]';
