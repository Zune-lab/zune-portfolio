// Site chạy ở subpath (BASE_URL = '/zune-portfolio/'), mọi đường dẫn nối sau nó.
// Tách riêng khỏi pages.js để component trang (vd Lab) dùng được mà không import vòng.
export const BASE = import.meta.env.BASE_URL;
export const pathOf = (id) => (id === 'home' ? BASE : `${BASE}${id}`);
