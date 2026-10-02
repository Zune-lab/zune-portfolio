import './Art.css';

// góc lịch: 35 ô (5 tuần x 7 ngày, thứ 2 -> CN), vài ô sáng lên.
// Ô "hôm nay" nằm ở hàng đầu, ĐÚNG CỘT của thứ hôm nay (thứ 6 -> cột thứ 5) và được đóng một
// "con dấu" ghi tên thứ; thanh tiêu đề của cột đó cũng sáng lên. Lấy theo ngày thật của máy người xem.
// Không có số ngày nào -> chỉ gợi ý đây là lịch, không lộ nội dung thật.
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const CELLS = Array.from({ length: 35 }, (_, i) => i);
// các ô sáng trang trí, nằm lệch khỏi cột giữa (nơi có nhãn số + tên file) và tránh hàng đầu (dành cho "hôm nay")
const ON = new Set([8, 14, 19]);

export default function Art() {
  const today = (new Date().getDay() + 6) % 7; // getDay(): 0 = CN -> đổi sang 0 = thứ 2

  return (
    <div className="cal-art">
      <div className="cal-grid">
        {DAYS.map((d, i) => (
          <span key={d} className={`cal-head${i === today ? ' today' : ''}`} />
        ))}
        {CELLS.map((i) => (
          <span key={i} className={`cal-cell${ON.has(i) ? ' on' : ''}${i === today ? ' today' : ''}`}>
            {i === today && <span className="cal-stamp">{DAYS[today]}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}