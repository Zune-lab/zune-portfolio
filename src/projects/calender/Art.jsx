import './Art.css';

// góc lịch: 35 ô (5 tuần x 7 ngày), vài ô sáng lên, 1 ô "hôm nay" nhấp nháy.
// Không có chữ số nào -> chỉ gợi ý đây là lịch, không lộ nội dung thật.
const CELLS = Array.from({ length: 35 }, (_, i) => i);
const ON = new Set([4, 9, 10, 17, 23]);
const TODAY = 16;

export default function Art() {
  return (
    <div className="cal-art">
      <div className="cal-grid">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={`h${i}`} className="cal-head" />
        ))}
        {CELLS.map((i) => (
          <span key={i} className={`cal-cell${ON.has(i) ? ' on' : ''}${i === TODAY ? ' today' : ''}`} />
        ))}
      </div>
    </div>
  );
}
