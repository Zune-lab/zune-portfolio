// Kiểm tra môi trường trình duyệt dùng chung. Mỗi hàm đọc lại lúc gọi (không cache) vì người dùng có thể đổi
// cài đặt hệ điều hành khi trang đang mở.

// người dùng bật "giảm chuyển động": mọi animation trang trí phải tắt hoặc đứng yên
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// thiết bị có hover thật (chuột/trackpad); cảm ứng thì false
export const canHover = () => window.matchMedia('(hover: hover)').matches;

// hover thật VÀ con trỏ chính xác (chuột), loại trừ bút/máy tính bảng có hover yếu
export const hasFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// canvas theo mật độ điểm ảnh, tối đa 2x (cao hơn chỉ tốn GPU mà mắt không thấy khác)
export const getDpr = () => Math.min(window.devicePixelRatio || 1, 2);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// như sleep nhưng bỏ qua thời gian chờ khi bật "giảm chuyển động" (dùng cho hiệu ứng gõ chữ)
export const motionSleep = (ms) => sleep(prefersReducedMotion() ? 0 : ms);

// hasOwnProperty an toàn (Object.hasOwn chưa có ở trình duyệt cũ)
export const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
