// level=1 cho tiêu đề chính của các trang riêng (About / Projects / Lab); trang chủ đã có <h1> ở Hero nên dùng 2
export default function SectionHead({ num, title, level = 2 }) {
  const H = `h${level}`;
  return (
    <div className="flex items-baseline gap-3.5 mb-10">
      <span className="font-mono text-sm" style={{ color: 'var(--amber-dim)' }}>
        {num}
      </span>
      <H className="font-mono font-bold text-[clamp(22px,3vw,28px)]">{title}</H>
    </div>
  );
}
