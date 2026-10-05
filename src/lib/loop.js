import { isNapping, onNapChange } from './nap.js';

// Vòng requestAnimationFrame "ngủ thật". Trước đây mỗi canvas tự gọi rAF liên tục rồi `return` sớm khi screensaver bật / khuất màn hình:
// vẫn đánh thức luồng chính 60 lần/giây chỉ để không làm gì. Ở đây rAF bị HUỶ HẲN khi:
//   - screensaver đang chạy (nap), hoặc tab bị ẩn, hoặc phần tử khuất khỏi khung nhìn (setVisible), hoặc canRun() trả về false
// và tự chạy lại khi điều kiện hết đúng. `onResume` chạy ngay trước khung đầu tiên sau khi nghỉ (để reset đồng hồ dt, tránh bước thời gian khổng lồ).
// `runWhileNap` (tuỳ chọn): trả true thì vòng vẫn chạy dù screensaver đang bật; đổi giá trị xong gọi sync().
// Trả về { setVisible, sync, stop }: sync() để ép kiểm tra lại khi canRun() đổi (vd ma ngủ / dậy), stop() để dọn khi unmount.
export function frameLoop(frame, { canRun = () => true, onResume, runWhileNap = () => false } = {}) {
  let raf = 0;
  let visible = true;
  let dead = false;
  // runWhileNap: cho phép chạy thêm một lúc dù đang nap (vd sâu chữ cần vài khung để nằm xuống ngủ rồi mới đứng hình)
  const should = () => visible && !document.hidden && (!isNapping() || runWhileNap()) && canRun();
  const tick = (t) => {
    raf = requestAnimationFrame(tick);
    frame(t);
  };
  const sync = () => {
    if (dead) return;
    if (should()) {
      if (raf) return;
      onResume?.();
      raf = requestAnimationFrame(tick);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const offNap = onNapChange(sync);
  document.addEventListener('visibilitychange', sync);
  sync();
  return {
    setVisible(v) {
      visible = v;
      sync();
    },
    sync,
    stop() {
      dead = true;
      cancelAnimationFrame(raf);
      raf = 0;
      offNap();
      document.removeEventListener('visibilitychange', sync);
    },
  };
}
