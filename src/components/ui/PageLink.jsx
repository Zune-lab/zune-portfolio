import { pathOf } from '../../lib/paths.js';
import { isPlainClick } from '../../lib/dom.js';

// Link thật (Ctrl+click mở tab mới được) nhưng bấm thường thì chuyển trang mượt trong app.
// `view`: 'home' | 'about' | 'lab/<slug>'... (xem config/pages.js). Các prop còn lại (rel, title, style...) chuyển thẳng xuống <a>.
export default function PageLink({ view, onNavigate, className = 'hero-link', children, ...rest }) {
  return (
    <a
      href={pathOf(view)}
      className={className}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        onNavigate?.(view);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
