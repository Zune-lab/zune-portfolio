export default function SectionHead({ num, title }) {
  return (
    <div className="flex items-baseline gap-3.5 mb-10">
      <span className="font-mono text-sm" style={{ color: 'var(--amber-dim)' }}>
        {num}
      </span>
      <h2 className="font-mono font-bold text-[clamp(22px,3vw,28px)]">{title}</h2>
    </div>
  );
}
