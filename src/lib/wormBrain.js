// "Bộ não" của sâu chữ ở hero (HeroWorm.jsx): chỉ có logic, không đụng DOM/canvas -> chạy thử được bằng node.
//
// Hai phần:
//  1) createPointerTracker: gom sự kiện chuột thành { vị trí, vận tốc, đã đứng yên bao lâu }.
//  2) createBrain: máy trạng thái điều khiển đầu sâu: follow (theo chuột) / roam (tự đi dạo) / scared (giật mình).
//
// Lỗi cũ "kéo chuột nhanh sang phía ngược lại là sâu hết theo luôn" đến từ việc giật mình quá dễ và quá dai:
//  - cứ chuột nhanh (theo BẤT KỲ hướng nào) trong vòng 260px là bị coi là "lao vào mặt", kể cả khi chuột đang chạy ra xa;
//  - mỗi khung lại gia hạn thêm 1.3s, nên lắc chuột liên tục thì sâu chạy mãi;
//  - đích bỏ chạy bị kẹp vào mép hero nên sâu đâm vào tường/góc rồi đứng đó.
// Giờ: chỉ giật mình khi chuột đang LAO VỀ PHÍA đầu, chỉ một lần rồi nghỉ (calm) ~1.8s mới giật mình tiếp,
// đích bỏ chạy được chọn một lần và trượt dọc tường thay vì đâm vào, và có bộ canh "kẹt" tự gỡ.

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const angDiff = (a, b) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

// Vật cản: thẻ zune.sav nằm TRÊN canvas nên sâu chui ra sau thẻ là mất hình (không thấy mặt, bóng thoại, "zzz").
// Nên coi thẻ như một khối không được chui vào: đầu sâu đi vòng quanh, chuột nằm trong thẻ thì sâu ngồi ở mép thẻ gần nhất
// nhìn vào. Ngủ cũng vậy: luôn ngủ ở chỗ nhìn thấy được.
const PAD = 22; // chừa quanh vật cản (nửa đầu sâu ~13px + chút khoảng thở)

const inRect = (x, y, r) => x > r.l && x < r.r && y > r.t && y < r.b;
const grow = (r, p) => ({ l: r.l - p, t: r.t - p, r: r.r + p, b: r.b + p });

const MARGIN = 44; // sâu không bò sát mép hero hơn mức này (khi chọn đích)
const SCARE_RANGE = 260; // chuột phải ở gần đầu hơn mức này mới có thể doạ
const SCARE_CLOSING = 0.95; // px/ms: tốc độ chuột LAO VỀ phía đầu để bị coi là doạ
const SCARE_MS = 1100;
const CALM_MS = 1800; // sau khi bị doạ: bấy nhiêu ms không bị doạ lại
const BORED_MS = 6000; // chuột đứng yên bấy lâu thì sâu chán, tự đi dạo
const QUIPS = ['hm.', '...', 'hmm?', 'la la.', 'nice day.'];

// ---------------------------------------------------------------------------------------------
export function createPointerTracker() {
  let p = null; // toạ độ cuối theo cửa sổ (clientX/Y); null = chuột ngoài cửa sổ / cảm ứng
  let last = 0;
  let still = 0; // mốc lần cuối chuột dịch > 3px
  let vx = 0;
  let vy = 0;
  let wasInside = false;
  return {
    move(cx, cy, now) {
      if (p) {
        const dt = Math.max(1, now - last);
        const dx = cx - p.x;
        const dy = cy - p.y;
        const a = Math.min(1, dt / 25); // làm mượt vận tốc, hằng số thời gian ~25ms (đủ nhanh để bắt kịp cú lao chuột)
        vx += (dx / dt - vx) * a;
        vy += (dy / dt - vy) * a;
        if (Math.hypot(dx, dy) > 3) still = now;
      } else {
        vx = 0;
        vy = 0;
        still = now;
      }
      p = { x: cx, y: cy };
      last = now;
    },
    leave() {
      p = null;
      vx = 0;
      vy = 0;
    },
    // rect = getBoundingClientRect() của hero. Trả về pointer theo toạ độ hero, hoặc null nếu chuột không nằm trong hero.
    read(now, rect) {
      const inside = !!p && p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
      if (inside && !wasInside) {
        vx = 0; // mới đi vào hero thì chưa tính là "lao vào"
        vy = 0;
        still = now;
      }
      wasInside = inside;
      if (!inside) return { pointer: null, idle: 0 };
      const fresh = now - last <= 100; // lâu không có sự kiện = đang đứng yên, vận tốc về 0
      return {
        pointer: { x: p.x - rect.left, y: p.y - rect.top, vx: fresh ? vx : 0, vy: fresh ? vy : 0 },
        idle: now - still,
      };
    },
  };
}

