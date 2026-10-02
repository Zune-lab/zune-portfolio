import SectionHead from '../ui/SectionHead.jsx';
import './SocialButton.css';
import { socials } from '../../data/socials.js';

function SocialButton({ name, href, brand, viewBox, path, zalo }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={name}
      className="social-icon relative flex flex-col items-center gap-2.5 w-[76px]"
    >
      <span className="social-btn relative flex items-center justify-center w-[52px] h-[52px] rounded-[10px] transition-transform duration-300">
        <span
          className="social-btn-icon relative z-10 flex items-center justify-center w-full h-full rounded-[11px] border text-white"
          style={{ borderColor: 'rgba(156,156,156,0.466)' }}
        >
          <svg viewBox={viewBox} className="w-[22px] h-[22px]" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            {zalo ? (
              <>
                <path
                  d="M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H9l-4.5 3.5V17H4a1 1 0 01-1-1V5a1 1 0 011-1z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  fill="none"
                />
                <text x="12" y="13.5" fontSize="7.5" fontWeight="700" fill="currentColor" textAnchor="middle">
                  Z
                </text>
              </>
            ) : (
              <path d={path} />
            )}
          </svg>
        </span>
        <span className="social-btn-bg absolute inset-0 z-0 rounded-[11px] pointer-events-none" style={{ background: brand }} />
      </span>
      <span className="social-label font-mono text-xs text-dim">{name}</span>
    </a>
  );
}

export default function Socials() {
  return (
    <section id="socials" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="04" title="socials/" />
        <div className="flex flex-wrap gap-x-2 gap-y-6">
          {socials.map((s) => (
            <SocialButton key={s.name} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}
