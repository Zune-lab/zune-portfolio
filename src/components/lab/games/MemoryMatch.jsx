import { useEffect, useRef, useState } from 'react';
import { readBest, saveBest } from '../../../lib/storage.js';
import { shuffled } from '../../../lib/math.js';
import { GameFrame, GameOverlay } from './GameShell.jsx';

const SYMBOLS = ['{ }', '</>', '[ ]', '=>', '&&', '#!'];
const BEST_KEY = 'zune-memory-best'; // kỷ lục = số lượt ít nhất

const shuffle = () => shuffled([...SYMBOLS, ...SYMBOLS].map((sym, id) => ({ id, sym })));

// mini game: lật 2 thẻ một lượt, ghép đủ 6 cặp ký hiệu code với ít lượt nhất
export default function MemoryMatch() {
  const [deck, setDeck] = useState(shuffle);
  const [open, setOpen] = useState([]); // vị trí thẻ đang lật tạm (tối đa 2)
  const [done, setDone] = useState([]); // ký hiệu đã ghép xong
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState(() => readBest(BEST_KEY));
  const [newBest, setNewBest] = useState(false);
  const [round, setRound] = useState(0); // đổi mỗi ván để thẻ được dựng lại, không "trượt" sang vị trí mới lúc đang lật úp
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const won = done.length === SYMBOLS.length;

  const reset = () => {
    clearTimeout(timer.current);
    setDeck(shuffle());
    setRound((r) => r + 1);
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
        saveBest(BEST_KEY, m);
        setNewBest(true);
      }
    } else {
      timer.current = window.setTimeout(() => setOpen([]), 750);
    }
  };

  return (
    <GameFrame
      stats={[
        { label: 'moves', value: moves, color: 'var(--amber)' },
        { label: 'pairs', value: `${done.length}/${SYMBOLS.length}`, color: 'var(--green)' },
        { label: 'best', value: best || '-' },
      ]}
      action={{ onClick: reset, label: won ? 'play again' : 'shuffle' }}
    >
      <div className="relative mx-auto max-w-[360px]">
        <div className="grid grid-cols-4 gap-3" role="group" aria-label="memory match board">
          {deck.map((c, i) => {
            const matched = done.includes(c.sym);
            const up = matched || open.includes(i);
            return (
              <button
                key={`${round}-${c.id}`}
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
          <GameOverlay>
            <p className="text-ink">
              all merged in <span style={{ color: 'var(--green)' }}>{moves}</span> moves
            </p>
            <p className="text-dim">{newBest ? 'new best!' : 'can you do it in fewer?'}</p>
          </GameOverlay>
        )}
      </div>
    </GameFrame>
  );
}
