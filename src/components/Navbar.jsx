import { useEffect, useRef, useState } from 'react';
import ThemeToggleTorch from './ThemeToggleTorch.jsx';
import ScrollArrow from './ScrollArrow.jsx';
import './NavLink.css';

// mỗi mục ở nav chính: nếu có "tab" nghĩa là bấm vào sẽ chuyển sang 1 trang
// riêng (trượt sang nav phụ); không có "tab" thì chỉ là link cuộn trong
// trang chính như bình thường.
const mainLinks = [
  { href: '#about', label: 'about.js', tab: 'about' },
  { href: '#projects', label: 'projects/', tab: 'projects' },
  { href: '#feedback', label: 'feedback.sh' },
  { href: '#socials', label: 'socials/' },
];

// mục con bên trong từng tab (cuộn ngay trong trang đó, không đổi view)
const localLinksByTab = {
  about: [
    { href: '#about-intro', label: 'about.js' },
    { href: '#about-journey', label: 'log.sh' },
    { href: '#about-skills', label: 'skills.js' },
  ],
  projects: [],
};

function NavLink({ href, onClick, className = '', children }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`nav-link shrink-0 px-3 py-1.5 font-mono text-[13px] text-dim hover:text-amber ${className}`}
    >
      <span className="nav-link-text whitespace-nowrap">{children}</span>
    </a>
  );
}

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
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
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
  const localLinks = localLinksByTab[view] || [];
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

          <div className="hidden md:flex relative h-full items-center min-w-0 flex-1">
            {/* nav chính — trượt ra bên trái khi vào tab, trượt vào (trễ 150ms) khi quay lại */}
            <div
              ref={mainRowRef}
              className={`nav-scroll flex items-center gap-1.5 w-full overflow-x-auto transition-all duration-300 ease-in-out ${
                inTab
                  ? 'opacity-0 -translate-x-3 pointer-events-none'
                  : 'opacity-100 translate-x-0 delay-150'
              }`}
            >
              {mainLinks.map((l) => (
                <NavLink
                  key={l.href}
                  href={l.href}
                  onClick={(e) => {
                    if (l.tab) {
                      e.preventDefault();
                      onNavigate(l.tab);
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
              className={`nav-scroll flex items-center gap-1.5 absolute left-0 top-0 h-full w-full overflow-x-auto transition-all duration-300 ease-in-out ${
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
              <NavLink
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  goHome();
                }}
              >
                ~/home
              </NavLink>
              {localLinks.map((l) => (
                <NavLink key={l.href} href={l.href}>
                  {l.label}
                </NavLink>
              ))}
              {localLinks.length > 0 && (
                <span className="h-4 border-l border-dashed border-line mx-1" aria-hidden="true" />
              )}
              {jumpLinks.map((l) => (
                <NavLink
                  key={l.href}
                  href={l.href}
                  onClick={(e) => {
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