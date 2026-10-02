// Phần giao diện dùng chung của các mini game (Snake, BugSquash, MemoryMatch):
// khung ngoài, thanh chỉ số + nút chính, và lớp phủ giữa bàn chơi.

export const GAME_BTN = 'lab-cell px-3.5 py-1.5 rounded-md border border-line hover:border-amber text-ink';

// stats: [{ label, value, color? }]  — color là biến CSS, vd 'var(--green)'
export function GameFrame({ stats, action, children }) {
  return (
    <div className="bg-inset border border-line rounded-[10px] p-[26px]">
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[13px] mb-5">
        <div className="flex gap-5">
          {stats.map((s) => (
            <span key={s.label}>
              <span className="text-dim">{s.label} </span>
              <span style={s.color ? { color: s.color } : undefined}>{s.value}</span>
            </span>
          ))}
        </div>
        <button type="button" onClick={action.onClick} className={GAME_BTN}>
          {action.label}
        </button>
      </div>
      {children}
    </div>
  );
}

// lớp mờ phủ lên bàn chơi (màn mở đầu / kết thúc). Cha cần `relative`.
export function GameOverlay({ children }) {
  return (
    <div
      className="absolute inset-0 rounded-lg flex flex-col items-center justify-center text-center gap-2 font-mono text-[13px] px-4"
      style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)' }}
    >
      {children}
    </div>
  );
}
