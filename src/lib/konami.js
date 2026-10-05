import { useEffect, useRef } from 'react';
import { isTypingTarget } from './dom.js';

// Mã Konami: một danh sách và một bộ so khớp dùng chung cho thẻ zune.sav và sân khấu Ghost.
export const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

// Bộ so khớp có nhớ: gọi với từng keydown, trả true đúng lúc gõ xong chuỗi (rồi tự xoá bộ nhớ).
// Bỏ qua keydown không có `key` (Chrome autofill) và phím gõ trong ô nhập.
export function createKonamiMatcher(seq = KONAMI) {
  let keys = [];
  return (e) => {
    if (typeof e.key !== 'string' || isTypingTarget(e.target)) return false;
    keys = [...keys, e.key.toLowerCase()].slice(-seq.length);
    if (keys.length < seq.length || !keys.every((k, i) => k === seq[i])) return false;
    keys = [];
    return true;
  };
}

// hook cho component chỉ cần "gõ xong Konami thì làm X"
export function useKonami(onMatch) {
  const latest = useRef(onMatch); // luôn gọi bản mới nhất mà không phải gắn lại listener
  latest.current = onMatch;
  useEffect(() => {
    const match = createKonamiMatcher();
    const onKey = (e) => match(e) && latest.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
