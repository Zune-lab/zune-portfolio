// Hình học hộp chữ nhật { l, t, r, b } dùng chung cho sâu chữ (wormBrain) và crewmate.

// điểm (x, y) nằm trong hộp r (không tính mép)
export const inRect = (x, y, r) => x > r.l && x < r.r && y > r.t && y < r.b;

// nới hộp r ra mỗi phía p px (p âm thì thu nhỏ)
export const grow = (r, p) => ({ l: r.l - p, t: r.t - p, r: r.r + p, b: r.b + p });
