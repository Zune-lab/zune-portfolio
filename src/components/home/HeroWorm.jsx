import { useEffect, useRef } from 'react';
import { getSocial, isAsleep, levelOf } from '../../lib/social.js';
import { onThemeChange } from '../../lib/themeSync.js';
import { createBrain, createPointerTracker, pushOutside } from '../../lib/wormBrain.js';
import { createCrewmate } from '../../lib/crewmate.js';
import { frameLoop } from '../../lib/loop.js';
import { isNapping } from '../../lib/nap.js';
import { cssVar, fitCanvas } from '../../lib/canvas.js';
import { prefersReducedMotion } from '../../lib/env.js';
import { TAU } from '../../lib/math.js';
import { site } from '../../config/site.js';

const NAP_SETTLE_MS = 2500; // thời gian sâu "đi ngủ" sau khi screensaver bật, trước khi dừng hẳn vòng vẽ

// Con "sâu chữ" của riêng trang này, tính cách giống chủ nhân: HƯỚNG NỘI.
//  - đầu là con trỏ khối của terminal (có mắt, biết chớp, nhìn theo chuột), thân là chữ "zune.dev"
//  - rê chuột chậm: nó bò theo; LAO chuột thật nhanh VỀ PHÍA nó: nó giật mình ("!!") nhảy ra xa rồi nghỉ một lúc mới dám lại gần
//  - để chuột đứng yên một lúc: nó mon men lại gần và chào nhỏ ("hi."); đứng yên quá lâu (~6s) thì nó chán, tự đi chỗ khác
//  - chuột rời hero (hoặc trên cảm ứng) hoặc nó chán: nó TỰ ĐI DẠO khắp hero, dừng nghỉ, liếc quanh, thỉnh thoảng lẩm bẩm
//  - phản ứng theo "pin xã hội" ở thẻ zune.sav (lib/social.js): bấm `say hi` thì nó chào theo,
//    pin yếu thì uể oải, hết pin thì ngủ gật "zzz", mở khoá 100% personality thì nó hoá cầu vồng
//  - bấm vào chỗ trống ở hero: nó "nuốt" thêm một chữ (đuôi dài ra, tối đa MAX_N đốt)
//  - KHÔNG chui ra sau thẻ zune.sav (thẻ nằm trên canvas, chui vào là mất hình): đi vòng quanh thẻ; chuột nằm trong thẻ thì
//    sâu ngồi ở mép thẻ gần nhất nhìn vào. Bóng thoại và "zzz" tự đổi sang phía không bị thẻ che.
//  - thẻ zune.sav VÀ hai nút (view projects, contact) đều là vật cản: cả đầu lẫn thân sâu không bao giờ nằm sau chúng
//    (thân bị đẩy ra khỏi vật cản); chuột nằm trong thẻ/nút lâu quá thì sâu nói "no entry." rồi bỏ đi dạo
//  - nhân vật Among Us trên nút contact (lib/crewmate.js) chui ra khi sâu lại gần, đi quanh, hù hoặc chơi đuổi bắt với sâu
// Nằm sau nội dung (z-0), dừng khi cuộn khỏi màn hình, tắt khi người dùng bật "giảm chuyển động".
//
// Phần "suy nghĩ" (theo dõi chuột, chọn đích, giật mình, đi dạo) nằm ở lib/wormBrain.js (chạy thử được bằng node);
// file này chỉ lo sự kiện, chuỗi đốt thân và vẽ.
//
// Theo dõi chuột: nghe ở cấp window và tự kiểm tra "chuột có đang nằm trong hero không" mỗi khung hình,
// thay vì dựa vào pointermove/pointerleave của riêng hero. Cách cũ dễ hỏng khi kéo chuột (chọn chữ, kéo-thả
// chữ đang tự gõ): trình duyệt bắn pointercancel / dragover thay cho pointermove nên sâu đứng khựng hoặc bỏ chạy.
const WORD = `${site.handle} `;
const START_N = 10; // 1 đầu + 9 chữ (có 1 khoảng trống ngay sau đầu)
const MAX_N = 28;
const GAP = 28;
const MONO = '"JetBrains Mono", monospace';
// chuỗi font của từng đốt thân, tính một lần (trước đây dựng lại chuỗi cho mỗi chữ ở mỗi khung hình)
const BODY_FONTS = Array.from({ length: MAX_N }, (_, i) => `700 ${Math.max(12, 22 - i * 0.6)}px ${MONO}`);
const FONT_BUBBLE = `600 13px ${MONO}`;
// bấm vào những thứ này thì KHÔNG tính là "bấm chỗ trống"
const INTERACTIVE = 'a,button,input,textarea,select,label,aside,h1,p,[role="button"]';

