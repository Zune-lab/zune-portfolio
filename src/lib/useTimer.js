import { useCallback, useEffect, useMemo, useRef } from 'react';

// Một timer "thay thế": set() huỷ lượt đang chờ rồi hẹn lượt mới, clear() huỷ hẳn; tự huỷ khi component unmount.
// Dùng cho mẫu lặp lại "bật cờ rồi N ms sau tắt" (bóng thoại, toast, hiệu ứng tạm...) thay cho useRef + clearTimeout viết tay.
export default function useTimer() {
  const id = useRef(0);
  const clear = useCallback(() => {
    clearTimeout(id.current);
    id.current = 0;
  }, []);
  const set = useCallback((fn, ms) => {
    clearTimeout(id.current);
    id.current = window.setTimeout(fn, ms);
  }, []);
  useEffect(() => clear, [clear]);
  return useMemo(() => ({ set, clear }), [set, clear]);
}
