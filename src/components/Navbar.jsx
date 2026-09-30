import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ThemeToggleTorch from './ThemeToggleTorch.jsx';
import ScrollArrow from './ScrollArrow.jsx';
import { PAGES, pageOf, pathOf } from '../pages.js';
import './Navbar.css';

// mỗi mục ở nav chính: có "tab" = 1 trang riêng (có địa chỉ riêng, khai báo ở
// src/pages.js); không có "tab" thì chỉ là link cuộn trong trang chính.
const mainLinks = [
  ...PAGES.map((p) => ({ href: `#${p.id}`, label: p.label, tab: p.id })),
  { href: '#feedback', label: 'feedback.sh' },
  { href: '#socials', label: 'socials/' },
];

// href THẬT của link: trang riêng -> /zune-portfolio/<id>; anchor -> trang chính + #anchor.
// Nhờ vậy Ctrl+click / chuột giữa / "mở trong tab mới" ra đúng trang, không chỉ #about.
const realHref = (l) => (l.tab ? pathOf(l.tab) : pathOf('home') + l.href);

// bấm thường -> chuyển trang trong app (mượt, có loader); giữ Ctrl/Cmd/Shift/Alt hoặc
// chuột giữa -> trả lại cho trình duyệt mở tab mới
const isPlainClick = (e) => e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);

function NavLink({ href, onClick, className = '', linkRef, children, ...rest }) {
  return (
    <a
      ref={linkRef}
      href={href}
      onClick={onClick}
      {...rest}
      className={`nav-link shrink-0 px-3 py-1.5 font-mono text-[13px] text-dim hover:text-amber ${className}`}
    >
      <span className="nav-link-text whitespace-nowrap">{children}</span>
    </a>
  );
}

// nav phụ có nhiều mục (vd lab có cả chục game) thì gom vào 1 menu thả xuống `ls <trang>/`
// thay vì xếp hết ra hàng ngang. Menu vẽ qua portal (ra <body>) vì hàng nav có
// overflow-x + backdrop-filter nên sẽ cắt / lệch mất menu nếu đặt bên trong.
const MAX_INLINE_SUB = 3;
const MENU_W = 220;

const scrollToAnchor = (href) => document.querySelector(href)?.scrollIntoView({ block: 'start' });

function SubMenu({ label, links }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const inside = (t) => menuRef.current?.contains(t) || btnRef.current?.contains(t);
    const onDown = (e) => {
      if (!inside(e.target)) close();
    };
    const onKey = (e) => e.key === 'Escape' && close();
    const onScroll = (e) => {
      if (!menuRef.current?.contains(e.target)) close(); // cuộn chính menu thì đừng đóng
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const toggle = (e) => {
    e.preventDefault();
    if (!open) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom - 2, left: Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8)) });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <NavLink
        href="#"
        linkRef={btnRef}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={open ? 'is-open text-amber' : ''}
      >
        {label}
        <span className={`sub-menu-caret ${open ? 'is-open' : ''}`} aria-hidden="true">
          ▼
        </span>
      </NavLink>
      {open &&
        createPortal(
          <div ref={menuRef} role="menu" className="sub-menu" style={{ top: pos.top, left: pos.left, width: MENU_W }}>
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                role="menuitem"
                className="sub-menu-item"
                onClick={(e) => {
                  if (!isPlainClick(e)) return;
                  e.preventDefault(); // chỉ cuộn tới mục, không thêm #anchor vào URL
                  setOpen(false);
                  scrollToAnchor(l.href);
                }}
              >
                {l.label}
              </a>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

// mép phải mờ dần khi còn link chưa cuộn tới -> chữ không bị cắt cụt đột ngột
const fadeRight = (on) =>
  on
    ? {
        WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 32px), transparent)',
        maskImage: 'linear-gradient(to right, #000 calc(100% - 32px), transparent)',
      }
    : undefined;

// báo hiệu (chấm nhỏ) khi hàng nav bị tràn và còn link chưa cuộn tới,
// tự cập nhật theo scroll / resize / khi đổi danh sách link (deps)
function useMoreDot(deps) {
  const ref = useRef(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setHasMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    };

    check();
    const wheel = (e) => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return;
      e.preventDefault(); // còn chỗ để cuộn ngang -> giữ trang đứng yên
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('scroll', check, { passive: true });
    el.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      el.removeEventListener('wheel', wheel);
      window.removeEventListener('resize', check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [ref, hasMore];
}

// ngăn xếp các "view" đã ghé qua, chỉ để phục vụ nút back (cd .. / mũi tên
// mép trái). Tự quan sát prop `view` đổi từ bên ngoài (App) để push vào
// stack; khi người dùng bấm back, ta pop ra trang TRƯỚC ĐÓ thay vì luôn
// nhảy thẳng về home. skipPushRef để không tự push lại chính cú back đó.
function useViewHistory(view, onNavigate) {
  const historyRef = useRef(['home']);
  const skipPushRef = useRef(false);

  useEffect(() => {
    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }
    const stack = historyRef.current;
    if (stack[stack.length - 1] !== view) {
      stack.push(view);
    }
  }, [view]);

  const goBack = () => {
    const stack = historyRef.current;
    if (stack.length > 1) stack.pop(); // bỏ trang hiện tại
    const prev = stack[stack.length - 1] || 'home';
    skipPushRef.current = true;
    onNavigate(prev);
  };

  // về thẳng trang chính, bỏ qua mọi trang đã ghé (khác goBack chỉ lùi 1 bước).
  // Reset stack về ['home'] để lần "cd .." sau đó không lùi lại trang cũ.
  const goHome = () => {
    historyRef.current = ['home'];
    skipPushRef.current = true;
    onNavigate('home');
  };

  return { goBack, goHome };
}

