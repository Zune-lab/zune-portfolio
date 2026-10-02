import './Art.css';

// góc lịch: 35 ô (5 tuần x 7 ngày, thứ 2 -> CN), vài ô sáng lên.
// Ô "hôm nay" nằm ĐÚNG CỘT của thứ hôm nay (thứ 6 -> cột thứ 5), hàng thì theo tuần của tháng, và được đóng một
// "con dấu" ghi tên thứ; thanh tiêu đề của cột đó cũng sáng lên. Lấy theo ngày thật của máy người xem.
// Không có số ngày nào -> chỉ gợi ý đây là lịch, không lộ nội dung thật.
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const CELLS = Array.from({ length: 35 }, (_, i) => i);
// các ô sáng trang trí, nằm lệch khỏi cột giữa (nơi có nhãn số + tên file); ô nào trùng với ô "hôm nay"
// thì không sáng
const ON = new Set([5, 8, 13, 14, 19]);

// hàng của ô "hôm nay" đổi theo tuần của tháng (như lịch thật), chỉ dùng 2 hàng đầu (hàng 3 bị mask làm mờ, nhãn lại nằm ở đó)
function todayCell(now) {
  const col = (now.getDay() + 6) % 7; // getDay(): 0 = CN -> đổi sang 0 = thứ 2
  const offset = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7; // thứ của ngày mùng 1
  let row = Math.floor((now.getDate() + offset - 1) / 7) % 2;
  // tránh nhãn "05" ở giữa phía dưới
  if (row === 1 && col === 3) row = 0;
  return { col, index: row * 7 + col };
}

export default function Art() {
  const { col: todayCol, index: todayIndex } = todayCell(new Date());

  return (
    <div className="cal-art">
      <div className="cal-grid">
        {DAYS.map((d, i) => (
          <span key={d} className={`cal-head${i === todayCol ? ' today' : ''}`} />
        ))}
        {CELLS.map((i) => (
          <span key={i} className={`cal-cell${ON.has(i) && i !== todayIndex ? ' on' : ''}${i === todayIndex ? ' today' : ''}`}>
            {i === todayIndex && <span className="cal-stamp">{DAYS[todayCol]}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}