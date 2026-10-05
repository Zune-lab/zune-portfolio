import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ThemeToggleTorch from '../ThemeToggleTorch/ThemeToggleTorch.jsx';
import ScrollArrow from '../ScrollArrow/ScrollArrow.jsx';
import { PAGES, pageOfView, topOf } from '../../../config/pages.js';
import { pathOf } from '../../../lib/paths.js';
import { isPlainClick, scrollToAnchor } from '../../../lib/dom.js';
import { hasFinePointer } from '../../../lib/env.js';
import useHideOnScroll from '../../../lib/useHideOnScroll.js';
import './Navbar.css';
import { site } from '../../../config/site.js';

// chữ lăn từ handle sang "cd ~/" (5 ký tự): dấu } phải trượt ngược đúng số ký tự handle dài hơn "cd ~/" (xem .brand-close ở Navbar.css)
const BRAND_SHRINK = Math.max(0, site.handle.length - 'cd ~/'.length);

// mỗi mục ở nav chính: có "tab" = 1 trang riêng (có địa chỉ riêng, khai báo ở
// src/config/pages.js); không có "tab" thì chỉ là link cuộn trong trang chính.
const mainLinks = [
  ...PAGES.map((p) => ({ href: `#${p.id}`, label: p.label, tab: p.id })),
  { href: '#feedback', label: 'feedback.sh' },
  { href: '#socials', label: 'socials/' },
];

// href THẬT của link: trang riêng -> /zune-portfolio/<id>; anchor -> trang chính + #anchor.
// Nhờ vậy Ctrl+click / chuột giữa / "mở trong tab mới" ra đúng trang, không chỉ #about.
const realHref = (l) => (l.tab ? pathOf(l.tab) : pathOf('home') + l.href);

function NavLink({ as: Tag = 'a', href, onClick, className = '', linkRef, children, ...rest }) {
  return (
    <Tag
      ref={linkRef}
      href={Tag === 'a' ? href : undefined}
      type={Tag === 'button' ? 'button' : undefined}
      onClick={onClick}
      {...rest}
      className={`nav-link shrink-0 px-3 py-1.5 font-mono text-[13px] text-dim hover:text-amber ${className}`}
    >
      <span className="nav-link-text whitespace-nowrap">{children}</span>
    </Tag>
  );
}

// nav phụ có nhiều mục (vd lab có cả chục game) thì gom vào 1 menu thả xuống `ls <trang>/`
// thay vì xếp hết ra hàng ngang. Menu vẽ qua portal (ra <body>) vì hàng nav có
// overflow-x + backdrop-filter nên sẽ cắt / lệch mất menu nếu đặt bên trong.
const MAX_INLINE_SUB = 3;
const MENU_W = 220;
const HOVER_CLOSE_MS = 160; // trễ nhẹ khi rời nút để kịp di chuột sang menu mà không bị đóng

// chỉ chuột thật mới kích hoạt hover; cảm ứng vẫn dùng cú chạm (click) để bật/tắt
const mouseOnly = (fn) => (e) => {
  if (e.pointerType === 'mouse') fn();
};

