import { emitReaction } from './reactions.js';
import { hasFinePointer } from './env.js';

// Phát hiện "lắc chuột mạnh": con trỏ đổi chiều ngang liên tục và nhanh (≥ 6 lần trong ~0.7 giây, mỗi lần đi đủ xa) thì kêu 'shake'.
// Máy cảm ứng không có con trỏ nên không chạy. Nghỉ 6 giây giữa hai lần để nhân vật không bị làm phiền liên tục.
export function startShakeWatch() {
  if (!hasFinePointer()) return () => {};
  let lastX = null;
  let dir = 0;
  let swing = 0; // quãng đã đi theo chiều hiện tại
  let turns = [];
  let cool = 0;
  const onMove = (e) => {
    const x = e.clientX;
    if (lastX === null) {
      lastX = x;
      return;
    }
    const dx = x - lastX;
    lastX = x;
    if (!dx) return;
    const d = Math.sign(dx);
    if (d === dir) {
      swing += Math.abs(dx);
      return;
    }
    // đổi chiều: chỉ tính nếu quãng vừa đi đủ dài (loại bỏ run tay nhỏ)
    if (swing > 40) {
      const now = performance.now();
      turns = turns.filter((t) => now - t < 700);
      turns.push(now);
      if (turns.length >= 6 && now > cool) {
        cool = now + 6000;
        turns = [];
        emitReaction('shake');
      }
    }
    dir = d;
    swing = Math.abs(dx);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  return () => window.removeEventListener('pointermove', onMove);
}
