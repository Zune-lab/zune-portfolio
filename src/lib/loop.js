import { isNapping, onPauseChange } from './nap.js';
import { observeVisible } from './observe.js';

// Vòng requestAnimationFrame "ngủ thật": rAF bị HUỶ HẲN (không chỉ bỏ qua khung) khi
//   - screensaver đang chạy (nap), hoặc tab bị ẩn, hoặc phần tử khuất khỏi khung nhìn, hoặc canRun() trả về false
// và tự chạy lại khi điều kiện hết đúng.
//
// Tuỳ chọn:
//   watch       phần tử cần theo dõi: khuất khỏi khung nhìn thì dừng, hiện lại thì chạy tiếp (thay cho tự gọi observeVisible + setVisible)
//   onVisible   gọi thêm mỗi khi `watch` vào/ra khung nhìn (vd Ghost cần ghi cờ visible cho các effect khác)
//   canRun      trả false thì dừng (vd ma đang ngủ và đã đứng yên); đổi giá trị xong gọi sync()
//   napGraceMs  screensaver vừa bật vẫn chạy thêm chừng này ms rồi mới dừng (vd sâu chữ cần vài khung để nằm xuống ngủ rồi mới đứng hình)
//   onResume    chạy ngay trước khung đầu tiên sau khi nghỉ (để reset đồng hồ dt, tránh bước thời gian khổng lồ)
//   onPause     chạy ngay sau khi vòng bị dừng (kể cả lúc tab ẩn / khuất khỏi khung nhìn, dùng isNapping() để phân biệt)
// Trả về { sync, stop }: sync() ép kiểm tra lại khi canRun() đổi, stop() để dọn khi unmount.
export function frameLoop(frame, { watch, onVisible, canRun = () => true, napGraceMs = 0, onResume, onPause } = {}) {
  let raf = 0;
  let visible = true;
  let dead = false;
  let grace = false;
  let graceTimer = 0;
  const should = () => visible && !document.hidden && (!isNapping() || grace) && canRun();
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
      onPause?.();
    }
  };
  // nap bật / tắt: mở hoặc đóng "thời gian ân hạn" TRƯỚC khi sync, để sync thấy giá trị mới.
  // (cũng được gọi lúc tab ẩn / hiện; lúc đó nap không đổi nên ân hạn giữ nguyên)
  let napped = isNapping();
  const onChange = () => {
    if (isNapping() !== napped) {
      napped = !napped;
      clearTimeout(graceTimer);
      grace = napGraceMs > 0 && napped;
      if (grace) {
        graceTimer = window.setTimeout(() => {
          grace = false;
          sync();
        }, napGraceMs);
      }
    }
    sync();
  };
  const offPause = onPauseChange(onChange);
  const offWatch = watch
    ? observeVisible(watch, (v) => {
        visible = v;
        onVisible?.(v);
        sync();
      })
    : null;
  sync();
  return {
    sync,
    stop() {
      dead = true;
      clearTimeout(graceTimer);
      cancelAnimationFrame(raf);
      raf = 0;
      offPause();
      offWatch?.();
    },
  };
}
