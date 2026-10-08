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

// số thực ngẫu nhiên trong [a, b)
export const rand = (a, b) => a + Math.random() * (b - a);

export const lerp = (a, b, t) => a + (b - a) * t;

// smoothstep: 0..1 -> 0..1, êm ở hai đầu
export const smoothstep = (x) => x * x * (3 - 2 * x);

// hiệu hai góc (radian) quy về [-π, π]: dương = phải quay thêm theo chiều kim đồng hồ để từ b tới a
export const angDiff = (a, b) => {
  let d = a - b;
  d -= TAU * Math.floor(d / TAU + 0.5);
  return d;
};
