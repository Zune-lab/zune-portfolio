// Nhân vật phụ ở hero: "crewmate" Among Us sống trong nút contact (chính là hình trên nút). Chỉ có logic, không đụng DOM/canvas
// -> chạy thử được bằng node. HeroWorm.jsx lo vẽ và nối với sâu.
//
// Vòng đời: ẩn trong nút -> chui ra -> đi quanh nút -> (gặp sâu) -> chạy về nút.
//  - sâu lại gần nút (hoặc tới lúc ngẫu nhiên) thì crewmate chui ra, hình trên nút biến mất trong lúc nó đi vắng
//  - sâu đang nhìn quanh thì nó mon men lại gần, nói "sus." rồi chọn một trong hai:
//      poke : lao tới hù, sâu giật mình bỏ chạy ("!!"), crewmate cười "heh." rồi về nút
//      tag  : "catch me!" chạy về nút, sâu đuổi theo tới tận nút, crewmate chui vào, sâu lẩm bẩm "hm."
//  - sâu đang ngủ thì nó rón rén lại gần, nói "shh." (không hù), ngồi cạnh một lúc rồi về
//  - sâu đang bị doạ / đang chạy nhanh lao tới thì nó hoảng ("sus!") chạy về nút
//  - không bao giờ đi vào sau thẻ zune.sav hay các nút khác (đi vòng qua góc nếu bị chắn)

const TAU = Math.PI * 2;
const inRect = (x, y, r) => x > r.l && x < r.r && y > r.t && y < r.b;
const grow = (r, p) => ({ l: r.l - p, t: r.t - p, r: r.r + p, b: r.b + p });
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const ease = (u) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);

const NEAR_WORM = 240; // sâu lại gần nút bấy nhiêu px thì crewmate để ý và chui ra
const FIRST_MS = 3500; // lần đầu sớm nhất sau khi tải trang
const RANDOM_MS = [14000, 26000]; // khoảng cách giữa các lần chui ra "tự nhiên" (cần sâu ở không quá xa)
const COOLDOWN_MS = 9000; // sau khi về nút, nghỉ bấy lâu mới chui ra lại
const OUT_MS = [11000, 17000]; // tối đa ở ngoài bấy lâu rồi tự về
const SPEED = 2.3; // px/khung khi đi dạo / mon men
const RUN = 3.8; // px/khung khi chạy trốn
const BODY_PAD = 6; // nhân vật không được lấn vào vật cản hơn mức này

