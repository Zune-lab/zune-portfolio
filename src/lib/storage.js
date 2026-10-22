// localStorage / sessionStorage an toàn: chế độ riêng tư / bị chặn thì ném lỗi, nên mọi thao tác đều bọc try/catch.
// Đọc lỗi -> null; ghi lỗi -> bỏ qua (app vẫn chạy được trong phiên này). Ghi null/undefined = xoá khoá.
const safeStore = (getStore) => ({
  get(key) {
    try {
      return getStore().getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value === null || value === undefined) getStore().removeItem(key);
      else getStore().setItem(key, String(value));
    } catch {
      /* bỏ qua nếu không ghi được */
    }
  },
});

const local = safeStore(() => localStorage);
const session = safeStore(() => sessionStorage);

export const storageGet = local.get;
export const storageSet = local.set;

// sessionStorage: thứ chỉ có nghĩa trong một phiên (cache kết quả gọi API...)
export const sessionGet = session.get;
export const sessionSet = session.set;

// kỷ lục của các mini game (số nguyên, mặc định 0)
export const readBest = (key) => Number(storageGet(key)) || 0;
export const saveBest = (key, n) => storageSet(key, n);
