import { useCallback, useState } from 'react';
import useTimer from '../../../../lib/useTimer.js';

// Bóng thoại tạm: say(chữ, ms) hiện rồi tự tắt, hush() tắt ngay.
export default function useBubble(defaultMs = 2600) {
  const [text, setText] = useState('');
  const timer = useTimer();
  const say = useCallback(
    (msg, ms = defaultMs) => {
      setText(msg);
      timer.set(() => setText(''), ms);
    },
    [timer, defaultMs]
  );
  const hush = useCallback(() => {
    timer.clear();
    setText('');
  }, [timer]);
  return { text, say, hush };
}
