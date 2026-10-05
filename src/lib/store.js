// Bộ phát sự kiện dùng chung cho các store ngoài React (nap, social, status): một Set người nghe + emit.
// `onFirst` / `onLast` chạy khi người nghe đầu tiên đăng ký / người nghe cuối cùng rời đi, để store chỉ chạy
// timer khi có ai đó đang nhìn (vd bộ sạc pin xã hội, đồng hồ kiểm tra giờ).
// Trả về { subscribe, emit }: `subscribe` đưa thẳng cho useSyncExternalStore được.
export function createEmitter({ onFirst, onLast } = {}) {
  const listeners = new Set();
  return {
    emit: () => listeners.forEach((l) => l()),
    subscribe(cb) {
      listeners.add(cb);
      if (listeners.size === 1) onFirst?.();
      return () => {
        listeners.delete(cb);
        if (!listeners.size) onLast?.();
      };
    },
  };
}
