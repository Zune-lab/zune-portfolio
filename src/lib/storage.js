// localStorage an toàn: chế độ riêng tư / bị chặn thì ném lỗi, nên mọi thao tác đều bọc try/catch.
// Đọc lỗi -> trả giá trị mặc định; ghi lỗi -> bỏ qua (app vẫn chạy được trong phiên này).
export const storageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const storageSet = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch {
    /* bỏ qua nếu không ghi được */
  }
};

// kỷ lục của các mini game (số nguyên, mặc định 0)
export const readBest = (key) => Number(storageGet(key)) || 0;
export const saveBest = (key, n) => storageSet(key, n);
