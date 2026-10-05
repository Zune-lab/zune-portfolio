import { useEffect, useRef, useState } from 'react';
import useBest from '../../../lib/useBest.js';
import { storageKey } from '../../../config/site.js';
import { onThemeChange } from '../../../lib/themeSync.js';
import { cssVar } from '../../../lib/canvas.js';
import { getDpr } from '../../../lib/env.js';
import { pick, TAU } from '../../../lib/math.js';
import { gameAction, GameFrame, GameOverlay } from './GameShell.jsx';

const N = 18; // lưới N x N
const CELL = 20;
const SIZE = N * CELL;
const BEST_KEY = storageKey('snake-best');
const DPR = getDpr(); // canvas theo mật độ điểm ảnh, không thì mờ trên màn retina

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYS = {
  arrowup: 'up', w: 'up',
  arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
};

const placeFood = (snake) => {
  const free = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  return free.length ? pick(free) : null;
};

const fresh = () => {
  const snake = [{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }];
  return { snake, dir: 'right', queue: [], food: placeFood(snake) };
};

// mini game: rắn săn mồi. Phím mũi tên / WASD, nút bấm hoặc vuốt trên màn hình cảm ứng
export default function Snake() {
  const [status, setStatus] = useState('idle'); // idle | playing | over
  const [score, setScore] = useState(0);
  const { best, newBest, record, clearNew } = useBest(BEST_KEY);
  const [round, setRound] = useState(0);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const game = useRef(null);
  if (game.current === null) game.current = fresh();
  const scoreRef = useRef(0);
  const swipe = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;
    // đọc màu từ token theme mỗi lần vẽ -> đổi sáng/tối là ăn theo
    const css = getComputedStyle(document.documentElement);
    const v = (name, fallback) => cssVar(css, name, fallback);
    const g = game.current;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // toạ độ vẽ vẫn tính theo SIZE x SIZE
    ctx.fillStyle = v('--panel', '#10141b');
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = v('--line', '#1d232c');
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    if (g.food) {
      ctx.fillStyle = v('--amber', '#ffc857');
      ctx.beginPath();
      ctx.arc(g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2, CELL / 2 - 3, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = v('--green', '#7ee081');
    g.snake.forEach((s, i) => {
      ctx.globalAlpha = i === 0 ? 1 : 0.8;
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.globalAlpha = 1;
  };

  const turn = (name) => {
    const g = game.current;
    const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
    if (name === last || name === OPPOSITE[last] || g.queue.length >= 2) return;
    g.queue.push(name);
  };

  // đi 1 bước; trả về false khi chết (đụng tường, đụng thân) hoặc đã ăn kín bàn
  const tick = () => {
    const g = game.current;
    if (g.queue.length) g.dir = g.queue.shift();
    const d = DIRS[g.dir];
    const head = g.snake[0];
    const nx = head.x + d.x;
    const ny = head.y + d.y;
    const eating = g.food && nx === g.food.x && ny === g.food.y;
    const body = eating ? g.snake : g.snake.slice(0, -1); // đuôi sẽ rời đi nên không tính
    if (nx < 0 || ny < 0 || nx >= N || ny >= N || body.some((s) => s.x === nx && s.y === ny)) {
      return false;
    }
    g.snake.unshift({ x: nx, y: ny });
    if (!eating) {
      g.snake.pop();
      return true;
    }
    scoreRef.current += 1;
    setScore(scoreRef.current);
    g.food = placeFood(g.snake);
    if (g.food === null) g.won = true; // ăn kín bàn: thắng, không phải chết
    return g.food !== null;
  };

  const start = () => {
    game.current = fresh();
    scoreRef.current = 0;
    setScore(0);
    clearNew();
    setStatus('playing');
    setRound((r) => r + 1);
    wrapRef.current?.focus({ preventScroll: true });
  };

  // vòng đời một ván: chạy bằng setTimeout để tăng tốc dần; dọn timer khi hết ván hoặc rời trang
  useEffect(() => {
    draw();
    if (status !== 'playing') return;
    let timer;
    const delay = () => Math.max(60, 140 - scoreRef.current * 3);
    const step = () => {
      const alive = tick();
      draw();
      if (!alive) {
        setStatus('over');
        return;
      }
      timer = window.setTimeout(step, delay());
    };
    timer = window.setTimeout(step, 140);
    // chuyển tab thì tạm dừng, quay lại chạy tiếp (không để rắn tự chết khi không ai nhìn)
    const onVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) timer = window.setTimeout(step, delay());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [status, round]);

  // đổi sáng/tối -> vẽ lại canvas MỖI KHUNG trong lúc biến màu đang chuyển (lib/themeSync.js), dù game idle hay đã over.
  // Trước đây chỉ vẽ 1 lần lúc data-theme vừa đổi, khi biến màu còn giá trị cũ -> canvas kẹt màu cũ.
  useEffect(() => onThemeChange(() => draw()), []);

  // hết ván -> cập nhật kỷ lục
  useEffect(() => {
    if (status === 'over') record(scoreRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when the game ends; best is current then
  }, [status]);

  const onKeyDown = (e) => {
    const name = KEYS[e.key.toLowerCase()];
    if (!name || status !== 'playing') return;
    e.preventDefault(); // không cho phím mũi tên cuộn trang khi đang chơi
    turn(name);
  };

  const onPointerDown = (e) => {
    swipe.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId); // nhả tay ngoài canvas vẫn nhận pointerup
  };
  const onPointerUp = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || status !== 'playing') return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };

  const pad = (name, label, cls) => (
    <button
      type="button"
      onPointerDown={() => status === 'playing' && turn(name)}
      onClick={(e) => e.detail === 0 && status === 'playing' && turn(name)} // bàn phím (Enter/Space)
      aria-label={`turn ${name}`}
      className={`lab-cell w-11 h-11 rounded-md border border-line hover:border-amber text-ink font-mono touch-manipulation ${cls}`}
    >
      {label}
    </button>
  );

  return (
    <GameFrame
      stats={[
        { label: 'score', value: score, color: 'var(--green)' },
        { label: 'best', value: best },
      ]}
      action={gameAction(status, start)}
    >
      <div
        ref={wrapRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="snake game, use arrow keys or WASD"
        className="relative mx-auto max-w-[360px] outline-hidden focus-visible:ring-1 focus-visible:ring-[color:var(--amber)] rounded-sm-lg"
      >
        <canvas
          ref={canvasRef}
          width={SIZE * DPR}
          height={SIZE * DPR}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
          className="block w-full h-auto rounded-lg border border-line"
          style={{ touchAction: 'none' }}
        />

        {status !== 'playing' && (
          <GameOverlay>
            {status === 'idle' ? (
              <>
                <p className="text-ink">eat the dots, don't eat yourself.</p>
                <p className="text-dim">arrow keys / WASD, or swipe.</p>
              </>
            ) : (
              <>
                <p className="text-ink">
                  {game.current.won ? 'board cleared: ' : 'segfault: '}
                  <span style={{ color: 'var(--green)' }}>{score}</span> eaten
                </p>
                <p className="text-dim">{newBest ? 'new best!' : 'one more try?'}</p>
              </>
            )}
          </GameOverlay>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5 w-fit mx-auto sm:hidden">
        {pad('up', '↑', 'col-start-2')}
        {pad('left', '←', 'col-start-1 row-start-2')}
        {pad('down', '↓', 'col-start-2 row-start-2')}
        {pad('right', '→', 'col-start-3 row-start-2')}
      </div>
    </GameFrame>
  );
}
