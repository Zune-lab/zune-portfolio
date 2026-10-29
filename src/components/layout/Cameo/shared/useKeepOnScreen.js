import { useLayoutEffect } from 'react';

// Giữ một bóng thoại nằm trọn trong khung nhìn: đo lại mỗi khi `deps` đổi (vd bóng vừa hiện), nếu tràn mép thì dịch ngang vừa đủ
// bằng thuộc tính `translate`. Chỉ dùng cho bóng chưa tự đặt `translate` trong CSS (bóng căn giữa bằng translate thì không dùng được hook này).
export default function useKeepOnScreen(ref, deps, margin = 8) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.translate = '0 0';
    const r = el.getBoundingClientRect();
    let dx = 0;
    if (r.right > window.innerWidth - margin) dx = window.innerWidth - margin - r.right;
    if (r.left + dx < margin) dx = margin - r.left;
    if (dx) el.style.translate = `${Math.round(dx)}px 0`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
