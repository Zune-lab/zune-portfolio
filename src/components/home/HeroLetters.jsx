import { useEffect, useRef, useState } from 'react';
import './HeroLetters.css';
import { site } from '../../config/site.js';
import { frameLoop } from '../../lib/loop.js';
import { prefersReducedMotion } from '../../lib/env.js';
import { observeOnce } from '../../lib/observe.js';
import { clamp, rand } from '../../lib/math.js';
import { getSocial, isAsleep, onSocialChange } from '../../lib/social.js';

// Sân chữ ở hero: các chữ của `zune.dev` rơi xuống một "sàn" rồi nằm đó; bấm / chạm vào một chữ thì nó nảy lên, kéo thì
// cầm lên được và THẢ / NÉM đi (vật lý thật bằng Matter.js). Thay cho con sâu chữ cũ: chạy cả trên cảm ứng, không cần con trỏ.
//  - Matter.js chỉ tải khi sân chữ lần đầu vào khung nhìn (import() động) nên không làm nặng bundle đầu.
//  - Chữ là phần tử DOM (không phải canvas): font, màu, theme sáng/tối tự theo CSS. Vật lý chỉ cập nhật transform.
//  - Phản ứng với "pin xã hội" (lib/social.js): bấm `say hi` ở thẻ zune.sav thì cả đám nhảy lên, hết pin thì mờ đi như ngủ,
//    mở khoá 100% personality thì hoá cầu vồng và nhảy loạn.
//  - Vòng lặp là lib/loop.js nên tự dừng khi screensaver / tab ẩn / khuất khỏi khung nhìn, và dừng hẳn khi mọi chữ đã nằm yên (ngủ).
//  - Giảm chuyển động: không vật lý, chữ xếp thành một hàng tĩnh.
const CHARS = [...site.handle]; // 'zune.dev'
const HOT = site.id.length; // bấy nhiêu chữ đầu (zune) màu amber, phần còn lại (.dev) màu chữ thường
const STEP = 1000 / 60; // bước vật lý cố định: ổn định hơn bước theo thời gian khung
const MAX_STEPS = 3; // tối đa bước bù mỗi khung (tab vừa dậy không bị "nhảy vọt")
const DROP_MS = 90; // chữ sau rơi trễ chữ trước chừng này, để rơi lần lượt
const KICK_PX = 5; // di chuyển ít hơn mức này (và nhanh) thì tính là "bấm", không phải kéo
const KICK_MS = 250;