// ---------------------------------------------------------------------------------------------
export function createBrain({ w, h, x, y, heading = Math.PI, rand = Math.random }) {
  const s = {
    w,
    h,
    x,
    y,
    heading,
    speed: 0, // px/khung (60fps)
    mode: 'roam', // 'follow' | 'roam' | 'scared'
    way: null, // đích đi dạo hiện tại
    restUntil: 0,
    scaredUntil: 0,
    calmUntil: 0,
    shyUntil: 0, // sau khi bị doạ: còn ngại, chỉ dám đứng xa nhìn
    flee: null,
    greeted: false,
    look: { x: Math.cos(heading), y: Math.sin(heading) },
    lookUntil: 0,
    nextQuip: 0,
    chkT: 0,
    chkX: x,
    chkY: y,
    wantMove: false,
    obs: [], // vật cản đã nới ra PAD, toạ độ theo hero
    via: '', // góc vật cản đang đi vòng (để không nhảy qua lại giữa hai góc)
  };

  const inBounds = (x, y) => x >= 8 && x <= s.w - 8 && y >= 8 && y <= s.h - 8;
  const blocked = (x, y) => s.obs.some((r) => inRect(x, y, r));
  const segHits = (ax, ay, bx, by, r0) => {
    const r = grow(r0, -2); // thu nhỏ 2px: đi sát mép (đúng đường biên) không bị tính là xuyên qua
    for (let i = 1; i <= 16; i++) {
      const f = i / 16;
      if (inRect(ax + (bx - ax) * f, ay + (by - ay) * f, r)) return true;
    }
    return false;
  };
  const segBlocked = (ax, ay, bx, by) => s.obs.some((r) => segHits(ax, ay, bx, by, r));
  // điểm gần nhất nằm NGOÀI mọi vật cản (nếu (x,y) đã ở ngoài thì giữ nguyên); ưu tiên phía sâu đang đứng để khỏi nhảy bên
  const freePoint = (x, y) => {
    const r = s.obs.find((o) => inRect(x, y, o));
    if (!r) return { x, y };
    const cand = [
      { x: r.l, y },
      { x: r.r, y },
      { x, y: r.t },
      { x, y: r.b },
    ].filter((c) => inBounds(c.x, c.y) && !blocked(c.x, c.y));
    if (!cand.length) return { x, y };
    let best = null;
    for (const c of cand) {
      const cost = Math.hypot(c.x - x, c.y - y) + 0.5 * Math.hypot(c.x - s.x, c.y - s.y);
      if (!best || cost < best.cost) best = { ...c, cost };
    }
    return { x: best.x, y: best.y };
  };
  // từ đầu tới đích mà vướng vật cản thì đi vòng qua góc gần nhất (góc nào cũng phải nằm trong hero và không bị vật cản khác chặn)
  const route = (tx, ty) => {
    if (!s.obs.length || blocked(s.x, s.y)) {
      s.via = '';
      return null; // đang ở trong vật cản thì cứ đi thẳng ra, không đi vòng
    }
    const r = s.obs.find((o) => segHits(s.x, s.y, tx, ty, o));
    if (!r) {
      s.via = '';
      return null;
    }
    const cs = [
      { k: 'tl', x: r.l, y: r.t },
      { k: 'tr', x: r.r, y: r.t },
      { k: 'bl', x: r.l, y: r.b },
      { k: 'br', x: r.r, y: r.b },
    ].filter((c) => inBounds(c.x, c.y) && !blocked(c.x, c.y) && Math.hypot(c.x - s.x, c.y - s.y) > 12); // góc đang đứng sát thì bỏ qua: sang góc kế tiếp
    let best = null;
    for (const c of cs) {
      // chặng nào còn bị vật cản chặn thì phạt nặng: ưu tiên góc mà từ đó nhìn thẳng thấy đích (nếu chưa có thì đi tới góc nhìn thấy được rồi tính tiếp)
      const cost =
        Math.hypot(c.x - s.x, c.y - s.y) +
        Math.hypot(tx - c.x, ty - c.y) +
        (segBlocked(s.x, s.y, c.x, c.y) ? 2000 : 0) +
        (segBlocked(c.x, c.y, tx, ty) ? 2000 : 0) -
        (c.k === s.via ? 40 : 0);
      if (!best || cost < best.cost) best = { ...c, cost };
    }
    if (!best) return null;
    s.via = best.k;
    return best;
  };

  const pickWay = () => {
    const minD = Math.min(s.w, s.h) * 0.3;
    let best = null;
    for (let i = 0; i < 8; i++) {
      const c = {
        x: MARGIN + rand() * Math.max(1, s.w - MARGIN * 2),
        y: MARGIN + rand() * Math.max(1, s.h - MARGIN * 2),
      };
      if (blocked(c.x, c.y)) continue; // không chọn đích nằm sau thẻ
      const d = Math.hypot(c.x - s.x, c.y - s.y);
      if (d >= minD) return c; // chuyến đi dạo đủ dài để nhìn thấy
      if (!best || d > best.d) best = { ...c, d };
    }
    return best || freePoint(s.x, s.y);
  };

  // chọn đích bỏ chạy: ưu tiên thẳng ra xa chuột, nhưng nếu sát tường thì lệch sang bên để trượt dọc tường
  const pickFlee = (p) => {
    const base = Math.atan2(s.y - p.y, s.x - p.x);
    let best = null;
    for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) {
      const a = base + off;
      const tx = clamp(s.x + Math.cos(a) * 230, MARGIN, s.w - MARGIN);
      const ty = clamp(s.y + Math.sin(a) * 230, MARGIN, s.h - MARGIN);
      const gain = Math.hypot(tx - s.x, ty - s.y); // thực sự chạy được bao xa sau khi bị mép chặn
      let score = gain - Math.abs(off) * 40;
      if (blocked(tx, ty)) score -= 1000; // không chạy trốn ra sau thẻ
      else if (segBlocked(s.x, s.y, tx, ty)) score -= 300;
      if (!best || score > best.score) best = { x: tx, y: ty, score, a };
    }
    return best;
  };

  // lái đầu về phía (tx, ty): quay có giới hạn tốc độ quay, tăng/giảm tốc có quán tính -> đường đi cong tự nhiên
  const steer = (tx, ty, { cap, stop, turn }, k) => {
    let ax = tx;
    let ay = ty;
    let stopD = stop;
    const via = route(tx, ty);
    if (via) {
      ax = via.x;
      ay = via.y;
      stopD = 6; // đang đi vòng qua góc: không dừng giữa đường
    }
    const dx = ax - s.x;
    const dy = ay - s.y;
    const d = Math.hypot(dx, dy) || 1;
    s.wantMove = d > stopD;
    if (d <= stopD) {
      s.speed *= Math.pow(0.8, k); // lượn chậm rồi dừng
    } else {
      const diff = angDiff(s.heading, Math.atan2(dy, dx));
      s.heading += clamp(diff, -turn * k, turn * k);
      const align = Math.max(0.15, Math.cos(diff)); // đang quay lưng với đích thì gần như xoay tại chỗ
      const desired = Math.min((d - stopD) * 0.1, cap) * align; // tới gần đích thì giảm tốc dần, không lố qua khoảng dừng
      s.speed += (desired - s.speed) * Math.min(1, 0.2 * k);
    }
    const px = s.x;
    const py = s.y;
    s.x = clamp(s.x + Math.cos(s.heading) * s.speed * k, 8, s.w - 8);
    s.y = clamp(s.y + Math.sin(s.heading) * s.speed * k, 8, s.h - 8);
    // đầu không được chui vào vật cản (trừ khi đang ở sẵn bên trong: lúc đó cứ để nó bò ra)
    for (const r of s.obs) {
      if (inRect(px, py, r) || !inRect(s.x, s.y, r)) continue;
      const pen = [s.x - r.l, r.r - s.x, s.y - r.t, r.b - s.y];
      const m = pen.indexOf(Math.min(...pen));
      if (m === 0) s.x = r.l;
      else if (m === 1) s.x = r.r;
      else if (m === 2) s.y = r.t;
      else s.y = r.b;
    }
  };

  const startScare = (t, p) => {
    const f = pickFlee(p);
    s.mode = 'scared';
    s.flee = { x: f.x, y: f.y };
    s.scaredUntil = t + SCARE_MS;
    s.heading = f.a; // giật nảy ra xa ngay lập tức
    s.speed = 16;
    s.way = null;
    return { text: '!!', ms: 1300 };
  };

  return {
    state: s,
    resize(w2, h2) {
      s.w = w2;
      s.h = h2;
      s.x = clamp(s.x, 8, Math.max(8, w2 - 8));
      s.y = clamp(s.y, 8, Math.max(8, h2 - 8));
      s.way = null;
      s.via = '';
    },
    // đặt đầu sâu ra chỗ trống gần nhất nếu đang nằm sau vật cản (dùng lúc khởi tạo, chưa vẽ gì nên không thấy nhảy)
    placeOutside(obstacles) {
      s.obs = obstacles.map((r) => grow(r, PAD));
      const f = freePoint(s.x, s.y);
      s.x = f.x;
      s.y = f.y;
      return f;
    },
    // inp: { pointer, idle, asleep, maxed, sleepy }. Trả về { moving, scared, mode, look, say }.
    update(t, dt, inp) {
      const k = clamp(dt / 16.667, 0.3, 3);
      const { pointer, idle, asleep, maxed, sleepy, obstacles = [] } = inp;
      s.obs = obstacles.map((r) => grow(r, PAD));
      let say = null;
      if (!s.nextQuip) s.nextQuip = t + 6000;
      if (!s.chkT) s.chkT = t;

      if (asleep) {
        s.mode = 'roam';
        s.way = null;
        s.restUntil = 0;
        s.chkT = t;
        if (blocked(s.x, s.y)) {
          // đang nằm sau thẻ: bò ra chỗ nhìn thấy được rồi mới ngủ
          const f = freePoint(s.x, s.y);
          steer(f.x, f.y, { cap: 4, stop: 2, turn: 0.2 }, k);
          s.look = { x: Math.cos(s.heading), y: Math.sin(s.heading) };
          return { moving: s.speed > 0.8, scared: false, mode: s.mode, look: s.look, say, asleepWalking: true };
        }
        s.speed = 0;
        s.wantMove = false;
        return { moving: false, scared: false, mode: s.mode, look: s.look, say };
      }

      if (idle < 300) s.greeted = false;

      // --- 1. có bị doạ không? Chỉ khi chuột đang lao VỀ PHÍA đầu (không phải chạy ra xa), và không đang trong thời gian nghỉ
      if (pointer && !maxed && s.mode !== 'scared' && t >= s.calmUntil) {
        const dx = s.x - pointer.x;
        const dy = s.y - pointer.y;
        const dh = Math.hypot(dx, dy) || 1;
        const closing = (pointer.vx * dx + pointer.vy * dy) / dh;
        if (dh < SCARE_RANGE && closing > SCARE_CLOSING) say = startScare(t, pointer);
      }
      if (maxed && s.mode === 'scared') s.mode = 'roam';

      // --- 2. hành vi theo chế độ
      const moodCap = maxed ? 1.5 : sleepy ? 0.45 : 1; // pin yếu thì uể oải, mở khoá thì hăng
      if (s.mode === 'scared') {
        const reached = Math.hypot(s.flee.x - s.x, s.flee.y - s.y) < 24;
        if (t >= s.scaredUntil || reached) {
          s.mode = 'roam';
          s.calmUntil = t + CALM_MS;
          s.shyUntil = t + CALM_MS + 1200;
          s.restUntil = 0;
        } else {
          steer(s.flee.x, s.flee.y, { cap: 22, stop: 0, turn: 0.5 }, k);
          s.look = { x: Math.cos(s.heading), y: Math.sin(s.heading) };
        }
      }
      if (s.mode !== 'scared') {
        const follow = !!pointer && idle < BORED_MS;
        if (follow) {
          if (s.mode !== 'follow') {
            s.mode = 'follow';
            s.way = null;
          }
          const still = idle > 700;
          let stop = still ? 70 : 34; // chuột đứng yên: mon men lại gần
          if (t < s.shyUntil) stop = Math.max(stop, 130); // vừa bị doạ: đứng xa nhìn
          const dh = Math.hypot(s.x - pointer.x, s.y - pointer.y);
          if (still && !s.greeted && dh < 100 && t >= s.shyUntil) {
            s.greeted = true;
            say = { text: 'hi.', ms: 2600 };
          }
          const tgt = freePoint(pointer.x, pointer.y); // chuột nằm trong thẻ thì ra ngồi ở mép thẻ gần nhất
          steer(tgt.x, tgt.y, { cap: 14 * moodCap, stop, turn: 0.2 }, k);
          s.look = { x: pointer.x - s.x, y: pointer.y - s.y };
        } else {
          // tự đi dạo: chọn đích -> đi tới -> nghỉ nhìn quanh một lúc -> chọn đích mới
          if (s.mode !== 'roam') {
            s.mode = 'roam';
            s.way = null;
            s.restUntil = 0;
          }
          if (!s.way && t >= s.restUntil) s.way = pickWay();
          if (s.way) {
            steer(s.way.x, s.way.y, { cap: 6.5 * moodCap, stop: 28, turn: 0.1 }, k);
            s.look = { x: s.way.x - s.x, y: s.way.y - s.y };
            if (Math.hypot(s.way.x - s.x, s.way.y - s.y) <= 28) {
              s.way = null;
              s.restUntil = t + 900 + rand() * 3200;
            }
          } else {
            steer(s.x, s.y, { cap: 0, stop: 1, turn: 0 }, k); // đứng nghỉ, dừng dần
            if (t >= s.lookUntil) {
              const a = s.heading + (rand() - 0.5) * 2.6; // liếc quanh
              s.look = { x: Math.cos(a), y: Math.sin(a) };
              s.lookUntil = t + 700 + rand() * 1300;
            }
          }
          if (!say && t >= s.nextQuip) {
            say = { text: QUIPS[Math.floor(rand() * QUIPS.length)], ms: 1800 };
            s.nextQuip = t + 9000 + rand() * 9000;
          }
        }
      }

      // --- 3. bộ canh kẹt: muốn đi mà ~1.2s không nhúc nhích được thì gỡ hết trạng thái, đổi hướng
      if (t - s.chkT > 1200) {
        const moved = Math.hypot(s.x - s.chkX, s.y - s.chkY);
        if (s.wantMove && moved < 4) {
          s.mode = 'roam';
          s.way = null;
          s.restUntil = 0;
          s.scaredUntil = 0;
          s.shyUntil = 0;
          s.calmUntil = t + 1000;
          s.heading += Math.PI * (0.5 + rand());
          s.speed = 4;
        }
        s.chkT = t;
        s.chkX = s.x;
        s.chkY = s.y;
      }

      return { moving: s.speed > 0.8, scared: s.mode === 'scared', mode: s.mode, look: s.look, say };
    },
  };
}
