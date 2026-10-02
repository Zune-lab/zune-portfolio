import { Component } from 'react';

// Lỗi tải chunk lazy: thường do deploy mới làm mất file hash cũ, hoặc mạng chập chờn
const isChunkError = (err) =>
  /Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    String(err?.message || err)
  );

const RELOAD_KEY = 'zune-chunk-reload';

// Chặn lỗi render để 1 component hỏng (game, chunk lazy lỗi) không làm trắng cả site.
//  - `inline`: hiện khung nhỏ tại chỗ (dùng cho từng mục Lab); mặc định chiếm cả màn hình.
//  - Lỗi chunk: tự reload ĐÚNG 1 lần (sessionStorage chặn vòng lặp) để lấy bản build mới.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
    if (!isChunkError(error)) return;
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, '1');
    } catch {
      return; // storage bị chặn: không tự reload để tránh lặp vô hạn, để người dùng bấm nút
    }
    location.reload();
  }

  retry = () => {
    if (isChunkError(this.state.error)) {
      try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* bỏ qua */ }
      location.reload();
    } else {
      this.setState({ error: null });
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunk = isChunkError(error);
    const box = (
      <div role="alert" className="font-mono text-center max-w-[420px] mx-auto px-6 py-10">
        <p className="text-amber text-[13px] mb-2">// {chunk ? 'không tải được phần này' : 'có lỗi xảy ra'}</p>
        <p className="text-dim text-[13px] mb-5">
          {chunk ? 'Có thể trang vừa được cập nhật hoặc mạng đang chập chờn.' : 'Phần này bị lỗi, phần còn lại của trang vẫn dùng được.'}
        </p>
        <button
          type="button"
          onClick={this.retry}
          className="px-3.5 py-1.5 rounded-md border border-line hover:border-amber text-ink text-[13px]"
        >
          {chunk ? 'reload' : 'thử lại'}
        </button>
      </div>
    );

    return this.props.inline ? box : <div className="min-h-screen flex items-center justify-center">{box}</div>;
  }
}
