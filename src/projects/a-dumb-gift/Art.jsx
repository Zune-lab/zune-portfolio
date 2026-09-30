import './Art.css';

// hộp quà, nắp khẽ nhấc lên xuống như có gì ở bên trong
export default function Art() {
  return (
    <div className="art-center">
      <svg
        viewBox="0 0 120 120" width="96" height="96" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
      >
        <rect className="gift-fill" x="22" y="58" width="76" height="50" rx="6" />
        <path d="M60 58 V108" />
        <g className="gift-lid">
          <rect className="gift-fill" x="16" y="42" width="88" height="18" rx="5" />
          <path d="M60 42 C50 22 32 28 42 40 C48 46 58 44 60 42 C62 44 72 46 78 40 C88 28 70 22 60 42 Z" />
        </g>
      </svg>
    </div>
  );
}
