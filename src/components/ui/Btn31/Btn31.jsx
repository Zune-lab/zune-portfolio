import './Btn31.css';

export default function Btn31({ href, onClick, type = 'button', icon, children, className = '' }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
      type={href ? undefined : type}
      onClick={onClick}
      className={`btn-31 inline-flex items-center justify-center gap-2 px-6 py-3.5 font-mono text-[13px] font-bold uppercase tracking-wide ${className}`}
    >
      {icon && <span className="btn-31-icon relative z-[1] w-4 h-4 flex-none">{icon}</span>}
      <span className="text-container block overflow-hidden relative">
        <span className="text block font-bold">{children}</span>
      </span>
    </Tag>
  );
}