export default function Navbar({ theme, onToggleTheme, view, onNavigate }) {
  const inTab = view !== 'home';
  const localLinks = pageOf(view)?.sub || [];
  const { goBack, goHome } = useViewHistory(view, onNavigate);

  // link nhảy thẳng sang các mục khác ở nav chính, trừ mục đang đứng (tab hiện tại)
  const jumpLinks = mainLinks.filter((l) => l.tab !== view);

  const [mainRowRef, mainHasMore] = useMoreDot([inTab]);
  const [subRowRef, subHasMore] = useMoreDot([inTab, view]);

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b border-line backdrop-blur-md"
        style={{ background: 'var(--nav-bg)' }}
      >
        <div className="wrap max-w-[1040px] mx-auto px-8 flex items-center gap-6 h-14">
          <a
            href="#top"
            aria-label="Về trang chính"
            onClick={(e) => {
              e.preventDefault();
              if (inTab) goHome();
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-mono text-sm flex items-center gap-2 cursor-pointer"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }}
            />
            zune.dev
          </a>

          <div className="hidden md:flex relative h-full items-center min-w-0 flex-1 pr-4">
            {/* nav chính — trượt ra bên trái khi vào tab, trượt vào (trễ 150ms) khi quay lại */}
            <div
              ref={mainRowRef}
              style={fadeRight(!inTab && mainHasMore)}
              className={`nav-scroll flex items-center gap-1.5 w-full overflow-x-auto transition-all duration-300 ease-in-out ${
                inTab
                  ? 'opacity-0 -translate-x-3 pointer-events-none'
                  : 'opacity-100 translate-x-0 delay-150'
              }`}
            >
              {mainLinks.map((l) => (
                <NavLink
                  key={l.href}
                  href={realHref(l)}
                  onClick={(e) => {
                    if (!isPlainClick(e)) return;
                    if (l.tab) {
                      e.preventDefault();
                      onNavigate(l.tab);
                    } else if (view === 'home') {
                      e.preventDefault(); // đang ở trang chính: chỉ cuộn tới mục, không thêm #anchor vào URL
                      document.querySelector(l.href)?.scrollIntoView({ block: 'start' });
                    }
                  }}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
            <span className={`nav-more-dot ${!inTab && mainHasMore ? 'is-visible' : ''}`} aria-hidden="true" />

            {/* nav phụ — trượt vào từ bên phải (trễ 150ms) khi vào tab, trượt ra khi thoát */}
            <div
              ref={subRowRef}
              style={fadeRight(inTab && subHasMore)}
              className={`nav-scroll flex items-center gap-1.5 absolute left-0 right-4 top-0 h-full overflow-x-auto transition-all duration-300 ease-in-out ${
                inTab
                  ? 'opacity-100 translate-x-0 delay-150'
                  : 'opacity-0 translate-x-3 pointer-events-none'
              }`}
            >
              <NavLink
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  goBack();
                }}
                className="nav-back"
              >
                cd ..
              </NavLink>
              {localLinks.length > MAX_INLINE_SUB ? (
                <SubMenu key={view} label={`ls ${view}/`} links={localLinks} />
              ) : (
                localLinks.map((l) => (
                  <NavLink
                    key={l.href}
                    href={l.href}
                    onClick={(e) => {
                      if (!isPlainClick(e)) return;
                      e.preventDefault(); // chỉ cuộn tới mục, không thêm #anchor vào URL
                      scrollToAnchor(l.href);
                    }}
                  >
                    {l.label}
                  </NavLink>
                ))
              )}
              {localLinks.length > 0 && (
                <span className="h-4 border-l border-dashed border-line mx-1" aria-hidden="true" />
              )}
              {jumpLinks.map((l) => (
                <NavLink
                  key={l.href}
                  href={realHref(l)}
                  onClick={(e) => {
                    if (!isPlainClick(e)) return;
                    e.preventDefault();
                    onNavigate(l.tab || 'home', l.tab ? undefined : l.href);
                  }}
                  className="opacity-70 hover:opacity-100"
                >
                  ../{l.label}
                </NavLink>
              ))}
            </div>
            <span className={`nav-more-dot ${inTab && subHasMore ? 'is-visible' : ''}`} aria-hidden="true" />
          </div>

          <div className="ml-auto">
            <ThemeToggleTorch theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </nav>

      {/* vùng sát mép trái màn hình — tách riêng, không nằm trong nav. Chỉ
          desktop (md trở lên), lúc bình thường trong suốt hoàn toàn; rê
          chuột vào mới hiện nút ScrollArrow (mờ dần + phóng to + trượt vào,
          đúng hiệu ứng vòng tròn/icon trượt gốc) kèm đổi cursor. Mobile giữ
          nguyên, không đụng. */}
      <div
        aria-hidden="true"
        className={`edge-back-zone group hidden md:flex items-center fixed left-0 top-14 bottom-0 w-16 z-40 ${
          inTab ? '' : 'pointer-events-none'
        }`}
      >
        <div
          className={`pl-3 transition-all duration-300 ease-out ${
            inTab
              ? 'opacity-0 scale-75 -translate-x-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0'
              : 'opacity-0 scale-75 -translate-x-2'
          }`}
        >
          <ScrollArrow rotate={0} ariaLabel="Go back" onClick={goBack} />
        </div>
      </div>
    </>
  );
}