export function createCrewmate({ rand = Math.random } = {}) {
  const c = {
    state: 'hidden', // hidden | emerge | idle | wander | approach | meet | poke | flee | enter
    x: 0,
    y: 0,
    dir: 1, // 1 = quay mặt sang phải
    since: 0,
    until: 0,
    cooldown: FIRST_MS,
    nextRandom: 0,
    outUntil: 0,
    from: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
    way: null, // điểm trung gian khi phải đi vòng vật cản
    walking: false,
    hop: 0, // 0..1 nhịp nhảy (hù / hoảng)
    say: null, // { text, until }
    plan: '', // 'poke' | 'tag' (chọn lúc gặp sâu)
    replied: false,
    visible: false,
  };

  let obs = []; // vật cản (không kể nút contact), toạ độ theo hero
  let btn = null; // hình chữ nhật nút contact

  const blocked = (x, y) => obs.some((r) => inRect(x, y, grow(r, BODY_PAD)));
  const segBlocked = (ax, ay, bx, by) => {
    for (let i = 1; i <= 14; i++) {
      const f = i / 14;
      if (blocked(ax + (bx - ax) * f, ay + (by - ay) * f)) return true;
    }
    return false;
  };
  const btnC = () => ({ x: (btn.l + btn.r) / 2, y: (btn.t + btn.b) / 2 });

  // điểm ngay ngoài mép nút, phía gần (x, y) nhất mà không bị vật cản khác chắn
  const exitPoint = (tx, ty, w, h) => {
    const g = 20;
    const cx = (btn.l + btn.r) / 2;
    const cy = (btn.t + btn.b) / 2;
    const cand = [
      { x: cx, y: btn.t - g },
      { x: cx, y: btn.b + g },
      { x: btn.l - g, y: cy },
      { x: btn.r + g, y: cy },
    ].filter((p) => p.x > 12 && p.x < w - 12 && p.y > 12 && p.y < h - 12 && !blocked(p.x, p.y));
    if (!cand.length) return { x: cx, y: btn.b + g };
    cand.sort((a, b) => dist(a.x, a.y, tx, ty) - dist(b.x, b.y, tx, ty));
    return cand[0];
  };

  // đích (tx, ty) bị vật cản chắn thì đi vòng qua góc nào cho đường ngắn nhất; trả về điểm trung gian hoặc null
  const routeVia = (ax, ay, tx, ty) => {
    const r = obs.map((o) => grow(o, BODY_PAD + 2)).find((o) => {
      for (let i = 1; i <= 14; i++) {
        const f = i / 14;
        if (inRect(ax + (tx - ax) * f, ay + (ty - ay) * f, grow(o, -2))) return true;
      }
      return false;
    });
    if (!r) return null;
    const cs = [
      { x: r.l, y: r.t },
      { x: r.r, y: r.t },
      { x: r.l, y: r.b },
      { x: r.r, y: r.b },
    ].filter((p) => !blocked(p.x, p.y));
    let best = null;
    for (const p of cs) {
      const cost = dist(ax, ay, p.x, p.y) + dist(p.x, p.y, tx, ty) + (segBlocked(ax, ay, p.x, p.y) ? 1000 : 0) + (segBlocked(p.x, p.y, tx, ty) ? 1000 : 0);
      if (!best || cost < best.cost) best = { ...p, cost };
    }
    return best;
  };

  const go = (tx, ty, speed, k) => {
    let ax = tx;
    let ay = ty;
    // bị vật cản chắn thì đi vòng qua góc (obs không gồm nút contact nên đường vào nút không bị tính là bị chắn)
    const via = c.way || routeVia(c.x, c.y, tx, ty);
    if (via && segBlocked(c.x, c.y, tx, ty)) {
      c.way = via;
      ax = via.x;
      ay = via.y;
      if (dist(c.x, c.y, ax, ay) < 8) c.way = null;
    } else c.way = null;
    const dx = ax - c.x;
    const dy = ay - c.y;
    const d = Math.hypot(dx, dy);
    c.walking = d > 1.5;
    if (d > 1.5) {
      const step = Math.min(d, speed * k);
      c.x += (dx / d) * step;
      c.y += (dy / d) * step;
      if (Math.abs(dx) > 0.5) c.dir = dx > 0 ? 1 : -1;
    }
    return dist(c.x, c.y, tx, ty);
  };

  const speak = (t, text, ms = 1500) => {
    c.say = { text, until: t + ms };
  };
  const to = (t, state, ms = 0) => {
    c.state = state;
    c.since = t;
    c.until = ms ? t + ms : 0;
    c.way = null;
  };

  const wanderPoint = (w, h) => {
    for (let i = 0; i < 10; i++) {
      const a = rand() * TAU;
      const r = 50 + rand() * 90;
      const b = btnC();
      const p = { x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r };
      if (p.x < 14 || p.x > w - 14 || p.y < 14 || p.y > h - 14 || blocked(p.x, p.y) || inRect(p.x, p.y, grow(btn, 8))) continue;
      return p;
    }
    return exitPoint(c.x, c.y, w, h);
  };

  return {
    state: c,
    // inp: { w, h, obstacles (không kể nút contact), button (rect nút contact hoặc null), worm: { x, y, speed, scared, asleep, moving, mode } }
    // Trả về { visible, away (nút đang vắng nhân vật), pokeWorm, wormSay, ... } + trạng thái trong c.
    update(t, dt, inp) {
      const k = Math.min(3, Math.max(0.3, dt / 16.667));
      const { w, h, worm } = inp;
      obs = inp.obstacles || [];
      btn = inp.button || null;
      const out = { pokeWorm: false, wormSay: null, wormFollow: null };
      if (!btn) {
        c.state = 'hidden';
        c.visible = false;
        return { ...out, away: false, visible: false };
      }
      if (c.say && t >= c.say.until) c.say = null;
      const wd = dist(worm.x, worm.y, btnC().x, btnC().y);
      const wormCrew = dist(worm.x, worm.y, c.x, c.y);

      switch (c.state) {
        case 'hidden': {
          c.visible = false;
          const b = btnC();
          c.x = b.x;
          c.y = b.y;
          if (!c.nextRandom) c.nextRandom = t + FIRST_MS + rand() * 8000;
          const curious = wd < NEAR_WORM && !worm.scared;
          const bored = t >= c.nextRandom && (wd < 520 || worm.asleep) && !worm.scared; // sâu ngủ ở xa vẫn rón rén sang thăm
          if (t >= c.cooldown && (curious || bored)) {
            c.from = { x: b.x, y: b.y };
            c.to = exitPoint(worm.x, worm.y, w, h);
            c.outUntil = t + OUT_MS[0] + rand() * (OUT_MS[1] - OUT_MS[0]);
            c.visible = true;
            c.dir = c.to.x >= b.x ? 1 : -1;
            to(t, 'emerge', 650);
          }
          break;
        }
        case 'emerge': {
          const u = ease((t - c.since) / 650);
          c.x = c.from.x + (c.to.x - c.from.x) * u;
          c.y = c.from.y + (c.to.y - c.from.y) * u - Math.sin(u * Math.PI) * 14; // nhảy ra khỏi nút
          c.hop = Math.sin(u * Math.PI);
          c.walking = false;
          if (t >= c.until) {
            c.x = c.to.x;
            c.y = c.to.y;
            c.hop = 0;
            to(t, 'idle', 700 + rand() * 900);
          }
          break;
        }
        case 'idle': {
          c.walking = false;
          c.dir = worm.x >= c.x ? 1 : -1; // nhìn về phía sâu
          if (t >= c.until) {
            const canApproach = !worm.scared && (worm.asleep || (wormCrew < 420 && !segBlocked(c.x, c.y, worm.x, worm.y)));
            if (canApproach && (worm.asleep || rand() < 0.75)) to(t, 'approach');
            else {
              c.to = wanderPoint(w, h);
              to(t, 'wander');
            }
          }
          break;
        }
        case 'wander': {
          const d = go(c.to.x, c.to.y, SPEED, k);
          if (d < 4) to(t, 'idle', 800 + rand() * 1200);
          break;
        }
        case 'approach': {
          // đi tới cách sâu ~58px (ở phía crewmate đang đứng)
          const a = Math.atan2(c.y - worm.y, c.x - worm.x);
          let tx = worm.x + Math.cos(a) * 58;
          let ty = worm.y + Math.sin(a) * 58;
          if (blocked(tx, ty)) {
            const alt = [0.8, -0.8, 1.6, -1.6, Math.PI].map((o) => ({ x: worm.x + Math.cos(a + o) * 58, y: worm.y + Math.sin(a + o) * 58 })).find((p) => !blocked(p.x, p.y) && p.x > 14 && p.x < w - 14 && p.y > 14 && p.y < h - 14);
            if (alt) {
              tx = alt.x;
              ty = alt.y;
            }
          }
          const d = go(tx, ty, worm.asleep ? SPEED * 0.6 : SPEED, k);
          if (worm.scared) {
            to(t, 'flee');
          } else if (d < 8 || wormCrew < 66) {
            c.walking = false;
            c.dir = worm.x >= c.x ? 1 : -1;
            c.plan = worm.asleep ? 'shh' : rand() < 0.5 ? 'poke' : 'tag';
            c.replied = false;
            speak(t, worm.asleep ? 'shh.' : 'sus.', worm.asleep ? 2600 : 1700);
            to(t, 'meet', worm.asleep ? 5200 : 2000);
          } else if (t > c.outUntil || (wd > 700 && !worm.asleep)) {
            to(t, 'flee');
          }
          break;
        }
        case 'meet': {
          c.walking = false;
          c.dir = worm.x >= c.x ? 1 : -1;
          if (!c.replied && c.plan !== 'shh' && t - c.since > 900) {
            c.replied = true;
            out.wormSay = { text: '...?', ms: 1300 };
          }
          if (worm.scared) {
            to(t, 'flee');
          } else if (t >= c.until) {
            if (c.plan === 'poke') {
              speak(t, 'boo.', 900);
              c.replied = false; // dùng lại cờ này để chỉ hù sâu đúng một lần
              to(t, 'poke', 520);
            } else {
              if (c.plan !== 'shh') speak(t, 'catch me!', 1500);
              to(t, 'flee');
            }
          }
          break;
        }
        case 'poke': {
          // nhảy xồ tới sâu, sâu giật mình
          c.hop = Math.sin(Math.min(1, (t - c.since) / 260) * Math.PI);
          const d = go(worm.x, worm.y, 2.6, k);
          c.walking = false;
          if (!c.replied && (d < 36 || t - c.since > 260)) {
            c.replied = true;
            out.pokeWorm = { x: c.x, y: c.y };
          }
          if (t >= c.until) {
            c.hop = 0;
            speak(t, 'heh.', 1500);
            to(t, 'flee');
          }
          break;
        }
        case 'flee': {
          // chạy về nút, chui vào
          const b = btnC();
          const panic = worm.scared || (worm.moving && worm.speed > 5 && wormCrew < 130);
          if (panic && !c.say) speak(t, 'sus!', 1200);
          const near = dist(c.x, c.y, b.x, b.y);
          const d = go(b.x, b.y, panic ? RUN * 1.15 : RUN, k);
          c.hop = panic ? Math.abs(Math.sin(t / 90)) * 0.5 : 0;
          out.wormFollow = c.plan === 'tag' && !worm.scared ? { x: c.x, y: c.y } : null; // trò đuổi bắt: sâu đuổi theo crewmate
          if (inRect(c.x, c.y, btn) || near < 10 || d < 6) {
            c.visible = false;
            c.hop = 0;
            c.cooldown = t + COOLDOWN_MS + rand() * 6000;
            c.nextRandom = t + RANDOM_MS[0] + rand() * (RANDOM_MS[1] - RANDOM_MS[0]);
            if (c.plan === 'tag' && wd < 160) out.wormSay = { text: 'hm.', ms: 1500 };
            c.plan = '';
            to(t, 'enter', 500); // một nhịp "vào" để nút kịp hiện lại hình
          }
          break;
        }
        case 'enter': {
          c.visible = false;
          if (t >= c.until) to(t, 'hidden');
          break;
        }
        default:
          to(t, 'hidden');
      }

      // ở ngoài quá lâu thì tự về nút
      if (['idle', 'wander'].includes(c.state) && t > c.outUntil) to(t, 'flee');
      // sâu lao nhanh tới gần khi crewmate đang đi lòng vòng: hoảng
      if (['idle', 'wander'].includes(c.state) && worm.moving && worm.speed > 6 && wormCrew < 110) {
        speak(t, 'sus!', 1200);
        to(t, 'flee');
      }
      // bị vật cản nuốt mất (thẻ đổi kích thước...) thì đẩy ra
      if (c.visible && ['idle', 'wander', 'approach', 'meet'].includes(c.state) && blocked(c.x, c.y)) {
        const o = obs.find((r) => inRect(c.x, c.y, grow(r, BODY_PAD)));
        if (o) {
          const g = grow(o, BODY_PAD);
          const pen = [c.x - g.l, g.r - c.x, c.y - g.t, g.b - c.y];
          const m = pen.indexOf(Math.min(...pen));
          if (m === 0) c.x = g.l;
          else if (m === 1) c.x = g.r;
          else if (m === 2) c.y = g.t;
          else c.y = g.b;
        }
      }
      // "away": nút đang vắng nhân vật (hình trên nút biến mất) từ lúc chui ra tới lúc chui vào
      const away = c.state !== 'hidden' && c.state !== 'enter';
      return { ...out, away, visible: c.visible };
    },
  };
}
