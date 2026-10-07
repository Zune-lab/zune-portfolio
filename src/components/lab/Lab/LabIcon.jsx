// Icon nét mảnh (stroke) cho thẻ ở lưới lab, thay cho emoji để hợp vibe terminal của web.
// Màu lấy từ currentColor nên đổi theo theme / hover (xem .lab-card-icon trong LabFx.css).
// Mỗi icon có chuyển động riêng khi hover thẻ: các class `li-*` được animate trong LabFx.css.
// Khóa = slug trong lab-items.js. Thêm mục mới: thêm 1 entry vào ICONS (viewBox 24x24).

const ICONS = {
  // thằn lằn: bò ngoằn ngoèo, chân bước luân phiên
  reptile: (
    <>
      <circle cx="18.5" cy="5.5" r="2" />
      <path d="M17 7C13 8.5 15 12 11.5 13.5S6.5 17 5 20.5" />
      <path className="li-leg li-leg-a" d="M15.5 9.5L19 12" />
      <path className="li-leg li-leg-b" d="M14 11L11 8.5" />
      <path className="li-leg li-leg-a" d="M9.5 15L6 13" />
      <path className="li-leg li-leg-b" d="M8 17.5L10.5 19.5" />
    </>
  ),
  // sứa: chuông phập phồng, xúc tu đung đưa
  jellyfish: (
    <>
      <g className="li-bell">
        <path d="M5.5 11a6.5 6.5 0 0 1 13 0Z" />
      </g>
      <path className="li-tent li-tent-a" d="M9 11c-1 2.5 1 4.5 0 7.5" />
      <path className="li-tent li-tent-b" d="M12 11c1 3-1 5.5 0 9.5" />
      <path className="li-tent li-tent-a" d="M15 11c-1 2.5 1 4.5 0 7.5" />
    </>
  ),
  // hydra: ba cổ, ba đầu ngoáy theo nhịp khác nhau
  hydra: (
    <>
      <path d="M4 21a8 4.5 0 0 1 16 0Z" />
      <g className="li-neck li-neck-a">
        <path d="M8 17c-2.5-3-3-6-1.5-9.5" />
        <circle cx="6.3" cy="6" r="1.6" />
      </g>
      <g className="li-neck li-neck-b">
        <path d="M12 16.5V8.5" />
        <circle cx="12" cy="7" r="1.6" />
      </g>
      <g className="li-neck li-neck-c">
        <path d="M16 17c2.5-3 3-6 1.5-9.5" />
        <circle cx="17.7" cy="6" r="1.6" />
      </g>
    </>
  ),
  // giọt nhớt: thân lúc lắc, mắt chớp
  gloop: (
    <>
      <path className="li-blob" d="M4.5 13.5C4.5 8.5 8 5 12.5 5S20 8.5 19.5 13c-.4 3.8-2.8 6.5-7 6.5S4.5 18 4.5 13.5Z" />
      <circle className="li-eye" cx="9.5" cy="12" r="1.2" fill="currentColor" />
      <circle className="li-eye" cx="14.5" cy="11" r="1.2" fill="currentColor" />
    </>
  ),
  // bướm đêm: hai cánh vỗ quanh thân
  moths: (
    <>
      <g className="li-wing-l">
        <path d="M12 12C8.5 5 3.5 6.5 4 10.5S9 14 12 12Z" />
        <path d="M12 13c-3.5 .5-5.5 4.5-3.5 6.5S12 17.5 12 13Z" />
      </g>
      <g className="li-wing-r">
        <path d="M12 12c3.5-7 8.5-5.5 8-1.5S15 14 12 12Z" />
        <path d="M12 13c3.5 .5 5.5 4.5 3.5 6.5S12 17.5 12 13Z" />
      </g>
      <path d="M12 8.5v10" />
      <path d="M12 8.5l-1.5-2.5M12 8.5l1.5-2.5" />
    </>
  ),
  // mặt mèo: nghiêng đầu qua lại, chớp mắt
  cat: (
    <g className="li-cathead">
      <path d="M5 9.5V4l4.5 3h5L19 4v5.5C19 14.5 16 18.5 12 18.5S5 14.5 5 9.5Z" />
      <circle className="li-eye" cx="9.5" cy="11.5" r="0.7" fill="currentColor" />
      <circle className="li-eye" cx="14.5" cy="11.5" r="0.7" fill="currentColor" />
      <path d="M12 14v1" />
    </g>
  ),
  // ma: bay lơ lửng, mắt liếc ngang
  ghost: (
    <>
      <path d="M6 20.5V11a6 6 0 0 1 12 0v9.5l-2.5-2-3.5 2-3.5-2-2.5 2Z" />
      <circle className="li-gaze" cx="9.7" cy="11" r="0.8" fill="currentColor" />
      <circle className="li-gaze" cx="14.3" cy="11" r="0.8" fill="currentColor" />
    </>
  ),
  // banner: thanh treo đứng yên, tấm vải đung đưa như con lắc
  'banner-maker': (
    <>
      <path d="M4 4h16" />
      <g className="li-cloth">
        <path d="M7 4v12l5 4 5-4V4" />
        <path d="M7 10h10" />
      </g>
    </>
  ),
  // bọ: chạy rung, chân quẫy, râu giật
  'bug-squash': (
    <>
      <rect x="8" y="8" width="8" height="11" rx="4" />
      <path d="M12 8v11" />
      <g className="li-ant">
        <path d="M9 4.5L10.5 8M15 4.5L13.5 8" />
      </g>
      <path className="li-legs-l" d="M8 12H4.5M8 16H5.5" />
      <path className="li-legs-r" d="M16 12h3.5M16 16h2.5" />
    </>
  ),
  // 2 lá bài: lá trước lật qua lật lại
  'memory-match': (
    <>
      <rect className="li-back" x="3.5" y="6" width="10" height="14" rx="1.5" />
      <g className="li-flip">
        <rect x="10.5" y="4" width="10" height="14" rx="1.5" fill="var(--panel)" />
        <path d="M15.5 8.5l2 2.5-2 2.5-2-2.5Z" />
      </g>
    </>
  ),
  // rắn kiểu lưới ô vuông: trườn dọc đường gấp khúc
  snake: (
    <>
      <path className="li-snake-body" pathLength="100" d="M4.5 18.5H15V12H8V6H18" />
      <rect className="li-snake-head" x="16.5" y="4.5" width="3" height="3" fill="currentColor" />
    </>
  ),
};

export default function LabIcon({ name, size = 28 }) {
  return (
    <svg
      className={`lab-icon lab-icon--${name}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name] ?? <circle cx="12" cy="12" r="6" />}
    </svg>
  );
}
