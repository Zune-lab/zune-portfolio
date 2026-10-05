import { useState } from 'react';
import { arts } from '../index.js';
import { canHover } from '../../lib/env.js';
import { BASE } from '../../lib/paths.js';
import './ProjectCard.css';

// Card gồm 3 lớp:
//  - Art (src/projects/<tên>/Art.jsx): hình vẽ tự tạo, hiện lúc bình thường; không có thì hiện icon
//  - ảnh chụp public/previews/<tên>.png: hiện làm nền khi HOVER (chưa có ảnh thì nền trơn như cũ)
export default function ProjectCard({ num, file, desc, color, href, shot }) {
  // Chỉ tải ảnh khi meta.js đặt `shot: true` (đã chụp & commit public/previews/<tên>.png),
  // nên chưa có ảnh thì không bắn request 404.
  const [shotOk, setShotOk] = useState(Boolean(shot));
  const slug = file.replace(/\.[^.]+$/, '');
  const Art = arts[slug];
  // thiết bị cảm ứng ẩn Art bằng CSS (hover: none) -> không mount luôn cho đỡ chạy animation vô ích
  const hoverable = canHover();

  return (
    <a
      id={`project-${num}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`project-card ${shotOk ? 'has-shot' : ''} relative h-[180px] rounded-[10px] overflow-hidden bg-panel border border-line flex items-center justify-center cursor-pointer transition-[transform,box-shadow,border-color] duration-500 hover:scale-[1.04] hover:shadow-[0_18px_30px_-14px_rgba(0,0,0,0.5)] hover:border-amber-dim scroll-mt-20`}
    >
      {Art && hoverable && (
        <div className="project-card-preview absolute inset-0" style={{ color }} aria-hidden="true">
          <Art />
        </div>
      )}

      {/* ảnh chụp: chỉ hiện khi hover. BASE_URL vì site chạy ở subpath /<repo>/ */}
      {shotOk && (
        <img
          src={`${BASE}previews/${slug}.png`}
          alt=""
          loading="lazy"
          onError={() => setShotOk(false)}
          className="project-card-shot absolute inset-0 w-full h-full object-cover object-top"
        />
      )}

      <div
        className={`project-card-idle relative z-[1] flex flex-col items-center gap-2 ${
          Art ? 'self-end pb-4' : ''
        }`}
        style={{ color }}
      >
        {!Art && (
          <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M20 5H4V19L13.2923 9.70649C13.6828 9.31595 14.3159 9.31591 14.7065 9.70641L20 15.0104V5ZM2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z"
            />
          </svg>
        )}
        <span className="font-mono text-[11px] text-dim">{num}</span>
        <span className="font-mono text-sm text-ink">{file}</span>
      </div>

      <div className="project-card-content absolute top-1/2 left-1/2 w-full h-full box-border p-5 bg-inset flex flex-col justify-center gap-2">
        <span className="font-mono text-[15px] text-ink">{file}</span>
        <span className="text-dim text-[13px] leading-relaxed">{desc}</span>
        <span className="mt-auto self-start font-mono text-[13px] text-amber hover:underline">open →</span>
      </div>
    </a>
  );
}
