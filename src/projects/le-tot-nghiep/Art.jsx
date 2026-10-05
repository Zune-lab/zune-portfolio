import ArtSvg from '../ArtSvg.jsx';
import './Art.css';

// mũ tốt nghiệp, tua đung đưa nhẹ
export default function Art() {
  return (
    <ArtSvg viewBox="0 0 120 100" width={104} height={87}>
      <path className="grad-fill" d="M60 16 L112 38 L60 60 L8 38 Z" />
      <path d="M28 50 V72 C28 82 92 82 92 72 V50" />
      <g className="grad-tassel">
        <path d="M104 41 V70" />
        <rect className="grad-fill" x="100" y="70" width="8" height="12" rx="2" />
      </g>
    </ArtSvg>
  );
}
