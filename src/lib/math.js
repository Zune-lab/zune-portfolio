// Hàm toán/ngẫu nhiên nhỏ dùng chung cho animation + mini game.
export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// phần tử ngẫu nhiên của mảng
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// số nguyên ngẫu nhiên trong [a, b] (gồm cả hai đầu)
export const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

// xáo trộn kiểu Fisher-Yates, trả về mảng mới
export const shuffled = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
