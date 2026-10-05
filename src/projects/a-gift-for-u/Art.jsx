import ArtSvg from '../ArtSvg.jsx';
import './Art.css';

// đốm sáng lấp lánh quanh trái tim: toạ độ, bán kính, độ lệch pha của animation
const SPARKS = [
  { cx: 18, cy: 24, r: 2.5, delay: '0s' },
  { cx: 104, cy: 18, r: 2, delay: '-0.7s' },
  { cx: 106, cy: 86, r: 2.5, delay: '-1.3s' },
  { cx: 12, cy: 82, r: 2, delay: '-1.9s' },
];

// trái tim đập nhẹ, vài đốm sáng lấp lánh xung quanh
export default function Art() {
  return (
    <ArtSvg>
      <path
        className="love-heart"
        d="M60 100 C20 70 10 40 32 28 C46 20 58 28 60 38 C62 28 74 20 88 28 C110 40 100 70 60 100 Z"
      />
      {SPARKS.map(({ delay, ...c }) => (
        <circle key={c.cx} className="love-spark" style={{ animationDelay: delay }} {...c} fill="currentColor" stroke="none" />
      ))}
    </ArtSvg>
  );
}
