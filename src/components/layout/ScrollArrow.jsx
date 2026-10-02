import './ScrollArrow.css';

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
);

// nút tròn mũi tên trái, dùng làm nút "quay lại" ở mép trái (Navbar)
export default function ScrollArrow({ onClick, ariaLabel = 'Go back', tabIndex }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      className="scroll-arrow relative block w-12 h-12 rounded-full overflow-hidden cursor-pointer"
    >
      <span className="scroll-arrow-box flex absolute top-0 left-0 transition-transform duration-300">
        <span className="scroll-arrow-elem flex items-center justify-center w-12 h-12 flex-none text-dim transition-colors duration-300">
          <ArrowIcon />
        </span>
        <span className="scroll-arrow-elem flex items-center justify-center w-12 h-12 flex-none text-dim transition-colors duration-300">
          <ArrowIcon />
        </span>
      </span>
    </button>
  );
}
