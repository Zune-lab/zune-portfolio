import './Art.css';

// mũ tốt nghiệp, tua đung đưa nhẹ
export default function Art() {
  return (
    <div className="art-center">
      <svg
        viewBox="0 0 120 100" width="104" height="87" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
      >
        <path className="grad-fill" d="M60 16 L112 38 L60 60 L8 38 Z" />
        <path d="M28 50 V72 C28 82 92 82 92 72 V50" />
        <g className="grad-tassel">
          <path d="M104 41 V70" />
          <rect className="grad-fill" x="100" y="70" width="8" height="12" rx="2" />
        </g>
      </svg>
    </div>
  );
}
