import { useSyncExternalStore } from 'react';
import { getChoice, getSkin, getSkinSnapshot, subscribeSkin } from './skin.js';

// Trạng thái skin cho component: { choice, skin, theme }
//   choice = thứ người dùng chọn ('auto' hoặc id), skin = skin đang áp dụng, theme = 'dark' | 'light' đang áp dụng
// Dùng useSyncExternalStore trên một chuỗi snapshot để React chỉ render lại khi thật sự có gì đổi.
export default function useSkin() {
  useSyncExternalStore(subscribeSkin, getSkinSnapshot);
  return { choice: getChoice(), skin: getSkin(), theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' };
}
