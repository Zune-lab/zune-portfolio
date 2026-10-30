import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './HeroLetters.css';
import { site } from '../../config/site.js';
import { frameLoop } from '../../lib/loop.js';
import { prefersReducedMotion } from '../../lib/env.js';
import { observeOnce } from '../../lib/observe.js';
import { clamp, pick, rand, randInt } from '../../lib/math.js';
import { getSocial, isAsleep, onSocialChange } from '../../lib/social.js';
import { HOLD_MS, HOLD_SLOP_PX, isTouchPointer } from '../../mobile/touch.js';

// CẢ HERO LÀ SÂN CHƠI. Các chữ của `zune.dev` rơi từ trên xuống và đáp lên chính các phần tử thật của trang:
// nút VIEW PROJECTS / CONTACT, thẻ zune.sav, hai link ở đáy. Bấm / chạm vào chữ thì nó nảy lên, kéo thì cầm lên được
// và THẢ / NÉM đi (vật lý thật bằng Matter.js).
//  - Vật cản = mọi phần tử có `data-solid`, và mọi con trực tiếp của phần tử có `data-solid-kids` (đặt trong Hero.jsx).
//    Muốn cho chữ đứng được lên thứ gì thì chỉ cần thêm thuộc tính đó. Vị trí được đo lại khi đổi kích thước, khi nội dung
//    dịch chuyển (kiểm tra định kỳ khi vòng lặp đang chạy) và mỗi lần người dùng tương tác.
//  - Lớp phủ `.letters-yard` phủ kín hero nhưng pointer-events: none; chỉ từng chữ nhận chuột/chạm, nên mọi thứ bên dưới
//    vẫn bấm được bình thường.
//  - Matter.js chỉ tải khi hero vào khung nhìn (import() động). Chữ chỉ bắt đầu rơi sau khi Preloader đã biến mất.
//  - Chữ là phần tử DOM (không phải canvas): font, màu, theme sáng/tối tự theo CSS. Vật lý chỉ cập nhật transform.
//  - Phản ứng với "pin xã hội" (lib/social.js): bấm `say hi` ở thẻ zune.sav thì cả đám nhảy lên, hết pin thì mờ đi như ngủ,
//    mở khoá 100% personality thì hoá cầu vồng và nhảy loạn.
//  - Bấm / chạm vào chỗ trống của hero thì thả thêm một ký tự code ({} => 404 ...), cũng cầm / ném được; tối đa MAX_EXTRA ký tự,
//    thả thêm thì cái cũ nhất mờ đi rồi biến mất. Ba nút ở khoảng trống bên trái (nhận qua `slot`): shake (hất tung tất cả),
//    zero-g (tắt trọng lực: mọi thứ trôi lơ lửng và nảy khỏi tường), clear (dọn ký tự thả thêm).
//  - Vòng lặp là lib/loop.js nên tự dừng khi screensaver / tab ẩn / khuất khỏi khung nhìn, và dừng hẳn khi mọi chữ đã nằm yên (ngủ).
//  - Giảm chuyển động: không render gì cả (chữ chỉ là đồ chơi, tên đã có ở tiêu đề).
const CHARS = [...site.handle]; // 'zune.dev'
const HOT = site.id.length; // bấy nhiêu chữ đầu (zune) màu amber, phần còn lại (.dev) màu chữ thường
const STEP = 1000 / 60; // bước vật lý cố định: ổn định hơn bước theo thời gian khung
const MAX_STEPS = 3; // tối đa bước bù mỗi khung (tab vừa dậy không bị "nhảy vọt")
const DROP_MS = 90; // chữ sau rơi trễ chữ trước chừng này, để rơi lần lượt
const KICK_PX = 5; // di chuyển ít hơn mức này (và nhanh) thì tính là "bấm", không phải kéo
const KICK_MS = 250;
const G = 1.15; // trọng lực bình thường (zero-g đặt về 0)
const MAX_EXTRA = 24; // số ký tự thả thêm tối đa cùng lúc
const TOKENS = ['{}', '()', '[]', ';', '=>', '</>', '//', '&&', '++', '0', '1', '*', '#', '~', '$', '404', 'null', 'NaN', 'git', 'bug', ':)'];
const SOLID = '[data-solid], [data-solid-kids] > *';
const PRELOADER_WAIT_MS = 6000; // chờ Preloader tối đa chừng này, hết hạn thì rơi luôn

