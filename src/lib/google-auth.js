// Đăng nhập Google (Google Identity Services) chỉ để lấy ID token chứng minh email người gửi.
// Token này CHỈ được tin ở phía server (Apps Script gọi Google xác minh). Phía client chỉ đọc payload để hiển thị
// email và biết token còn hạn hay không.
const GSI_SRC = 'https://accounts.google.com/gsi/client';
let loading = null;

// tải script của Google đúng 1 lần; reject nếu bị chặn (adblock, mất mạng)
export function loadGsi() {
  if (globalThis.google?.accounts?.id) return Promise.resolve(globalThis.google.accounts.id);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GSI_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => (globalThis.google?.accounts?.id ? resolve(globalThis.google.accounts.id) : reject(new Error('gsi')));
      s.onerror = () => reject(new Error('gsi'));
      document.head.appendChild(s);
    }).catch((err) => {
      loading = null; // cho phép thử lại lần sau
      throw err;
    });
  }
  return loading;
}

// đọc payload JWT (KHÔNG xác minh chữ ký, chỉ để hiển thị). Trả { email, exp } hoặc null.
export function readToken(credential) {
  try {
    const b64 = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    const p = JSON.parse(json);
    return p && p.email ? { email: String(p.email), exp: Number(p.exp) * 1000 } : null;
  } catch {
    return null;
  }
}

// token còn dùng được ít nhất thêm `marginMs` nữa không
export const isFresh = (auth, marginMs = 60 * 1000) => !!auth && auth.exp - Date.now() > marginMs;
