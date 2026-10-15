import { useEffect, useState } from 'react';
import { canHover } from './env.js';

// như canHover() nhưng tự render lại khi đổi (bật/tắt chế độ thiết bị trong devtools, gắn/rút chuột ở tablet)
export default function useCanHover() {
  const [hover, setHover] = useState(canHover);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)');
    const on = () => setHover(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return hover;
}
