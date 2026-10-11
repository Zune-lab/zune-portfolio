// Hình học hộp chữ nhật { l, t, r, b } dùng chung cho sâu chữ (wormBrain) và crewmate.

// điểm (x, y) nằm trong hộp r (không tính mép)
export const inRect = (x, y, r) => x > r.l && x < r.r && y > r.t && y < r.b;

// nới hộp r ra mỗi phía p px (p âm thì thu nhỏ)
export const grow = (r, p) => ({ l: r.l - p, t: r.t - p, r: r.r + p, b: r.b + p });

// đẩy điểm p ({ x, y }, sửa tại chỗ) đang nằm trong hộp r (nới thêm pad px mỗi phía) ra mép gần nhất; ngoài hộp thì giữ nguyên.
// Trả về true nếu có dịch chuyển. Không cấp phát vì được gọi cho từng đốt thân sâu ở mỗi khung hình.
// Hai mép cùng gần thì ưu tiên theo thứ tự trái, phải, trên, dưới.
export function pushOutOfRect(p, r, pad = 0) {
  const l = r.l - pad;
  const rt = r.r + pad;
  const t = r.t - pad;
  const b = r.b + pad;
  if (!(p.x > l && p.x < rt && p.y > t && p.y < b)) return false;
  let min = p.x - l;
  let edge = 0;
  if (rt - p.x < min) {
    min = rt - p.x;
    edge = 1;
  }
  if (p.y - t < min) {
    min = p.y - t;
    edge = 2;
  }
  if (b - p.y < min) edge = 3;
  if (edge === 0) p.x = l;
  else if (edge === 1) p.x = rt;
  else if (edge === 2) p.y = t;
  else p.y = b;
  return true;
}