// Dựng thế giới vật lý trong `yard` (lớp phủ kín hero), trả về hàm dọn dẹp. `M` = module matter-js đã tải xong,
// `els` = các phần tử chữ, `bar` = khung nút (có thể null nếu Hero không cấp chỗ cho nó).
function start(M, yard, els, bar) {
  const { Engine, Bodies, Body, Composite, Constraint, Sleeping } = M;
  const hero = yard.parentElement; // header .hero-full: cũng là vùng bắt cú bấm để thả ký tự
  const engine = Engine.create({ enableSleeping: true, gravity: { y: G } });
  const world = engine.world;
  const n = els.length;
  const bodies = []; // chữ chính (zune.dev), theo thứ tự của `els`
  const extras = []; // ký tự thả thêm: { el, body, w, h, off }
  const timers = [];
  let walls = [];
  let solids = [];
  let solidSig = '';
  let solidDirty = false;
  let w = 0;
  let h = 0;
  let boxW = 0;
  let boxH = 0;
  let fontPx = 40; // cỡ chữ hiện tại (ký tự thả thêm lấy một phần của cỡ này)
  let zeroG = false;
  let lastUp = 0; // lúc thả tay gần nhất: để bỏ qua cú click sinh ra ngay sau khi thả một chữ
  let drag = null; // { el, c, id, x0, y0, t0, moved }
  let seen = getSocial();
  let seenHi = seen.hiAt;
  let seenMax = seen.maxAt;

  const buildWalls = () => {
    Composite.remove(world, walls);
    const T = 100; // dày để chữ bị ném mạnh cũng không xuyên qua
    const o = { isStatic: true, friction: 0.6 };
    walls = [
      Bodies.rectangle(w / 2, h + T / 2, w + T * 2, T, o), // sàn
      Bodies.rectangle(-T / 2, h / 2, T, h * 3, o), // trái
      Bodies.rectangle(w + T / 2, h / 2, T, h * 3, o), // phải
      Bodies.rectangle(w / 2, -T / 2, w + T * 2, T, o), // trần
    ];
    Composite.add(world, walls);
  };

  const all = () => [...bodies.filter(Boolean), ...extras.map((x) => x.body)];
  const place = (el, b, bw, bh) => {
    el.style.transform = `translate3d(${(b.position.x - bw / 2).toFixed(1)}px, ${(b.position.y - bh / 2).toFixed(1)}px, 0) rotate(${b.angle.toFixed(3)}rad)`;
  };
  const draw = () => {
    for (let i = 0; i < bodies.length; i++) place(els[i], bodies[i], boxW, boxH);
    for (const x of extras) place(x.el, x.body, x.w, x.h);
  };

  // mọi chữ đã rơi xong và nằm yên (Matter cho ngủ) và không ai đang cầm: không cần chạy vật lý nữa.
  // Ở zero-g thì không bao giờ "yên" (đã tắt ngủ): vòng lặp chạy tiếp, nhưng vẫn tự dừng khi hero khuất khỏi khung nhìn
  const resting = () => !zeroG && bodies.length === n && !drag && all().every((b) => b.isSleeping);
  let acc = 0;
  let last = 0;
  let ticks = 0;
  const tick = (t) => {
    acc += last ? Math.min(100, t - last) : STEP;
    last = t;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS) {
      Engine.update(engine, STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) acc = 0;
    if (solidDirty || ++ticks % 24 === 0) {
      solidDirty = false;
      buildSolids(); // nội dung trang có thể đã dịch chuyển (gõ chữ, xuống dòng, phông tải xong)
    }
    draw();
    if (resting()) loop.sync(); // canRun() sẽ trả false -> huỷ hẳn rAF
  };
  const loop = frameLoop(tick, {
    watch: yard,
    canRun: () => !resting(),
    onResume: () => {
      last = 0;
      solidDirty = true; // đo lại ở khung đầu tiên (không gọi trực tiếp ở đây để tránh đệ quy với loop.sync)
    },
  });
  const wake = () => {
    all().forEach((b) => Sleeping.set(b, false));
    loop.sync();
  };

  const jump = (b, k = 1) => {
    Sleeping.set(b, false);
    Body.setVelocity(b, { x: rand(-3, 3) * k, y: -rand(7, 10) * k });
    Body.setAngularVelocity(b, rand(-0.25, 0.25) * k);
  };

  // --- vật cản: các phần tử thật của trang, đo theo toạ độ của lớp phủ (hero cuộn thì cả hai cùng cuộn nên không lệch)
  const measure = () => {
    const o = yard.getBoundingClientRect();
    return [...hero.querySelectorAll(SOLID)]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
      })
      .filter((r) => r.w > 4 && r.h > 4);
  };
  const buildSolids = (force = false) => {
    const list = measure();
    const sig = list.map((r) => `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)},${Math.round(r.h)}`).join('|');
    if (!force && sig === solidSig) return;
    solidSig = sig;
    Composite.remove(world, solids);
    solids = list.map((r) =>
      Bodies.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, {
        isStatic: true,
        friction: 0.6,
        chamfer: { radius: Math.min(10, r.h / 3) },
      })
    );
    Composite.add(world, solids);
    wake(); // chữ đang nằm trên thứ vừa dịch chuyển phải được đánh thức để rơi / trượt theo
  };

  // --- kích thước: chữ to theo bề rộng hero; đo lại khi đổi kích thước (xoay điện thoại, kéo cửa sổ)
  const layout = () => {
    w = yard.clientWidth;
    h = yard.clientHeight;
    const size = clamp(Math.round(Math.min(w, 1100) / 11), 30, 56);
    fontPx = size;
    boxW = Math.round(size * 0.68);
    boxH = Math.round(size * 1.2);
    yard.style.setProperty('--fs', `${size}px`);
    els.forEach((el) => {
      el.style.width = `${boxW}px`;
      el.style.height = `${boxH}px`;
    });
    buildWalls();
    buildSolids(true);
    all().forEach((b) => {
      // hero hẹp lại thì kéo chữ nằm ngoài vào trong, không để kẹt trong tường (mỗi chữ theo kích thước riêng của nó)
      const hw = (b.bounds.max.x - b.bounds.min.x) / 2;
      const hh = (b.bounds.max.y - b.bounds.min.y) / 2;
      Body.setPosition(b, { x: clamp(b.position.x, hw, w - hw), y: clamp(b.position.y, hh, h - hh) });
    });
    wake();
  };
  const ro = new ResizeObserver(layout);
  ro.observe(yard);
  layout();
  const roSolid = new ResizeObserver(() => (solidDirty = true)); // thẻ / nút đổi kích thước (vd. nội dung thẻ zune.sav đổi)
  hero.querySelectorAll(SOLID).forEach((el) => roSolid.observe(el));

  // --- thả chữ lần lượt từ trên xuống, ngay trên hàng nút (khoảng trống bên trái), sau khi Preloader đã biến mất
  const dropAll = () => {
    const kids = hero.querySelector('[data-solid-kids]');
    const o = yard.getBoundingClientRect();
    let cx = w / 2;
    if (kids?.firstElementChild) {
      const a = kids.firstElementChild.getBoundingClientRect();
      const z = kids.lastElementChild.getBoundingClientRect();
      cx = (a.left + z.right) / 2 - o.left;
    }
    CHARS.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          const x = clamp(cx + (i - (n - 1) / 2) * boxW * 0.85 + rand(-8, 8), boxW, w - boxW);
          const b = Bodies.rectangle(x, boxH, boxW, boxH, {
            chamfer: { radius: 8 },
            restitution: zeroG ? 0.9 : 0.4,
            friction: 0.35,
            frictionAir: zeroG ? 0.004 : 0.012,
            density: 0.0018,
            sleepThreshold: 45,
          });
          Body.setAngle(b, rand(-0.7, 0.7));
          Body.setAngularVelocity(b, rand(-0.15, 0.15));
          bodies[i] = b;
          Composite.add(world, b);
          place(els[i], b, boxW, boxH); // đặt đúng chỗ ngay, không nháy ở góc trên trái
          els[i].setAttribute('data-live', '');
          loop.sync();
        }, i * DROP_MS)
      );
    });
  };
  let waited = 0;
  const intro = () => {
    // Preloader (#preloader) phủ kín màn hình lúc đầu: chờ nó biến mất để màn chữ rơi không diễn ra sau lưng nó
    if (!document.getElementById('preloader') || (waited += 100) > PRELOADER_WAIT_MS) dropAll();
    else timers.push(setTimeout(intro, 100));
  };
  intro();
  yard.setAttribute('data-ready', '');
  bar?.setAttribute('data-ready', '');

  // --- cầm / kéo / thả: Pointer Events + một ràng buộc "lò xo" kéo chữ theo ngón tay (không dùng Matter.Mouse: nó chặn cuộn trang)
  const local = (e) => {
    const r = yard.getBoundingClientRect();
    return { x: clamp(e.clientX - r.left, 0, w), y: clamp(e.clientY - r.top, 0, h) }; // giữ điểm kéo trong sân để chữ không bị lôi xuyên tường
  };
  // gắn cầm / kéo / thả / bấm-nảy cho một phần tử; `getBody` lấy thân vật lý hiện tại của nó. Trả về hàm gỡ listener
  const grab = (el, getBody) => {
    // pending: ngón tay vừa chạm (cảm ứng) nhưng chưa đủ HOLD_MS để tính là "cầm"; lúc này trang vẫn cuộn được bình thường
    let pending = null;
    const start = (e) => {
      const b = getBody();
      if (!b || drag) return;
      el.setPointerCapture(e.pointerId);
      const p = local(e);
      const dx = p.x - b.position.x;
      const dy = p.y - b.position.y;
      const cos = Math.cos(b.angle);
      const sin = Math.sin(b.angle);
      const c = Constraint.create({
        pointA: p,
        bodyB: b,
        pointB: { x: dx * cos + dy * sin, y: -dx * sin + dy * cos }, // vị trí cầm, tính trong hệ toạ độ của chữ
        stiffness: 0.18,
        damping: 0.12,
        length: 0,
      });
      Composite.add(world, c);
      Sleeping.set(b, false);
      drag = { el, c, id: e.pointerId, x0: p.x, y0: p.y, t0: performance.now(), moved: false };
      el.setAttribute('data-held', '');
      bar?.setAttribute('data-touched', '');
      solidDirty = true;
      loop.sync();
    };
    const down = (e) => {
      if (!getBody() || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (!isTouchPointer(e)) return start(e);
      // cảm ứng: chờ giữ yên HOLD_MS mới cầm; vuốt ngay thì trình duyệt cuộn trang (xem mobile/touch.js)
      const last = { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId };
      pending = {
        id: e.pointerId, x: e.clientX, y: e.clientY, t0: performance.now(), last,
        timer: setTimeout(() => {
          const pe = pending;
          pending = null;
          if (pe) start(pe.last);
        }, HOLD_MS),
      };
    };
    const cancelPending = () => {
      if (pending) clearTimeout(pending.timer);
      pending = null;
    };
    // đang cầm bằng cảm ứng thì chặn cuộn trang (touchmove phải non-passive mới huỷ được)
    const blockScroll = (e) => {
      if (drag && drag.el === el && e.cancelable) e.preventDefault();
    };
    const move = (e) => {
      if (pending && e.pointerId === pending.id) {
        pending.last = { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId };
        if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > HOLD_SLOP_PX) cancelPending(); // đang cuộn trang
        return;
      }
      if (!drag || drag.el !== el || e.pointerId !== drag.id) return;
      const p = local(e);
      drag.c.pointA = p;
      if (Math.hypot(p.x - drag.x0, p.y - drag.y0) > KICK_PX) drag.moved = true;
    };
    const up = (e) => {
      if (pending && e.pointerId === pending.id) {
        // chạm nhanh rồi nhả (chưa đủ HOLD_MS, không trượt): chữ nảy lên như khi bấm chuột
        const quick = e.type === 'pointerup' && performance.now() - pending.t0 < KICK_MS;
        cancelPending();
        if (quick && getBody()) jump(getBody());
        return;
      }
      if (!drag || drag.el !== el || e.pointerId !== drag.id) return;
      Composite.remove(world, drag.c);
      el.removeAttribute('data-held');
      // chỉ chạm / bấm nhẹ (không kéo): chữ nảy lên một cái
      if (!drag.moved && performance.now() - drag.t0 < KICK_MS && getBody()) jump(getBody());
      drag = null;
      lastUp = performance.now();
      loop.sync();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      cancelPending();
      el.removeEventListener('touchmove', blockScroll);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  };
  const offGrabs = els.map((el, i) => grab(el, () => bodies[i]));

  // --- ký tự thả thêm: bấm / chạm vào chỗ trống của hero
  const clearBtn = bar?.querySelector('[data-act="clear"]');
  const syncClear = () => {
    if (clearBtn) clearBtn.disabled = extras.length === 0;
  };
  const dropExtra = (x) => {
    const i = extras.indexOf(x);
    if (i >= 0) extras.splice(i, 1);
    if (drag && drag.el === x.el) {
      Composite.remove(world, drag.c); // đang cầm đúng cái bị dọn: nhả ra
      drag = null;
    }
    Composite.remove(world, x.body);
    x.off();
    x.el.style.opacity = '0'; // mờ dần (transition của .letter) rồi mới gỡ khỏi DOM
    x.el.style.pointerEvents = 'none';
    timers.push(setTimeout(() => x.el.remove(), 400));
    syncClear();
  };
  const spawn = (px, py) => {
    const token = pick(TOKENS);
    const fs = Math.round(fontPx * rand(0.5, 0.78));
    const bw = Math.round(fs * 0.62 * token.length) + 12;
    const bh = Math.round(fs * 1.2);
    const el = document.createElement('span');
    el.className = 'letter letter-extra';
    el.textContent = token;
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-live', '');
    if (Math.random() < 0.45) el.setAttribute('data-hot', '');
    el.style.setProperty('--fs', `${fs}px`);
    el.style.setProperty('--i', String(randInt(0, 7))); // màu khi chế độ cầu vồng
    el.style.width = `${bw}px`;
    el.style.height = `${bh}px`;
    const body = Bodies.rectangle(clamp(px, bw / 2, w - bw / 2), clamp(py, bh / 2, h - bh / 2), bw, bh, {
      chamfer: { radius: Math.min(8, bh / 4) },
      restitution: zeroG ? 0.9 : 0.45,
      friction: 0.3,
      frictionAir: zeroG ? 0.004 : 0.012,
      density: 0.0014,
      sleepThreshold: 45,
    });
    Body.setAngle(body, rand(-0.6, 0.6));
    Body.setVelocity(body, { x: rand(-3, 3), y: rand(-6, -1) });
    Body.setAngularVelocity(body, rand(-0.2, 0.2));
    const x = { el, body, w: bw, h: bh, off: () => {} };
    x.off = grab(el, () => x.body);
    place(el, body, bw, bh); // đặt đúng chỗ ngay, không nháy ở góc trên trái trước khung đầu tiên
    yard.appendChild(el);
    Composite.add(world, body);
    extras.push(x);
    if (extras.length > MAX_EXTRA) dropExtra(extras[0]);
    syncClear();
    wake();
  };

  // --- ba nút: shake / zero-g / clear
  const setZeroG = (on) => {
    zeroG = on;
    engine.gravity.y = on ? 0 : G;
    engine.enableSleeping = !on; // ở zero-g tắt ngủ, không thì mọi thứ đứng hình giữa không trung
    all().forEach((b) => {
      Sleeping.set(b, false);
      Body.set(b, 'restitution', on ? 0.9 : 0.4);
      Body.set(b, 'frictionAir', on ? 0.004 : 0.012);
      if (on) {
        Body.setVelocity(b, { x: rand(-2.5, 2.5), y: rand(-3.5, -1) });
        Body.setAngularVelocity(b, rand(-0.1, 0.1));
      }
    });
    bar?.querySelector('[data-act="zerog"]')?.setAttribute('aria-pressed', String(on));
    loop.sync();
  };
  const onBar = (e) => {
    const act = e.target.closest('[data-act]')?.getAttribute('data-act');
    if (!act) return;
    bar.setAttribute('data-touched', '');
    buildSolids();
    if (act === 'shake') {
      all().forEach((b) => jump(b, rand(0.8, 1.6)));
      loop.sync();
    } else if (act === 'zerog') {
      setZeroG(!zeroG);
    } else if (act === 'clear') {
      [...extras].forEach(dropExtra);
    }
  };
  bar?.addEventListener('click', onBar);
  // bấm vào chỗ trống của hero (không phải link / nút / thẻ / chữ, không phải đang bôi đen văn bản): thả thêm một ký tự
  const onHero = (e) => {
    if (e.target.closest('a, button, input, textarea, select, label, [data-solid], .letter')) return;
    if (performance.now() - lastUp < 80 || window.getSelection?.().toString()) return;
    bar?.setAttribute('data-touched', '');
    buildSolids();
    const p = local(e);
    spawn(p.x, p.y);
  };
  hero.addEventListener('click', onHero);

  // --- phản ứng với pin xã hội (store ngoài React nên không re-render cả hero)
  const onSocial = () => {
    const s = getSocial();
    yard.toggleAttribute('data-asleep', isAsleep(s));
    yard.toggleAttribute('data-rainbow', s.maxed);
    if (s.hiAt !== seenHi) {
      seenHi = s.hiAt;
      all().forEach((b) => jump(b, 0.6));
      loop.sync();
    }
    if (s.maxAt !== seenMax) {
      seenMax = s.maxAt;
      all().forEach((b) => jump(b, 1.4));
      loop.sync();
    }
  };
  const offSocial = onSocialChange(onSocial);
  onSocial();

  return () => {
    timers.forEach(clearTimeout);
    loop.stop();
    ro.disconnect();
    roSolid.disconnect();
    offSocial();
    hero.removeEventListener('click', onHero);
    bar?.removeEventListener('click', onBar);
    offGrabs.forEach((off) => off());
    extras.forEach((x) => {
      x.off();
      x.el.remove();
    });
    Composite.clear(world, false);
    Engine.clear(engine);
  };
}

