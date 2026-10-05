import { useCallback, useEffect, useRef, useState } from 'react';
import useBest from '../../../lib/useBest.js';
import { randInt } from '../../../lib/math.js';
import { gameAction, GameFrame, GameOverlay } from './GameShell.jsx';

const CELLS = 9;
const DURATION = 30; // giây
const BEST_KEY = 'zune-bugsquash-best';

// mini game: bug nhô lên ở ô ngẫu nhiên, bấm trúng để diệt, càng về sau càng nhanh
export default function BugSquash() {
  const [status, setStatus] = useState('idle'); // idle | playing | over
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [active, setActive] = useState(-1);
  const { best, newBest, record, clearNew } = useBest(BEST_KEY);
  const [round, setRound] = useState(0); // tăng mỗi lần bấm start/restart để effect của ván chạy lại từ đầu

  const timeRef = useRef(DURATION);
  const activeRef = useRef(-1);
  const spawnTimer = useRef(0);

  const spawn = useCallback(() => {
    const elapsed = DURATION - timeRef.current;
    const life = Math.max(450, 900 - elapsed * 15); // bug sống ngắn dần
    let next;
    do {
      next = randInt(0, CELLS - 1);
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
    clearNew();
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
    if (status === 'over') record(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when the round ends; score/best are current then
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
    <GameFrame
      stats={[
        { label: 'bugs', value: score, color: 'var(--green)' },
        { label: 'time', value: `${timeLeft}s`, color: 'var(--amber)' },
        { label: 'best', value: best },
      ]}
      action={gameAction(status, start)}
    >
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
          <GameOverlay>
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
          </GameOverlay>
        )}
      </div>
    </GameFrame>
  );
}
