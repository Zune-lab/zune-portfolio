import './Cat.css';

// hộp chứa đúng 2 phần tử giống nhau (râu, lông mày): DOM giữ nguyên cấu trúc vì CSS chọn theo nth-child
const Pair = ({ box, item }) => (
  <div className={box}>
    <div className={item}></div>
    <div className={item}></div>
  </div>
);

// Mèo chạy ngược: chỉ CSS animation, không có state
export default function Cat() {
  return (
    <div className="lab-cat">
      <div className="paw"></div>
      <div className="paw"></div>
      <div className="shake">
        <div className="tail"></div>
        <div className="main">
          <div className="head"></div>
          <div className="body">
            <div className="leg"></div>
          </div>
          <div className="face">
            <Pair box="mustache_cont" item="mustache" />
            <Pair box="mustache_cont" item="mustache" />
            <div className="nose"></div>
            <div className="eye"></div>
            <div className="eye"></div>
            <Pair box="brow_cont" item="brow" />
            <Pair box="brow_cont" item="brow" />
            <div className="ear_l">
              <div className="inner"></div>
            </div>
            <div className="ear_r">
              <div className="outer"></div>
              <div className="inner"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
