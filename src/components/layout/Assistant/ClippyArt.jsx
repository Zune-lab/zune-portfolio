// Hình Clippy kiểu Office 97, TỰ VẼ LẠI bằng SVG theo tỉ lệ xấp xỉ (không phải hình gốc: bản gốc là bitmap của Microsoft). Sợi dây kim loại, hai con mắt
// dõi theo con trỏ (qua biến CSS --px/--py của phần tử cha), lông mày. Các cử chỉ (nhìn quanh, nhướn mày, vươn người, gõ kính, nghĩ, vui, vẫy, ngủ)
// là hoạt ảnh CSS dựng lại theo phong cách trợ lý Office: chọn bằng prop `act`, xem Assistant.css.
// `blink` ép mắt dẹp xuống như đang chớp; `squint` nheo mắt (đang ngủ).
const WIRE = 'M36 38V66.25A11.75 11.75 0 0 1 12.5 66.25V11.75A8.75 8.75 0 0 1 30 11.75V56.25A5.75 5.75 0 0 1 18.5 56.25V36';

// Một con mắt: viền kim loại cùng màu dây, tròng trắng, đồng tử đen to có đốm sáng; điểm nghỉ lệch nhẹ về phía dưới-phải như bản gốc.
const Eye = ({ cx, cy, k, blink, squint }) => (
  <g transform={`translate(${cx} ${cy}) scale(${k} ${blink ? 0.1 : squint ? 0.3 : k})`}>
    <ellipse rx="6.7" ry="5.7" fill="url(#clippy-rim)" stroke="#333366" strokeWidth="0.9" />
    <ellipse rx="5.2" ry="4.3" fill="url(#clippy-white)" stroke="#333366" strokeWidth="0.55" />
    <g transform="translate(0.9 0.5)">
      <g className="assistant-pupil">
        <ellipse rx="3.3" ry="3.3" fill="#0a0a12" />
        <ellipse cx="-1.05" cy="-1.1" rx="0.75" ry="0.65" fill="#fff" opacity="0.9" />
      </g>
    </g>
    <path d="M-5.1 -1.4A5.2 4.3 0 0 1 5.1 -1.4" fill="none" stroke="#333366" strokeWidth="0.8" opacity="0.35" />
  </g>
);

export default function ClippyArt({ blink = false, act = null, sleeping = false }) {
  return (
    <svg className={`clippy-svg ${act ? `act-${act}` : ''} ${sleeping ? 'is-asleep' : ''}`} viewBox="0 0 42 81" width="40" height="77" aria-hidden="true">
      <defs>
        <radialGradient id="clippy-rim" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#d8d8f2" />
          <stop offset="0.55" stopColor="#9999cc" />
          <stop offset="1" stopColor="#666699" />
        </radialGradient>
        <radialGradient id="clippy-white" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9c9d6" />
        </radialGradient>
      </defs>
      {/* sợi dây: 3 khúc uốn (vòng to dưới đáy, cung hẹp trên đỉnh, vòng nhỏ bên trong), vẽ chồng nhiều lớp cho ra ống kim loại */}
      <g className="clippy-wire" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={WIRE} stroke="#333366" strokeWidth="5" />
        <path d={WIRE} stroke="#666699" strokeWidth="3.9" />
        <path d={WIRE} stroke="#9999cc" strokeWidth="2.7" transform="translate(-0.2 -0.2)" />
        <path d={WIRE} stroke="#d6d6f0" strokeWidth="1.1" transform="translate(-0.75 -0.6)" opacity="0.9" />
      </g>
      {/* mắt trái nhỏ và cao hơn, mắt phải to và thấp hơn */}
      <Eye cx={11.5} cy={25} k={0.95} blink={blink} squint={sleeping} />
      <Eye cx={28.2} cy={29.2} k={1.04} blink={blink} squint={sleeping} />
      {/* lông mày đen vuốt nhọn: trái hất lên, phải xụ xuống */}
      <path className="clippy-brow clippy-brow-l" d="M7.5 17.5C9.5 14.8 13 13.2 17.2 13.8C14.4 16.7 10.5 17.9 7.5 17.5Z" fill="#0a0a12" />
      <path className="clippy-brow clippy-brow-r" d="M28.6 20.4C31.6 18.2 35.4 18.9 37.6 23.4C35.2 21.8 31.8 21.5 28.6 20.4Z" fill="#0a0a12" />
      {/* đạo cụ cho từng cử chỉ (ẩn mặc định, CSS bật theo act): bong bóng nghĩ, tia sáng vui, chữ z ngủ, vạch gõ kính */}
      <g className="clippy-think" fill="#fff" stroke="#333366" strokeWidth="0.8">
        <circle cx="33" cy="4" r="1.6" />
        <circle cx="37" cy="-2" r="2.4" />
        <circle cx="42" cy="-10" r="3.4" />
      </g>
      <g className="clippy-sparkle" fill="#ffd23f" stroke="#a87b00" strokeWidth="0.5">
        <path d="M2 12l1.2 2.8L6 16l-2.8 1.2L2 20l-1.2-2.8L-2 16l2.8-1.2z" />
        <path d="M38 6l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" />
        <path d="M41 40l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" />
      </g>
      <g className="clippy-zzz" fill="#333366" fontFamily="Tahoma, Verdana, sans-serif" fontWeight="700">
        <text x="32" y="10" fontSize="8">z</text>
        <text x="38" y="2" fontSize="10">Z</text>
      </g>
      <g className="clippy-tap" fill="none" stroke="#333366" strokeWidth="1.2" strokeLinecap="round">
        <path d="M-3 28q-2.4 4 0 8" />
        <path d="M-7 25q-4 7 0 14" />
      </g>
    </svg>
  );
}