// rê chuột vào là mở, rời ra là đóng; chạm (cảm ứng) hoặc Enter (bàn phím) thì bật/tắt như nút thường.
function SubMenu({ label, links, onSelect }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimer = useRef(0);
  const focusOnOpen = useRef(false); // mở bằng bàn phím -> chuyển focus vào menu

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (open && focusOnOpen.current) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    focusOnOpen.current = false;
  }, [open]);

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

  const show = () => {
    clearTimeout(closeTimer.current);
    if (open) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom - 2, left: Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8)) });
    setOpen(true);
  };
  const hideSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  };
  const keepOpen = () => clearTimeout(closeTimer.current);

  const onTriggerClick = (e) => {
    e.preventDefault();
    // click bằng chuột: menu đã mở sẵn nhờ hover, bấm vào đừng làm nó đóng lại
    if (e.detail > 0 && hasFinePointer()) return show();
    if (open) setOpen(false);
    else {
      focusOnOpen.current = e.detail === 0; // Enter / Space trên nút
      show();
    }
  };

  // mũi tên trên nút mở menu + điều hướng trong menu (Up/Down/Home/End, Esc trả focus về nút, Tab đóng)
  const onTriggerKeyDown = (e) => {
    // Enter / Space: <button> tự phát click (detail = 0) -> onTriggerClick xử lý, không cần bắt riêng nữa
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    focusOnOpen.current = true;
    if (open) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    else show();
  };
  const onMenuKeyDown = (e) => {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    const go = (n) => {
      e.preventDefault();
      items[(n + items.length) % items.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else if (e.key === 'Escape') {
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === 'Tab') {
      // menu nằm cuối <body> (portal): trả focus về nút rồi để Tab đi tiếp từ đó, không nhảy xuống cuối trang
      btnRef.current?.focus();
      setOpen(false);
    }
  };

  return (
    <>
      <NavLink
        as="button"
        linkRef={btnRef}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
        onPointerEnter={mouseOnly(show)}
        onPointerLeave={mouseOnly(hideSoon)}
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
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={onMenuKeyDown}
            className="sub-menu"
            style={{ top: pos.top, left: pos.left, width: MENU_W }}
            onPointerEnter={mouseOnly(keepOpen)}
            onPointerLeave={mouseOnly(hideSoon)}
          >
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                role="menuitem"
                tabIndex={-1}
                className="sub-menu-item"
                onClick={(e) => {
                  if (!isPlainClick(e)) return;
                  e.preventDefault(); // chỉ cuộn tới mục, không thêm #anchor vào URL
                  setOpen(false);
                  onSelect(l);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are passed in by the caller
  }, deps);

  return [ref, hasMore];
}

// ngăn xếp các "view" đã ghé qua, chỉ để phục vụ nút back (cd .. / mũi tên
// mép trái). Stack chỉ được cập nhật khi `view` thật sự đổi (effect bên dưới), nên
// các trường hợp view không đổi (bấm back lúc đang ở home, App huỷ lượt chuyển...) không
// để lại cờ "bỏ qua" treo sang lần chuyển trang kế tiếp như trước.
//  - view trùng phần tử ngay dưới đỉnh stack -> là lùi 1 bước (kể cả nút Back của trình duyệt): pop
//  - về home -> xoá sạch stack
//  - view con (vd lab/snake) -> đảm bảo trang cha nằm ngay dưới; đổi giữa các view con cùng cha thì thay đỉnh
//  - còn lại -> push
function useViewHistory(view, onNavigate) {
  const historyRef = useRef(['home']);

  useEffect(() => {
    const stack = historyRef.current;
    if (view === 'home') historyRef.current = ['home'];
    else if (stack[stack.length - 2] === view) stack.pop();
    else if (stack[stack.length - 1] !== view) {
      // view con (vd lab/snake): luôn có trang cha (lab) ngay dưới nó, để `cd ..` về lưới chứ không nhảy thẳng ra home.
      // Đổi qua lại giữa các view con cùng cha (prev/next, random) thì thay đỉnh stack, không chất thêm.
      const parent = topOf(view);
      const top = stack[stack.length - 1];
      if (parent === view) stack.push(view);
      else if (topOf(top) === parent && top !== parent) stack[stack.length - 1] = view;
      else {
        if (top !== parent) stack.push(parent);
        stack.push(view);
      }
    }
  }, [view]);

  const goBack = () => {
    const stack = historyRef.current;
    const target = stack.length > 1 ? stack[stack.length - 2] : 'home';
    // App ghi `from` (view trước đó) vào history.state mỗi lần pushState. Nếu mục lịch sử
    // liền trước đúng là đích thì lùi thật bằng history.back(), không chất thêm mục mới
    // (tránh vòng lặp lab/snake -> cd .. -> lab -> Back lại về snake).
    if (history.state?.from === target) history.back();
    else onNavigate(target);
  };

  // về thẳng trang chính, bỏ qua mọi trang đã ghé (khác goBack chỉ lùi 1 bước)
  const goHome = () => onNavigate('home');

  return { goBack, goHome };
}

export default function Navbar({ theme, onToggleTheme, view, onNavigate }) {
  const inTab = view !== 'home';
  const top = topOf(view); // 'lab/snake' -> 'lab'
  const upHref = pathOf(top !== view ? top : 'home'); // href thật của "cd .."
  const localLinks = pageOfView(view)?.sub || [];
  const { goBack, goHome } = useViewHistory(view, onNavigate);

  // link nhảy thẳng sang các mục khác ở nav chính, trừ mục đang đứng (tab hiện tại)
  const jumpLinks = mainLinks.filter((l) => l.tab !== top);

  const [mainRowRef, mainHasMore] = useMoreDot([inTab]);
  const [subRowRef, subHasMore] = useMoreDot([inTab, view]);

  // --- menu hamburger (màn hình < md, nơi nav ngang bị ẩn) ---
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerRef = useRef(null);
  const panelRef = useRef(null);
  // cuộn xuống -> nav trượt lên ẩn đi cho thấy rõ cả trang; cuộn lên / Tab vào nav / mở menu mobile -> hiện lại
  const [navHidden, showNav] = useHideOnScroll(menuOpen);

  // báo cho thanh nhịp tim (Alive/Pulse) biết navbar đang hiện hay ẩn: hiện thì nhịp tim nằm trên đường viền dưới navbar
  useEffect(() => {
    document.documentElement.dataset.nav = navHidden ? 'hidden' : 'shown';
  }, [navHidden]);

  useEffect(() => setMenuOpen(false), [view]); // đổi trang thì đóng menu

  // `inert` đặt qua DOM property: JSX `inert=""` chạy ở React 18 nhưng hỏng ở React 19 (chuỗi rỗng bị coi là false)
  useEffect(() => {
    if (mainRowRef.current) mainRowRef.current.inert = inTab;
    if (subRowRef.current) subRowRef.current.inert = !inTab;
  }, [inTab, mainRowRef, subRowRef]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!panelRef.current?.contains(e.target) && !burgerRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      burgerRef.current?.focus();
    };
    const wide = window.matchMedia('(min-width: 768px)'); // xoay ngang / kéo rộng cửa sổ: nav ngang hiện lại, menu thừa
    const onWide = (e) => e.matches && setMenuOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [menuOpen]);

  // xử lý bấm link dùng chung cho nav ngang (desktop) và menu hamburger (mobile)
  const clickMain = (l) => (e) => {
    if (!isPlainClick(e)) return;
    if (l.tab) {
      e.preventDefault();
      onNavigate(l.tab);
    } else if (view === 'home') {
      e.preventDefault(); // đang ở trang chính: chỉ cuộn tới mục, không thêm #anchor vào URL
      scrollToAnchor(l.href);
    }
  };
  // mục nav phụ: có `view` (vd lab/snake) -> chuyển sang view đó (địa chỉ thật); còn lại là anchor cuộn trong trang
  const selectSub = (l) => (l.view ? onNavigate(l.view) : scrollToAnchor(l.href));
  const clickSub = (l) => (e) => {
    if (!isPlainClick(e)) return;
    e.preventDefault(); // không thêm #anchor vào URL
    selectSub(l);
  };
  const clickJump = (l) => (e) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    onNavigate(l.tab || 'home', l.tab ? undefined : l.href);
  };
  const clickBack = (e) => {
    if (!isPlainClick(e)) return; // Ctrl/Cmd+click: để trình duyệt mở trang cha ở tab mới
    e.preventDefault();
    goBack();
  };
  const inMenu = (handler) => (e) => {
    handler(e);
    setMenuOpen(false);
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-50 border-b border-line backdrop-blur-md transition-transform duration-300 ease-in-out ${
          navHidden ? '-translate-y-full' : ''
        }`}
        style={{ background: 'var(--nav-bg)' }}
        onFocus={showNav}
      >
        <div className="wrap max-w-[1040px] mx-auto px-8 flex items-center gap-6 h-14">
          <a
            href={pathOf('home')}
            aria-label={`${site.handle} — back to home`}
            onClick={(e) => {
              if (!isPlainClick(e)) return;
              e.preventDefault();
              if (inTab) goHome();
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="brand font-mono text-sm flex items-center gap-2 cursor-pointer"
            style={{ '--brand-shrink': BRAND_SHRINK }}
          >
            {/* hover/focus: chấm → "{", chữ lăn sang "cd ~/", "}" trượt vào */}
            <span className="brand-mark" aria-hidden="true">
              <span className="brand-dot" />
              <b>{'{'}</b>
            </span>
            <span className="brand-word">
              <span className="brand-roll">
                <span>{site.handle}</span>
                <span aria-hidden="true">cd ~/</span>
              </span>
              <b className="brand-close" aria-hidden="true">{'}'}</b>
            </span>
          </a>

          <div className="hidden md:flex relative h-full items-center min-w-0 flex-1 pr-4">
            {/* nav chính — trượt ra bên trái khi vào tab, trượt vào (trễ 150ms) khi quay lại */}
            <div
              ref={mainRowRef}
              style={fadeRight(!inTab && mainHasMore)}
              className={`nav-scroll flex items-center gap-1.5 w-full overflow-x-auto transition-[opacity,transform] duration-300 ease-in-out ${
                inTab
                  ? 'opacity-0 -translate-x-3 pointer-events-none'
                  : 'opacity-100 translate-x-0 delay-150'
              }`}
            >
              {mainLinks.map((l) => (
                <NavLink
                  key={l.href}
                  href={realHref(l)}
                  onClick={clickMain(l)}
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
              className={`nav-scroll flex items-center gap-1.5 absolute left-0 right-4 top-0 h-full overflow-x-auto transition-[opacity,transform] duration-300 ease-in-out ${
                inTab
                  ? 'opacity-100 translate-x-0 delay-150'
                  : 'opacity-0 translate-x-3 pointer-events-none'
              }`}
            >
              <NavLink href={upHref} onClick={clickBack} className="nav-back">
                cd ..
              </NavLink>
              {localLinks.length > MAX_INLINE_SUB ? (
                <SubMenu key={top} label={`ls ${top}/`} links={localLinks} onSelect={selectSub} />
              ) : (
                localLinks.map((l) => (
                  <NavLink
                    key={l.href}
                    href={l.href}
                    onClick={clickSub(l)}
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
                  onClick={clickJump(l)}
                  className="opacity-70 hover:opacity-100"
                >
                  ../{l.label}
                </NavLink>
              ))}
            </div>
            <span className={`nav-more-dot ${inTab && subHasMore ? 'is-visible' : ''}`} aria-hidden="true" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              ref={burgerRef}
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? 'mobile-menu' : undefined}
              className={`burger inline-flex items-center justify-center md:hidden ${menuOpen ? 'is-open' : ''}`}
            >
              <span className="burger-bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>

            {/* menu thả xuống cho màn hình nhỏ: cùng danh sách link với nav ngang (home: nav chính; trong trang: cd .. + mục con + nhảy sang trang khác) */}
            {menuOpen && (
              <div id="mobile-menu" ref={panelRef} className="mobile-menu md:hidden">
                {inTab ? (
                  <>
                    <a href={upHref} onClick={inMenu(clickBack)} className="mobile-menu-link">
                      cd ..
                    </a>
                    {localLinks.length > 0 && <div className="mobile-menu-head">// {top}/</div>}
                    {localLinks.map((l) => (
                      <a key={l.href} href={l.href} onClick={inMenu(clickSub(l))} className="mobile-menu-link">
                        {l.label}
                      </a>
                    ))}
                    <div className="mobile-menu-head">// jump to</div>
                    {jumpLinks.map((l) => (
                      <a key={l.href} href={realHref(l)} onClick={inMenu(clickJump(l))} className="mobile-menu-link">
                        ../{l.label}
                      </a>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="mobile-menu-head">// ls ~/</div>
                    {mainLinks.map((l) => (
                      <a key={l.href} href={realHref(l)} onClick={inMenu(clickMain(l))} className="mobile-menu-link">
                        {l.label}
                      </a>
                    ))}
                  </>
                )}
              </div>
            )}

            <ThemeToggleTorch theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </nav>

      {/* vùng sát mép trái màn hình — tách riêng, không nằm trong nav. Chỉ
          màn rộng (xl trở lên — dưới đó nội dung sát mép trái sẽ bị dải này đè lên, bấm nhầm thành "back"), lúc bình thường trong suốt hoàn toàn; rê
          chuột vào mới hiện nút ScrollArrow (mờ dần + phóng to + trượt vào,
          đúng hiệu ứng vòng tròn/icon trượt gốc) kèm đổi cursor. Mobile giữ
          nguyên, không đụng. */}
      <div
        aria-hidden="true"
        className={`edge-back-zone group hidden xl:flex items-center fixed left-0 top-14 bottom-0 w-16 z-40 ${
          inTab ? '' : 'pointer-events-none'
        }`}
      >
        <div
          className={`pl-3 transition-[opacity,transform] duration-300 ease-out ${
            inTab
              ? 'opacity-0 scale-75 -translate-x-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0'
              : 'opacity-0 scale-75 -translate-x-2'
          }`}
        >
          <ScrollArrow ariaLabel="Go back" onClick={goBack} tabIndex={-1} />
        </div>
      </div>
    </>
  );
}
