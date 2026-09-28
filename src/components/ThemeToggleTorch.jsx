import './ThemeToggleTorch.css';

const faceDivs = Array.from({ length: 4 });
const sideDivs = Array.from({ length: 16 });

export default function ThemeToggleTorch({ theme, onToggle }) {
  const isLight = theme === 'light';

  return (
    <label className="torch-container relative flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={!isLight}
        onChange={onToggle}
        aria-label={isLight ? 'light mode' : 'dark mode'}
      />
      <span className="torch-scale flex items-center justify-center w-11 h-10 overflow-visible">
        <span className="torch">
          <span className="head">
            <span className="face top">{faceDivs.map((_, i) => <span key={i} />)}</span>
            <span className="face left">{faceDivs.map((_, i) => <span key={i} />)}</span>
            <span className="face right">{faceDivs.map((_, i) => <span key={i} />)}</span>
          </span>
          <span className="stick">
            <span className="side side-left">{sideDivs.map((_, i) => <span key={i} />)}</span>
            <span className="side side-right">{sideDivs.map((_, i) => <span key={i} />)}</span>
          </span>
        </span>
      </span>
      <span
        className="torch-click-me absolute left-1/2 -translate-x-1/2 -bottom-3.5 whitespace-nowrap font-mono text-[9px] font-extrabold"
        aria-hidden="true"
      >
        Click me!
      </span>
    </label>
  );
}