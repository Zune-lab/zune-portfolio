import { useEffect, useRef, useState } from 'react';
import { hasFinePointer, prefersReducedMotion } from '../../../../lib/env.js';
import { frameLoop } from '../../../../lib/loop.js';
import useBubble from '../shared/useBubble.js';
import usePetLife from '../shared/usePetLife.js';
import Zzz from '../shared/Zzz.jsx';
import './AsciiCat.css';

// Mèo vẽ bằng chữ (skin crt-amber), sống như một con mèo thật dưới đáy màn hình:
//   đi dạo đây đó, ngồi liếm chân, thỉnh thoảng cuộn tròn ngủ gật (zzz). Rê chuột lại gần đáy màn hình là nó tỉnh dậy, chạy tới
//   và VỒ con trỏ. Bấm vào thì được vuốt ve (kêu grừ). Máy cảm ứng / giảm chuyển động: ngồi yên một chỗ, vẫn vuốt ve được.
// Phản ứng với trang: lắc chuột thì giật mình xù lông rồi bỏ chạy; nhập Konami thì lên cơn "zoomies" chạy hết cỡ qua lại; copy xong thì kêu grừ;
// lâu không ai đụng tới thì cuộn tròn ngủ (zzz), có động tĩnh thì vươn vai dậy.
// Sprite quay mặt trái (đuôi bên phải); bản quay mặt phải là ảnh gương của chuỗi (đổi cặp ngoặc / dấu < >), không dùng scaleX nên chữ không bị lật.
const FRAMES = {
  walkA: ['  /\\_/\\  ', ' ( o.o ) ~', '  > ^ <  ', '  /|_|\\  '],
  walkB: ['  /\\_/\\  ', ' ( o.o )~ ', '  > ^ <  ', '  _/ \\_  '],
  sit: ['  /\\_/\\  ', ' ( o.o )  ', '  > ^ <  ', ' (_____)~ '],
  groomA: ['  /\\_/\\  ', ' ( -.- )/ ', '  > ^ <  ', ' (_____)~ '],
  groomB: ['  /\\_/\\  ', ' ( -.- )_ ', '  > ^ <  ', ' (_____)~ '],
  sleep: ['    z    ', '  /\\_/\\  ', ' ( -.- )  ', ' (_____)~ '],
  swat: ['  /\\_/\\  ', ' ( >.< )=-', '  > ^ <  ', '  /|_|\\  '],
  purr: ['  /\\_/\\  ', ' ( ^.^ )  ', '  > ^ <  ', ' (_____)~ '],
  startle: ['  /\\_/\\  ', ' ( O.O )  ', '  >^^^<   ', ' /|   |\\  '],
};
const SWAP = { '(': ')', ')': '(', '/': '\\', '\\': '/', '<': '>', '>': '<', '[': ']', ']': '[', '{': '}', '}': '{' };
const mirror = (rows) => {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => [...r.padEnd(w)].reverse().map((c) => SWAP[c] ?? c).join(''));
};
const text = (rows, face) => (face === 'r' ? mirror(rows) : rows).join('\n');
// cặp khung nhấp nháy theo từng tư thế (1 khung thì đứng yên)
const POSES = {
  walk: ['walkA', 'walkB'],
  run: ['walkA', 'walkB'],
  groom: ['groomA', 'groomB'],
  sit: ['sit'],
  sleep: ['sleep'],
  swat: ['swat'],
  purr: ['purr'],
  startle: ['startle'],
};
const PURRS = ['purr~', 'mrrp?', 'prrrr', '*slow blink*', 'meow meow'];
const CATW = 96; // bề ngang gần đúng của sprite (px)

