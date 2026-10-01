import { useEffect, useRef, useState } from 'react';

const SYMBOLS = ['{ }', '</>', '[ ]', '=>', '&&', '#!'];
const BEST_KEY = 'zune-memory-best'; // kỷ lục = số lượt ít nhất

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

const shuffle = () => {
  const deck = [...SYMBOLS, ...SYMBOLS].map((sym, id) => ({ id, sym }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// mini game: lật 2 thẻ một lượt, ghép đủ 6 cặp ký hiệu code với ít lượt nhất
export default function MemoryMatch() {
  const [deck, setDeck] = useState(shuffle);
  const [open, setOpen] = useState([]); // vị trí thẻ đang lật tạm (tối đa 2)
  const [done, setDone] = useState([]); // ký hiệu đã ghép xong
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState(readBest);
  const [newBest, setNewBest] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const won = done.length === SYMBOLS.length;

  const reset = () => {
    clearTimeout(timer.current);
    setDeck(shuffle());
    setOpen([]);
    setDone([]);
    setMoves(0);
    setNewBest(false);
  };

  const flip = (i) => {
    if (open.length >= 2 || open.includes(i) || done.includes(deck[i].sym)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;

    const m = moves + 1;
    setMoves(m);
    const [a, b] = next;
    if (deck[a].sym === deck[b].sym) {
      const nd = [...done, deck[a].sym];
      setDone(nd);
      setOpen([]);
      if (nd.length === SYMBOLS.length && (!best || m < best)) {
        setBest(m);
        saveBest(m);
        setNewBest(true);
      }
    } else {
      timer.current = window.setTimeout(() => setOpen([]), 750);
    }
  };

  return (
    <div className="bg-inset border border-line rounded-[10px] p-[26px]">
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[13px] mb-5">
        <div className="flex gap-5">
          <span>
            <span className="text-dim">moves </span>
            <span style={{ color: 'var(--amber)' }}>{moves}</span>
          </span>
          <span>
            <span className="text-dim">pairs </span>
            <span style={{ color: 'var(--green)' }}>
              {done.length}/{SYMBOLS.length}
            </span>
          </span>
          <span>
            <span className="text-dim">best </span>
            <span>{best || '-'}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="lab-cell px-3.5 py-1.5 rounded-md border border-line hover:border-amber text-ink"
        >
          {won ? 'play again' : 'shuffle'}
        </button>
      </div>

      <div className="relative mx-auto max-w-[360px]">
        <div className="grid grid-cols-4 gap-3" role="group" aria-label="memory match board">
          {deck.map((c, i) => {
            const matched = done.includes(c.sym);
            const up = matched || open.includes(i);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => flip(i)}
                aria-label={up ? `card ${c.sym}` : 'face-down card'}
                className={`lab-flip aspect-square select-none touch-manipulation${up ? ' is-up' : ''}`}
              >
                <span className="lab-flip-inner">
                  <span
                    className="lab-flip-face border border-line font-mono text-[15px]"
                    style={{ background: 'var(--panel)', color: 'var(--text-dim)' }}
                  >
                    ?
                  </span>
                  <span
                    className="lab-flip-face lab-flip-back border font-mono font-bold text-[16px]"
                    style={{
                      background: 'var(--panel)',
                      borderColor: matched ? 'var(--green)' : 'var(--amber)',
                      color: matched ? 'var(--green)' : 'var(--amber)',
                    }}
                  >
                    {c.sym}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {won && (
          <div
            className="absolute inset-0 rounded-lg flex flex-col items-center justify-center text-center gap-2 font-mono text-[13px] px-4"
            style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)' }}
          >
            <p className="text-ink">
              all merged in <span style={{ color: 'var(--green)' }}>{moves}</span> moves
            </p>
            <p className="text-dim">{newBest ? 'new best!' : 'can you do it in fewer?'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
