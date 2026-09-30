import './Art.css';

// trái tim đập nhẹ, vài đốm sáng lấp lánh xung quanh
export default function Art() {
  return (
    <div className="art-center">
      <svg
        viewBox="0 0 120 120" width="96" height="96" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
      >
        <path
          className="love-heart"
          d="M60 100 C20 70 10 40 32 28 C46 20 58 28 60 38 C62 28 74 20 88 28 C110 40 100 70 60 100 Z"
        />
        <circle className="love-spark" style={{ animationDelay: '0s' }} cx="18" cy="24" r="2.5" fill="currentColor" stroke="none" />
        <circle className="love-spark" style={{ animationDelay: '-0.7s' }} cx="104" cy="18" r="2" fill="currentColor" stroke="none" />
        <circle className="love-spark" style={{ animationDelay: '-1.3s' }} cx="106" cy="86" r="2.5" fill="currentColor" stroke="none" />
        <circle className="love-spark" style={{ animationDelay: '-1.9s' }} cx="12" cy="82" r="2" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
