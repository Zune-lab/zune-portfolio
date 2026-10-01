import { useCallback, useEffect, useRef, useState } from 'react';

const CELLS = 9;
const DURATION = 30; // giây
const BEST_KEY = 'zune-bugsquash-best';

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};
const saveBest = (n) => {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* bỏ qua nếu không ghi được */
  }
};

// mini game: bug nhô lên ở ô ngẫu nhiên, bấm trúng để diệt, càng về sau càng nhanh
export default function BugSquash() {
  const [status, setStatus] = useState('idle'); // idle | playing | over
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [active, setActive] = useState(-1);
  const [best, setBest] = useState(readBest);
  const [round, setRound] = useState(0); // tăng mỗi lần bấm start/restart để effect của ván chạy lại từ đầu
  const [newBest, setNewBest] = useState(false);

  const timeRef = useRef(DURATION);
  const activeRef = useRef(-1);
  const spawnTimer = useRef(0);

  const spawn = useCallback(() => {
    const elapsed = DURATION - timeRef.current;
    const life = Math.max(450, 900 - elapsed * 15); // bug sống ngắn dần
    let next;
    do {
      next = Math.floor(Math.random() * CELLS);
    } while (next === activeRef.current);
    activeRef.current = next;
    setActive(next);
    spawnTimer.current = window.setTimeout(spawn, life);
  }, []);

  const start = () => {
    timeRef.current = DURATION;
    activeRef.current = -1;
    setTimeLeft(DURATION);
    setScore(0);
    setMisses(0);
    setActive(-1);
    setNewBest(false);
    setStatus('playing');
    setRound((r) => r + 1);
  };

  // vòng đời một ván: đếm ngược + sinh bug; dọn timer khi hết ván hoặc rời trang.
  // `round` nằm trong deps để "restart" giữa ván dựng lại đồng hồ (trước đây status không đổi
  // nên effect không chạy lại: giây đầu tiên sau restart bị ngắn và timer cũ vẫn chạy tiếp).
  useEffect(() => {
    if (status !== 'playing') return;
    spawn();
    const clock = window.setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) setStatus('over');
    }, 1000);
    return () => {
      clearTimeout(spawnTimer.current);
      clearInterval(clock);
      activeRef.current = -1;
      setActive(-1);
    };
  }, [status, round, spawn]);

  // hết ván -> cập nhật kỷ lục
  useEffect(() => {
    if (status === 'over' && score > best) {
      setBest(score);
      saveBest(score);
      setNewBest(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const press = (i) => {
    if (status !== 'playing') return;
    if (i === activeRef.current) {
      setScore((s) => s + 1);
      activeRef.current = -1;
      setActive(-1);
      clearTimeout(spawnTimer.current);
      spawnTimer.current = window.setTimeout(spawn, 120); // bug kế tiếp nhô lên gần như ngay
    } else {
      setMisses((m) => m + 1);
    }
  };

  const total = score + misses;
  const accuracy = total ? Math.round((score / total) * 100) : 0;

  return (
    <div className="bg-inset border border-line rounded-[10px] p-[26px]">
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[13px] mb-5">
        <div className="flex gap-5">
          <span>
            <span className="text-dim">bugs </span>
            <span style={{ color: 'var(--green)' }}>{score}</span>
          </span>
          <span>
            <span className="text-dim">time </span>
            <span style={{ color: 'var(--amber)' }}>{timeLeft}s</span>
          </span>
          <span>
            <span className="text-dim">best </span>
            <span>{best}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={start}
          className="lab-cell px-3.5 py-1.5 rounded-md border border-line hover:border-amber text-ink"
        >
          {status === 'playing' ? 'restart' : status === 'over' ? 'play again' : 'start'}
        </button>
      </div>

      <div className="relative mx-auto max-w-[360px]">
        <div className="grid grid-cols-3 gap-3" role="group" aria-label="bug squash board">
          {Array.from({ length: CELLS }, (_, i) => (
            <button
              key={i}
              type="button"
              onPointerDown={() => press(i)}
              onKeyDown={(e) => {
                // bàn phím: Enter / Space (pointerdown không bắt được phím)
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  press(i);
                }
              }}
              aria-label={i === active ? 'bug, squash it' : 'empty cell'}
              className="lab-cell aspect-square rounded-lg border border-line flex items-center justify-center select-none touch-manipulation"
              style={{ background: 'var(--panel)' }}
            >
              {i === active && (
                <span
                  className="lab-bug font-mono font-bold text-[13px] px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--amber)', color: 'var(--bg)' }}
                >
                  bug
                </span>
              )}
            </button>
          ))}
        </div>

        {status !== 'playing' && (
          <div
            className="absolute inset-0 rounded-lg flex flex-col items-center justify-center text-center gap-2 font-mono text-[13px] px-4"
            style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)' }}
          >
            {status === 'idle' ? (
              <>
                <p className="text-ink">squash the bugs before time runs out.</p>
                <p className="text-dim">30 seconds. they get faster.</p>
              </>
            ) : (
              <>
                <p className="text-ink">
                  ship it: <span style={{ color: 'var(--green)' }}>{score}</span> bugs squashed
                </p>
                <p className="text-dim">
                  accuracy {accuracy}%{newBest ? ' · new best!' : ''}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
