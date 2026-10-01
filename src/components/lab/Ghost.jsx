import './Ghost.css';

// Con ma: chỉ CSS animation (bay lơ lửng, chớp mắt, sao nhấp nháy); rê chuột vào là nó hoảng
const STARS = [
  { l: '12%', t: '18%', d: '0s' },
  { l: '78%', t: '14%', d: '0.7s' },
  { l: '88%', t: '56%', d: '1.4s' },
  { l: '20%', t: '64%', d: '0.4s' },
  { l: '64%', t: '78%', d: '1.1s' },
];

export default function Ghost() {
  return (
    <div className="lab-ghost">
      {STARS.map((s, i) => (
        <span key={i} className="ghost-star" style={{ left: s.l, top: s.t, animationDelay: s.d }} />
      ))}
      <div className="ghost-float">
        <div className="ghost">
          <div className="ghost-eyes">
            <span className="ghost-eye" />
            <span className="ghost-eye" />
          </div>
          <span className="ghost-cheek ghost-cheek-l" />
          <span className="ghost-cheek ghost-cheek-r" />
          <span className="ghost-mouth" />
        </div>
      </div>
      <div className="ghost-shadow" />
    </div>
  );
}