// bo góc không phụ thuộc ctx.roundRect (trình duyệt cũ chưa có)
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// crewmate Among Us: thân đỏ có ba lô, kính xanh, hai chân bước; nhảy lên khi hù / hoảng
function drawCrew(ctx, c, t) {
  const bob = c.walking ? Math.sin(t / 70) * 1.4 : Math.sin(t / 520) * 0.6;
  const leg = c.walking ? Math.sin(t / 70) * 3.5 : 0;
  const lift = c.hop * 12;
  ctx.save();
  ctx.translate(c.x, c.y - lift);
  ctx.globalAlpha = 0.28; // bóng dưới chân (nhỏ dần khi nhảy cao)
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 17 + lift, 11 - c.hop * 3, 3, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.scale(c.dir, 1); // dir = 1: quay mặt sang phải (kính ở bên phải)
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#212121';
  ctx.fillStyle = '#b71c1c'; // chân
  rr(ctx, -9, 8 + bob, 7, 9 + leg, 3);
  ctx.fill();
  ctx.stroke();
  rr(ctx, 2, 8 + bob, 7, 9 - leg, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c62828'; // ba lô
  rr(ctx, -16, -5 + bob, 7, 15, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e53935'; // thân
  rr(ctx, -11, -17 + bob, 22, 28, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#81d4fa'; // kính
  rr(ctx, 0, -12 + bob, 13, 9, 4.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e1f5fe'; // ánh sáng trên kính
  rr(ctx, 5, -10.5 + bob, 6, 2.6, 1.3);
  ctx.fill();
  ctx.restore();
}

export default function HeroWorm() {
  const cvs = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const canvas = cvs.current;
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    let lastT = 0;
    let amber = '#ffc857';
    let ink = '#dce1e8';
    let bg = '#0a0c10';
    let bubble = { text: '', until: 0 };
    let phase = 0; // pha của sóng uốn lượn dọc thân
    let blink = { next: 1500, until: 0 };
    const eye = { x: 0, y: 0 }; // độ lệch mắt (nhìn theo hướng đang quan tâm)
    const soc0 = getSocial();
    let seenHi = soc0.hiAt;
    let seenMax = soc0.maxAt;
    let wasAsleep = isAsleep(soc0);
    let brain = null;
    let placed = false;
    const crew = createCrewmate();
    const contactEl = host.querySelector('.btn-contact');
    const obstacleEls = [...host.querySelectorAll('aside, .btn-31, .btn-contact')]; // đứng yên suốt đời hero: chỉ đọc lại toạ độ mỗi khung
    let away = false;
    const tracker = createPointerTracker();

    // màu đọc lại MỖI KHUNG trong lúc đổi theme (lib/themeSync.js), không bị kẹt màu cũ
    const readColors = () => {
      const cs = getComputedStyle(host);
      amber = cssVar(cs, '--amber', amber);
      ink = cssVar(cs, '--text', ink);
      bg = cssVar(cs, '--bg', bg);
    };
    readColors();
    const offTheme = onThemeChange(readColors);

    const resize = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      fitCanvas(canvas, ctx, w, h);
      if (brain) brain.resize(w, h);
    };
    resize();
    brain = createBrain({ w, h, x: w * 0.8, y: h * 0.5 });
    const nodes = Array.from({ length: START_N }, (_, i) => ({ x: w * 0.8 + i * GAP, y: h * 0.5 }));
    const pos = nodes.map((n) => ({ x: n.x, y: n.y })); // vị trí để VẼ (đã cộng sóng uốn lượn), nodes giữ vị trí vật lý

    const onMove = (e) => (e.pointerType === 'touch' ? tracker.leave() : tracker.move(e.clientX, e.clientY, performance.now()));
    // đang kéo-thả gốc của trình duyệt (vd kéo đoạn chữ đã chọn): không còn pointermove, chỉ có dragover
    const onDragOver = (e) => tracker.move(e.clientX, e.clientY, performance.now());
    const clearMouse = () => tracker.leave();
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('dragover', onDragOver);
    document.documentElement.addEventListener('mouseleave', clearMouse); // chuột rời cửa sổ trình duyệt
    window.addEventListener('blur', clearMouse);

    // bấm chỗ trống trong hero: nuốt thêm một chữ
    const onClick = (e) => {
      if (e.target.closest(INTERACTIVE) || window.getSelection()?.toString()) return; // trúng nút/chữ, hoặc là cú thả sau khi kéo chọn
      const now = performance.now();
      if (nodes.length >= MAX_N) {
        bubble = { text: 'full.', until: now + 1200 };
        return;
      }
      const tail = nodes[nodes.length - 1];
      nodes.push({ x: tail.x, y: tail.y });
      pos.push({ x: tail.x, y: tail.y });
      bubble = { text: 'nom.', until: now + 1200 };
    };
    host.addEventListener('click', onClick);

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const tick = (t) => {
      const dt = lastT ? Math.min(50, t - lastT) : 16.667;
      lastT = t;
      const k = dt / 16.667;

      // --- chuột (chỉ tính khi đang nằm trong hero; toạ độ tính lại mỗi khung -> đúng cả khi trang đang cuộn)
      const hostRect = host.getBoundingClientRect();
      const { pointer, idle } = tracker.read(t, hostRect);

      // --- vật cản (toạ độ theo hero): thẻ zune.sav và hai nút đều nằm TRÊN canvas, sâu chui ra sau là bị che mất hình.
      // Nút contact tách riêng (contactRect): với sâu nó vẫn là vật cản, còn crewmate thì sống trong đó.
      const obstacles = [];
      const crewObs = [];
      let contactRect = null;
      obstacleEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width <= 4 || r.height <= 4) return;
        const o = { l: r.left - hostRect.left, t: r.top - hostRect.top, r: r.right - hostRect.left, b: r.bottom - hostRect.top };
        if (!el.matches('aside')) o.pad = 16; // nút nhỏ: chừa ít hơn thẻ
        obstacles.push(o);
        if (el.matches('.btn-contact')) contactRect = o;
        else crewObs.push(o);
      });
      if (!placed) {
        // lần đầu: nếu chỗ xuất phát nằm sau thẻ thì đặt đầu ra chỗ trống gần nhất, thân xếp thành hàng ra phía xa thẻ (chưa vẽ gì nên không thấy nhảy)
        placed = true;
        const x0 = brain.state.x;
        const y0 = brain.state.y;
        const f = brain.placeOutside(obstacles);
        if (f.x !== x0 || f.y !== y0) {
          const dir = obstacles.length && f.x > (obstacles[0].l + obstacles[0].r) / 2 ? 1 : -1;
          nodes.forEach((n, i) => {
            n.x = f.x + dir * i * GAP;
            n.y = f.y;
            pos[i].x = n.x;
            pos[i].y = n.y;
          });
        }
      }

      // --- pin xã hội
      const soc = getSocial();
      const maxed = soc.maxed;
      const asleep = isAsleep(soc) || (isNapping() && !maxed); // screensaver bật thì sâu cũng ngủ (nằm yên, nhắm mắt, zzz)
      const sleepy = !asleep && !maxed && levelOf(soc) <= 20;
      if (soc.hiAt !== seenHi) {
        seenHi = soc.hiAt;
        if (!asleep) bubble = { text: maxed ? 'HI!!!' : 'hi!', until: t + 1600 };
      }
      if (soc.maxAt !== seenMax) {
        seenMax = soc.maxAt;
        bubble = { text: '!!!', until: t + 2200 };
      }
      if (wasAsleep && !asleep) bubble = { text: 'huh? oh. hi.', until: t + 2200 };
      wasAsleep = asleep;

      // --- bộ não quyết định đầu đi đâu; mỗi đốt thân kéo đốt sau theo
      // crewmate (trên nút contact) chạy trước: nó có thể doạ sâu, làm sâu nói, hoặc dụ sâu đuổi theo
      const w0 = brain.state;
      const cr = crew.update(t, dt, {
        w,
        h,
        obstacles: crewObs,
        button: contactRect,
        worm: { x: w0.x, y: w0.y, speed: w0.speed, scared: w0.mode === 'scared', asleep, moving: w0.speed > 0.8 },
      });
      if (cr.away !== away && contactEl) {
        away = cr.away;
        if (away) contactEl.setAttribute('data-away', '1');
        else contactEl.removeAttribute('data-away'); // crewmate về nút: hình trên nút hiện lại
      }
      if (cr.pokeWorm && !asleep && !maxed) {
        const sc = brain.startle(t, cr.pokeWorm);
        bubble = { text: sc.text, until: t + sc.ms };
      }
      if (cr.wormSay && !asleep && t >= bubble.until) bubble = { text: cr.wormSay.text, until: t + cr.wormSay.ms };
      // chuột thật được ưu tiên; không có chuột (hoặc chuột đứng yên quá lâu) mà crewmate đang chơi đuổi bắt thì sâu đuổi theo nó
      const chase = cr.wormFollow && (!pointer || idle > 5500) ? { x: cr.wormFollow.x, y: cr.wormFollow.y, vx: 0, vy: 0 } : null;
      const out = brain.update(t, dt, { pointer: chase || pointer, idle: chase ? 0 : idle, asleep, maxed, sleepy, obstacles });
      if (out.say && (t >= bubble.until || out.say.text === '!!')) bubble = { text: out.say.text, until: t + out.say.ms };
      const hs = brain.state;
      const head = nodes[0];
      head.x = hs.x;
      head.y = hs.y;
      for (let i = 1; i < nodes.length; i++) {
        const p = nodes[i - 1];
        const n = nodes[i];
        const ex = n.x - p.x;
        const ey = n.y - p.y;
        const dist = Math.hypot(ex, ey) || 1;
        n.x = p.x + (ex / dist) * GAP;
        n.y = p.y + (ey / dist) * GAP;
        // thân không được nằm sau thẻ/nút: đẩy ra mép gần nhất (thân vắt qua góc thẻ thay vì chui xuống dưới)
        const q = pushOutside(n.x, n.y, obstacles, 4);
        n.x = q.x;
        n.y = q.y;
      }

      // --- sóng uốn lượn: thân ngoe nguẩy, bò nhanh thì uốn mạnh, đứng nghỉ vẫn đung đưa nhẹ như đang thở
      const len = nodes.length;
      phase += (0.05 + hs.speed * 0.02) * k;
      const amp = asleep ? 0.6 : 1.3 + Math.min(1, hs.speed / 8) * 4.7 + (out.scared ? 2 : 0);
      pos[0].x = head.x;
      pos[0].y = head.y;
      for (let i = 1; i < len; i++) {
        const a = nodes[i - 1];
        const b = nodes[Math.min(len - 1, i + 1)];
        const tx = a.x - b.x;
        const ty = a.y - b.y;
        const tl = Math.hypot(tx, ty) || 1;
        const off = Math.sin(phase - i * 0.62) * amp * Math.min(1, i / 4); // gần đầu thì uốn ít
        pos[i].x = nodes[i].x + (-ty / tl) * off;
        pos[i].y = nodes[i].y + (tx / tl) * off;
        const q = pushOutside(pos[i].x, pos[i].y, obstacles, 2); // sóng uốn lượn cũng không được đẩy chữ xuống sau thẻ
        pos[i].x = q.x;
        pos[i].y = q.y;
      }

      // --- vẽ
      const hue = (t / 8) % 360;
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = len - 1; i >= 1; i--) {
        const n = pos[i];
        const p = pos[i - 1];
        let ang = Math.atan2(p.y - n.y, p.x - n.x);
        if (Math.abs(ang) > Math.PI / 2) ang += Math.PI; // chữ luôn đứng thẳng, không bị lộn ngược
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(ang);
        ctx.globalAlpha = 0.9 - (i / len) * 0.55;
        ctx.fillStyle = maxed ? `hsl(${(hue + i * 28) % 360} 85% 62%)` : ink;
        ctx.font = BODY_FONTS[i];
        ctx.fillText(WORD[WORD.length - 1 - ((i - 1) % WORD.length)], 0, 0); // chữ neo theo đầu: đuôi dài ra thì lặp lại "zune.dev "
        ctx.restore();
      }

      // đầu = con trỏ khối: sáng liên tục khi đang bò, nháy khi đứng yên; thở nhẹ; ngủ thì gật gù; nghỉ thì nghiêng đầu
      const resting = !asleep && !out.moving && !out.scared;
      const headAng = hs.heading + (resting ? Math.sin(t / 900) * 0.14 : 0);
      const nod = asleep ? Math.sin(t / 700) * 1.6 : 0;
      const breathe = asleep ? 1 + Math.sin(t / 1100) * 0.06 : 1 + Math.sin(t / 650) * 0.035;
      const scale = out.scared ? 1.18 : maxed ? 1.08 + Math.sin(t / 120) * 0.05 : breathe;
      ctx.save();
      ctx.translate(head.x, head.y + nod);
      ctx.rotate(headAng);
      ctx.scale(scale, scale);
      ctx.globalAlpha = asleep ? 0.6 : out.moving || Math.floor(t / 530) % 2 === 0 ? 0.95 : 0.55;
      ctx.fillStyle = maxed ? `hsl(${hue} 90% 60%)` : amber;
      ctx.fillRect(-7, -13, 14, 26);

      // hai mắt (ở phía trước đầu): nhìn theo chuột / đích đang đi tới / liếc quanh khi nghỉ,
      // chớp mỗi ~2-5s (đôi khi chớp đúp), mở to khi giật mình / mở khoá, nhắm khi ngủ
      if (t >= blink.next) {
        blink = { until: t + 120, next: t + (Math.random() < 0.2 ? 260 : 1800 + Math.random() * 3600) };
      }
      const la = Math.atan2(out.look.y, out.look.x) - headAng; // hướng nhìn, tính trong hệ toạ độ của đầu
      const wantX = asleep ? 0 : Math.cos(la) * 1.3;
      const wantY = asleep ? 0 : Math.sin(la) * 1.8;
      eye.x += (wantX - eye.x) * Math.min(1, 0.2 * k);
      eye.y += (wantY - eye.y) * Math.min(1, 0.2 * k);
      const eyeH = asleep ? 1 : out.scared || maxed ? 6 : t < blink.until ? 1 : 3;
      ctx.globalAlpha = 1;
      ctx.fillStyle = bg;
      ctx.fillRect(2 + eye.x, -7 + eye.y, 3, eyeH);
      ctx.fillRect(2 + eye.x, 4 - (eyeH - 3) + eye.y, 3, eyeH);
      ctx.restore();

      // crewmate (vẽ sau thân sâu, trước bóng thoại)
      if (cr.visible) {
        drawCrew(ctx, crew.state, t);
        const sy = crew.state.say;
        if (sy?.text) {
          ctx.font = FONT_BUBBLE;
          ctx.globalAlpha = Math.min(1, (sy.until - t) / 350);
          ctx.fillStyle = amber;
          ctx.textAlign = 'center';
          ctx.fillText(sy.text, crew.state.x, crew.state.y - 34 - crew.state.hop * 12);
          ctx.globalAlpha = 1;
        }
      }

      // bóng thoại / "zzz" nằm lệch lên trên-phải đầu; nếu chỗ đó bị thẻ che thì lật sang trái
      const covered = (bw) =>
        obstacles.some((o) => head.x + 8 < o.r && head.x + 20 + bw > o.l && head.y - 50 < o.b && head.y > o.t);
      if (asleep) {
        const side = covered(50) ? -1 : 1;
        ctx.fillStyle = amber;
        ctx.textAlign = side > 0 ? 'left' : 'right';
        for (let k2 = 0; k2 < 3; k2++) {
          const ph = (t / 1500 + k2 / 3) % 1; // 3 chữ z bay lên lệch pha nhau
          ctx.globalAlpha = (1 - ph) * 0.9;
          ctx.font = `700 ${11 + k2 * 3}px ${MONO}`;
          ctx.fillText('z', head.x + side * (14 + ph * 12 + k2 * 6), head.y - 16 - ph * 28 - k2 * 6);
        }
        ctx.textAlign = 'center';
      } else if (t < bubble.until) {
        ctx.font = FONT_BUBBLE;
        const side = covered(ctx.measureText(bubble.text).width) ? -1 : 1;
        ctx.globalAlpha = Math.min(1, (bubble.until - t) / 400);
        ctx.fillStyle = amber;
        ctx.textAlign = side > 0 ? 'left' : 'right';
        ctx.fillText(bubble.text, head.x + side * 20, head.y - 24);
        ctx.textAlign = 'center';
      }
      ctx.globalAlpha = 1;
    };
    // dậy / hero hiện lại: lastT = 0 để khung đầu không bị tính một bước thời gian khổng lồ.
    // nap bắt đầu: chạy thêm NAP_SETTLE_MS để sâu bò ra khỏi chỗ khuất / nằm xuống / nhắm mắt, rồi huỷ hẳn rAF (đứng hình ở tư thế ngủ).
    const loop = frameLoop(tick, { watch: host, napGraceMs: NAP_SETTLE_MS, onResume: () => (lastT = 0) });

    return () => {
      loop.stop();
      ro.disconnect();
      offTheme();
      contactEl?.removeAttribute('data-away');
      host.removeEventListener('click', onClick);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('dragover', onDragOver);
      document.documentElement.removeEventListener('mouseleave', clearMouse);
      window.removeEventListener('blur', clearMouse);
    };
  }, []);

  return <canvas ref={cvs} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
}