// `slot`: phần tử (trong Hero) để đặt hàng chữ gợi ý + ba nút. Lớp phủ vật lý thì là con trực tiếp của hero (position: relative).
export default function HeroLetters({ slot }) {
  const yard = useRef(null);
  const bar = useRef(null);
  const letters = useRef([]);
  const [still] = useState(prefersReducedMotion); // giảm chuyển động: không có sân chữ, không tải Matter.js

  useEffect(() => {
    if (still) return undefined;
    let dead = false;
    let teardown = () => {};
    const stopWatch = observeOnce(
      yard.current,
      async () => {
        const mod = await import('matter-js');
        // bar.current đã có lúc này: slot được gán ở lần render đầu, còn import() chạy bất đồng bộ sau đó
        if (!dead) teardown = start(mod.default ?? mod, yard.current, letters.current, bar.current);
      },
      0.1
    );
    return () => {
      dead = true;
      stopWatch();
      teardown();
    };
  }, [still]);

  if (still) return null;
  return (
    <>
      <div ref={yard} className="letters-yard" aria-hidden="true">
        {CHARS.map((ch, i) => (
          <span
            key={i}
            ref={(el) => {
              letters.current[i] = el;
            }}
            className="letter"
            data-hot={i < HOT || undefined}
            style={{ '--i': i }}
          >
            {ch}
          </span>
        ))}
      </div>
      {slot &&
        createPortal(
          <div ref={bar} className="letters-ctrl">
            <p className="letters-hint">{'// this page is a toy. grab a letter, or click anywhere to drop more'}</p>
            <div className="letters-btns" role="group" aria-label="letter toys">
              <button type="button" data-act="shake">shake</button>
              <button type="button" data-act="zerog" aria-pressed="false">zero-g</button>
              <button type="button" data-act="clear" disabled>clear</button>
            </div>
          </div>,
          slot
        )}
    </>
  );
}
