import './ScrollArrow.css';

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
);

// rotate: -90 (mặc định) = icon gốc (trỏ trái) xoay thành mũi tên chỉ xuống,
// dùng cho nút "cuộn xuống" ở Hero. Truyền rotate={0} để giữ nguyên hướng
// trái, dùng làm nút "quay lại". Có href -> render <a>, không thì <button>.
export default function ScrollArrow({
  href,
  onClick,
  rotate = -90,
  ariaLabel = 'Scroll to next section',
  className = '',
  tabIndex,
}) {
  const inner = (
    <span className="scroll-arrow-box flex absolute top-0 left-0 transition-transform duration-300">
      <span className="scroll-arrow-elem flex items-center justify-center w-12 h-12 flex-none text-dim transition-colors duration-300">
        <ArrowIcon />
      </span>
      <span className="scroll-arrow-elem flex items-center justify-center w-12 h-12 flex-none text-dim transition-colors duration-300">
        <ArrowIcon />
      </span>
    </span>
  );

  const sharedProps = {
    'aria-label': ariaLabel,
    tabIndex,
    className: `scroll-arrow relative block w-12 h-12 rounded-full overflow-hidden cursor-pointer ${className}`,
    style: { transform: `rotate(${rotate}deg)` },
  };

  if (href) {
    return (
      <a href={href} {...sharedProps}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} {...sharedProps}>
      {inner}
    </button>
  );
}
