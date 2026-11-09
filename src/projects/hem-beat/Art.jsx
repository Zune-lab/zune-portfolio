import ArtSvg from '../ArtSvg.jsx';
import './Art.css';

// cái loa thùng (boombox) ngoài hẻm: hai màng loa đập theo nhịp, nốt nhạc bay lên
export default function Art() {
  return (
    <ArtSvg>
      <path d="M38 42 V30 Q38 24 44 24 H76 Q82 24 82 30 V42" />
      <rect className="beat-fill" x="14" y="42" width="92" height="56" rx="10" />
      <circle cx="38" cy="72" r="16" />
      <circle className="beat-cone" cx="38" cy="72" r="6" />
      <circle cx="82" cy="72" r="16" />
      <circle className="beat-cone b" cx="82" cy="72" r="6" />
      <rect x="51" y="54" width="18" height="8" rx="2" />
      <path d="M52 80 H68" />
      <path className="beat-note" d="M98 30 V16 L108 13 V27 M98 30 a3 3 0 1 1 -6 0 a3 3 0 0 1 6 0 M108 27 a3 3 0 1 1 -6 0 a3 3 0 0 1 6 0" />
      <path className="beat-note n2" d="M14 26 V14 L21 12 V24 M14 26 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0 M21 24 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0" />
    </ArtSvg>
  );
}
