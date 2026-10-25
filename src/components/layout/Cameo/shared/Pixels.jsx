// Vẽ pixel art từ chuỗi: mỗi ký tự là một ô vuông, '.' là trong suốt, colors[ký tự] là màu.
// Các ô liền nhau cùng màu trên một hàng được gộp thành một <rect> cho nhẹ.
export function PixelRects({ rows, colors }) {
  const out = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ' || !colors[ch]) {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === ch) w++;
      out.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={colors[ch]} />);
      x += w;
    }
  });
  return out;
}

export function Pixels({ rows, colors, px = 4, className }) {
  const w = Math.max(...rows.map((r) => r.length));
  return (
    <svg className={className} width={w * px} height={rows.length * px} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" aria-hidden="true">
      <PixelRects rows={rows} colors={colors} />
    </svg>
  );
}