export default function AsciiCat() {
  const root = useRef(null);
  const ctl = useRef({ pet: () => {} });
  const [pose, setPose] = useState('sit');
  const [face, setFace] = useState('l');
  const n = useRef(0);
  const { text: bubble, say } = useBubble(2200);
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  });
  usePetLife((name) => ctl.current.react?.(name));

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const maxX = () => Math.max(8, window.innerWidth - CATW - 12);
    let x = Math.min(maxX(), window.innerWidth * 0.08);
    el.style.transform = `translateX(${x.toFixed(1)}px)`;
    const calm = prefersReducedMotion();
    let mode = 'sit';
    let dir = -1; // -1: quay mặt trái, 1: phải
    let until = performance.now() + 2500;
    let target = x;
    let last = 0;
    const ptr = { x: 0, y: 0, t: -1e9 };
    const go = (m, ms) => {
      if (m !== mode) {
        mode = m;
        setPose(m);
      }
      until = performance.now() + ms;
    };
    const turn = (d) => {
      if (d !== dir) {
        dir = d;
        setFace(d < 0 ? 'l' : 'r');
      }
    };
    ctl.current.pet = () => go('purr', 4200);
    let flee = false; // vừa giật mình: xong thì bỏ chạy
    let zoom = 0; // số vòng zoomies còn lại
    ctl.current.react = (name) => {
      if (name === 'sleep') go('sleep', 1e9);
      else if (name === 'wake') {
        if (mode === 'sleep') {
          go('sit', 1500);
          sayRef.current('mrrp?', 1400);
        }
      } else if (name === 'shake') {
        flee = true;
        sayRef.current('!!', 900);
        go('startle', 650);
      } else if (name === 'konami') {
        zoom = 5;
        target = 8;
        turn(-1);
        sayRef.current('ZOOMIES', 1600);
        go('run', 1e9);
      } else if (name === 'copy') {
        go('purr', 3200);
        sayRef.current('<3', 1800);
      }
    };

    const pick = () => {
      const r = Math.random();
      if (r < 0.5) {
        target = 8 + Math.random() * (maxX() - 8);
        turn(target < x ? -1 : 1);
        go('walk', 1e9);
      } else if (r < 0.74) go('groom', 3200 + Math.random() * 2000);
      else if (r < 0.88) go('sit', 2500 + Math.random() * 2500);
      else go('sleep', 7000 + Math.random() * 4000);
    };

    const follow = hasFinePointer() && !calm;
    const move = (e) => {
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      ptr.t = performance.now();
    };
    if (follow) window.addEventListener('pointermove', move, { passive: true });

    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      // con trỏ đang lượn gần đáy màn hình: tỉnh dậy, chạy tới vồ
      if (follow && t - ptr.t < 1400 && ptr.y > window.innerHeight - 170 && mode !== 'swat' && mode !== 'purr') {
        target = Math.max(8, Math.min(maxX(), ptr.x - CATW / 2));
        if (Math.abs(target - x) > 36) {
          turn(target < x ? -1 : 1);
          if (mode !== 'run') {
            if (mode === 'sleep') sayRef.current('mrrp!', 1200);
            go('run', 1e9);
          }
        } else if (mode === 'run') {
          turn(ptr.x < x + CATW / 2 ? -1 : 1);
          go('swat', 750);
        }
      }
      if (mode === 'walk' || mode === 'run') {
        const sp = mode === 'run' ? 200 : 38;
        const d = target - x;
        if (Math.abs(d) <= sp * dt) {
          x = target;
          if (mode === 'run' && zoom > 0) {
            zoom -= 1;
            target = x < maxX() / 2 ? maxX() : 8;
            turn(target < x ? -1 : 1);
          } else if (mode === 'run') go('swat', 750);
          else go('sit', 1400);
        } else x += Math.sign(d) * sp * dt;
        el.style.transform = `translateX(${x.toFixed(1)}px)`;
      } else if (t > until) {
        if (flee) {
          flee = false;
          target = x < maxX() / 2 ? maxX() : 8;
          turn(target < x ? -1 : 1);
          go('run', 1e9);
        } else pick();
      }
    };
    const loop = calm ? null : frameLoop(frame, { onResume: () => (last = 0) });
    const onResize = () => {
      x = Math.min(x, maxX());
      target = Math.min(target, maxX());
      el.style.transform = `translateX(${x.toFixed(1)}px)`;
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      loop?.stop();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const frames = POSES[pose];
  const fast = pose === 'run';
  return (
    <div ref={root} className={`acat is-${pose} ${fast ? 'is-fast' : ''}`}>
      <button
        type="button"
        className="acat-hit"
        aria-label="pet the ascii cat"
        title="pet the cat"
        onClick={() => {
          ctl.current.pet();
          say(PURRS[n.current++ % PURRS.length]);
        }}>
        {frames.map((f, i) => (
          <pre key={`${pose}-${face}-${f}`} className={i ? 'acat-f2' : 'acat-f1'}>
            {text(FRAMES[f], face)}
          </pre>
        ))}
      </button>
      <Zzz show={pose === 'sleep'} />
      {bubble && <div className="cameo-bubble acat-bubble">{bubble}</div>}
    </div>
  );
}
