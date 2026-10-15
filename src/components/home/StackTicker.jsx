import './Chips.css';
import TechIcon from '../ui/TechIcon.jsx';
import { TECH_COLORS } from '../../config/tech.js';
import { stack } from '../../data/profile.js';

// Thay cho con sâu trên màn cảm ứng (xem Hero.jsx): sâu cần con trỏ để theo, ngón tay thì không có.
// Hai dải chip stack tự trôi ngược chiều nhau (CSS thuần, .stack-ticker trong index.css), chạm giữ để dừng.
// Mỗi dải có hai bản của danh sách để vòng lặp liền mạch; cả khối chỉ để trang trí (danh sách thật nằm ở about.js).
const Row = ({ items, reverse }) => (
  <div className={`stack-row${reverse ? ' is-rev' : ''}`}>
    {[...items, ...items].map((s, n) => (
      <span key={`${s}-${n}`} className="chip" style={TECH_COLORS[s] ? { '--c': TECH_COLORS[s] } : undefined}>
        <TechIcon name={s} />
        {s}
      </span>
    ))}
  </div>
);

export default function StackTicker() {
  const half = Math.ceil(stack.length / 2);
  // dải dưới đi theo thứ tự khác để hai dải không trùng nhau
  return (
    <div className="stack-ticker" aria-hidden="true">
      <Row items={stack} />
      <Row items={[...stack.slice(half), ...stack.slice(0, half)]} reverse />
      <span>// stack · hold to pause</span>
    </div>
  );
}
