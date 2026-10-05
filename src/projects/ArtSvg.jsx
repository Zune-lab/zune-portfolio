import './Projects.css'; // chứa .art-center (căn giữa hình trong khung)

// Khung chung cho các Art vẽ bằng nét SVG (a-dumb-gift, a-gift-for-u, le-tot-nghiep): cùng kiểu nét
// (currentColor, 2.5, bo tròn đầu/góc), mỗi Art chỉ truyền hình vẽ + kích thước.
export default function ArtSvg({ viewBox = '0 0 120 120', width = 96, height = 96, children }) {
  return (
    <div className="art-center">
      <svg
        viewBox={viewBox}
        width={width}
        height={height}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {children}
      </svg>
    </div>
  );
}