// Dựng thế giới vật lý trong `yard`, trả về hàm dọn dẹp. `M` = module matter-js đã tải xong, `els` = các phần tử chữ.
function start(M, yard, els) {
  const { Engine, Bodies, Body, Composite, Constraint, Sleeping } = M;
  const engine = Engine.create({ enableSleeping: true, gravity: { y: 1.15 } });
  const world = engine.world;
  const n = els.length;
  const bodies = [];
  const timers = [];
  let walls = [];
  let w = 0;
  let h = 0;
  let boxW = 0;
  let boxH = 0;
  let drag = null; // { i, c, id, x0, y0, t0, moved }
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

  const draw = () => {
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      els[i].style.transform = `translate3d(${(b.position.x - boxW / 2).toFixed(1)}px, ${(b.position.y - boxH / 2).toFixed(1)}px, 0) rotate(${b.angle.toFixed(3)}rad)`;
    }
  };

  // mọi chữ đã rơi xong và nằm yên (Matter cho ngủ) và không ai đang cầm: không cần chạy vật lý nữa
  const resting = () => bodies.length === n && !drag && bodies.every((b) => b.isSleeping);
  let acc = 0;
  let last = 0;
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
    draw();
    if (resting()) loop.sync(); // canRun() sẽ trả false -> huỷ hẳn rAF
  };
  const loop = frameLoop(tick, { watch: yard, canRun: () => !resting(), onResume: () => (last = 0) });
  const wake = () => {
    bodies.forEach((b) => Sleeping.set(b, false));
    loop.sync();
  };

  const jump = (b, k = 1) => {
    Sleeping.set(b, false);
    Body.setVelocity(b, { x: rand(-3, 3) * k, y: -rand(7, 10) * k });
    Body.setAngularVelocity(b, rand(-0.25, 0.25) * k);
  };

  // --- kích thước: chữ to theo bề rộng sân; đo lại khi đổi kích thước (xoay điện thoại, kéo cửa sổ)
  const layout = () => {
    w = yard.clientWidth;
    h = yard.clientHeight;
    const size = clamp(Math.round(w / 11), 30, 56);
    boxW = Math.round(size * 0.68);
    boxH = Math.round(size * 1.2);
    yard.style.setProperty('--fs', `${size}px`);
    els.forEach((el) => {
      el.style.width = `${boxW}px`;
      el.style.height = `${boxH}px`;
    });
    buildWalls();
    bodies.forEach((b) => {
      // sân hẹp lại thì kéo chữ nằm ngoài vào trong, không để kẹt trong tường
      Body.setPosition(b, { x: clamp(b.position.x, boxW, w - boxW), y: clamp(b.position.y, boxH / 2, h - boxH / 2) });
    });
    wake();
  };
  const ro = new ResizeObserver(layout);
  ro.observe(yard);
  layout();

  // --- thả chữ lần lượt từ trên xuống
  CHARS.forEach((_, i) => {
    timers.push(
      setTimeout(() => {
        const x = w / 2 + (i - (n - 1) / 2) * boxW * 0.85 + rand(-8, 8);
        const b = Bodies.rectangle(x, boxH, boxW, boxH, {
          chamfer: { radius: 8 },
          restitution: 0.4,
          friction: 0.35,
          frictionAir: 0.012,
          density: 0.0018,
          sleepThreshold: 45,
        });
        Body.setAngle(b, rand(-0.7, 0.7));
        Body.setAngularVelocity(b, rand(-0.15, 0.15));
        bodies[i] = b;
        Composite.add(world, b);
        loop.sync();
      }, i * DROP_MS)
    );
  });
  yard.setAttribute('data-ready', '');

  // --- cầm / kéo / thả: Pointer Events + một ràng buộc "lò xo" kéo chữ theo ngón tay (không dùng Matter.Mouse: nó chặn cuộn trang)
  const local = (e) => {
    const r = yard.getBoundingClientRect();
    return { x: clamp(e.clientX - r.left, 0, w), y: clamp(e.clientY - r.top, 0, h) }; // giữ điểm kéo trong sân để chữ không bị lôi xuyên tường
  };
  const handlers = els.map((el, i) => {
    const down = (e) => {
      const b = bodies[i];
      if (!b || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
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
      drag = { i, c, id: e.pointerId, x0: p.x, y0: p.y, t0: performance.now(), moved: false };
      el.setAttribute('data-held', '');
      yard.setAttribute('data-touched', '');
      loop.sync();
    };
    const move = (e) => {
      if (!drag || drag.i !== i || e.pointerId !== drag.id) return;
      const p = local(e);
      drag.c.pointA = p;
      if (Math.hypot(p.x - drag.x0, p.y - drag.y0) > KICK_PX) drag.moved = true;
    };
    const up = (e) => {
      if (!drag || drag.i !== i || e.pointerId !== drag.id) return;
      Composite.remove(world, drag.c);
      el.removeAttribute('data-held');
      // chỉ chạm / bấm nhẹ (không kéo): chữ nảy lên một cái
      if (!drag.moved && performance.now() - drag.t0 < KICK_MS) jump(bodies[i]);
      drag = null;
      loop.sync();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return { down, move, up };
  });

  // --- phản ứng với pin xã hội (store ngoài React nên không re-render cả hero)
  const onSocial = () => {
    const s = getSocial();
    yard.toggleAttribute('data-asleep', isAsleep(s));
    yard.toggleAttribute('data-rainbow', s.maxed);
    if (s.hiAt !== seenHi) {
      seenHi = s.hiAt;
      bodies.forEach((b) => jump(b, 0.6));
      loop.sync();
    }
    if (s.maxAt !== seenMax) {
      seenMax = s.maxAt;
      bodies.forEach((b) => jump(b, 1.4));
      loop.sync();
    }
  };
  const offSocial = onSocialChange(onSocial);
  onSocial();

  return () => {
    timers.forEach(clearTimeout);
    loop.stop();
    ro.disconnect();
    offSocial();
    els.forEach((el, i) => {
      el.removeEventListener('pointerdown', handlers[i].down);
      el.removeEventListener('pointermove', handlers[i].move);
      el.removeEventListener('pointerup', handlers[i].up);
      el.removeEventListener('pointercancel', handlers[i].up);
    });
    Composite.clear(world, false);
    Engine.clear(engine);
  };
}

export default function HeroLetters() {
  const yard = useRef(null);
  const letters = useRef([]);
  const [still] = useState(prefersReducedMotion); // giảm chuyển động: hàng chữ tĩnh, không tải Matter.js

  useEffect(() => {
    if (still) return undefined;
    let dead = false;
    let teardown = () => {};
    const stopWatch = observeOnce(
      yard.current,
      async () => {
        const mod = await import('matter-js');
        if (!dead) teardown = start(mod.default ?? mod, yard.current, letters.current);
      },
      0.1
    );
    return () => {
      dead = true;
      stopWatch();
      teardown();
    };
  }, [still]);

  return (
    <div ref={yard} className="letters-yard" role="img" aria-label={site.handle} data-static={still || undefined}>
      <span className="letters-hint" aria-hidden="true">{'// grab a letter'}</span>
      {CHARS.map((ch, i) => (
        <span
          key={i}
          ref={(el) => {
            letters.current[i] = el;
          }}
          className="letter"
          data-hot={i < HOT || undefined}
          style={{ '--i': i }}
          aria-hidden="true"
        >
          {ch}
        </span>
      ))}
    </div>
  );
}
