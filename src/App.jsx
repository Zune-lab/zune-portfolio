import { Suspense, useEffect, useRef, useState } from 'react';
import Preloader from './components/layout/Preloader/Preloader.jsx';
import ErrorBoundary from './components/layout/ErrorBoundary.jsx';
import Loader from './components/layout/Loader/Loader.jsx';
import Navbar from './components/layout/Navbar/Navbar.jsx';
import Hero from './components/home/Hero.jsx';
import { FeaturedProjects, AboutTeaser, LabTeaser, TerminalSection } from './components/home/HomeSections.jsx';
import Contact from './components/home/Contact.jsx';
import { Signature, Footer } from './components/layout/Signature/Signature.jsx';
import { emitReaction } from './lib/reactions.js';
import { startShakeWatch } from './lib/shake.js';
import Ambient from './components/layout/Ambient/Ambient.jsx';
import BackToTop from './components/layout/BackToTop/BackToTop.jsx';
import Alive from './components/layout/Alive/Alive.jsx';
import { pageOfView, titleOf, topOf, viewFromLocation } from './config/pages.js';
import { pathOf } from './lib/paths.js';
import { storageSet } from './lib/storage.js';
import { storageKey } from './config/site.js';
import { canHover, prefersReducedMotion } from './lib/env.js';
import { timeOfDay } from './lib/siteTime.js';
import { pausableInterval } from './lib/timers.js';
import { syncThemeColor, syncThemeNow } from './lib/themeSync.js';
import { forcedTheme, refreshAuto, rememberTheme, skinToast, subscribeSkin } from './lib/skin.js';
import { skinById } from './config/skins.js';
import SkinFx from './components/layout/Skin/SkinFx.jsx';
import Cameo from './components/layout/Cameo/Cameo.jsx';
import SkinPalette from './components/layout/Skin/SkinPalette.jsx';
import SkinToast from './components/layout/Skin/SkinToast.jsx';

// bao lâu thì hiện Loader khi chuyển tab (chỉ để người dùng kịp thấy hiệu
// ứng — bản thân việc đổi view là tức thì, không có gì thật sự cần tải)
const TAB_LOADER_MS = 450;

export default function App() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  );
  const [paletteOpen, setPaletteOpen] = useState(false); // bảng chọn skin (Ctrl+K / nút ở navbar)
  const [view, setView] = useState(viewFromLocation); // 'home' | id trong PAGES (src/config/pages.js) | '<id>/<con>' vd 'lab/snake'
  const [pendingScroll, setPendingScroll] = useState(null); // string selector | number Y | null
  const [isLoading, setIsLoading] = useState(false);
  const savedHomeScroll = useRef(0);
  const navTimer = useRef(0);
  const glowRef = useRef(null);
  const themeTimer = useRef(0);
  const mainRef = useRef(null);
  const firstView = useRef(true);
  const viewRef = useRef(view);
  viewRef.current = view;

  // lắc chuột mạnh thì nhân vật giật mình (lib/shake.js kêu 'shake' trên bus phản ứng)
  useEffect(() => startShakeWatch(), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    syncThemeColor();
    // theme bị skin ÉP (vd skin chỉ có chế độ tối) thì không phải lựa chọn của người dùng: không ghi đè, để lúc quay lại skin có cả hai vẫn đúng ý
    if (!forcedTheme()) {
      rememberTheme(theme);
      storageSet(storageKey('theme'), theme); // storage bị chặn: vẫn đổi theme được, chỉ không nhớ lại lần sau
    }
  }, [theme]);

  // skin đổi (chọn, xem thử, 'auto' theo giờ) có thể ép theo data-theme: kéo state `theme` (công tắc đèn pin) theo cho khớp
  useEffect(
    () =>
      subscribeSkin(() => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')),
    []
  );

  // Ctrl/Cmd + K mở / đóng bảng chọn skin
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'k') return;
      e.preventDefault(); // chiếm phím tắt "tìm kiếm" của trình duyệt trong trang này
      setPaletteOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // sau khi view đổi sang 'home', cuộn tới đích đang chờ: 1 selector cụ thể
  // (vd '#contact' khi nhảy thẳng từ tab khác) hoặc vị trí cũ đã lưu lại.
  useEffect(() => {
    if (view !== 'home' || pendingScroll == null) return;
    if (typeof pendingScroll === 'string') {
      const el = document.querySelector(pendingScroll);
      if (el) el.scrollIntoView({ block: 'start' });
    } else {
      window.scrollTo({ top: pendingScroll, behavior: 'instant' }); // không trượt từ từ: html có scroll-behavior: smooth
    }
    setPendingScroll(null);
  }, [view, pendingScroll]);

  useEffect(() => {
    document.title = titleOf(view);
    // đổi trang -> đưa focus vào nội dung (trừ lần tải đầu), người dùng bàn phím / đọc màn hình không bị kẹt ở nav cũ
    if (firstView.current) firstView.current = false;
    else mainRef.current?.focus({ preventScroll: true });
  }, [view]);

  // mở thẳng địa chỉ có #anchor của trang chính (vd Ctrl+click "contact.sh" ra tab mới):
  // cuộn tới mục đó rồi bỏ #anchor khỏi thanh địa chỉ cho gọn
  useEffect(() => {
    const id = location.hash.replace(/^#/, '');
    if (!id || viewFromLocation() !== 'home') return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
      history.replaceState(null, '', pathOf('home'));
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // nút Back/Forward của trình duyệt: đọc lại view từ URL, KHÔNG pushState lại
  useEffect(() => {
    history.scrollRestoration = 'manual'; // tự quản lý cuộn, tránh trình duyệt cuộn chen vào lúc đang chuyển tab
    // URL lạ (/zune-portfolio/abc) hoặc thiếu dấu '/' -> chuẩn hoá về đúng trang
    const canonical = pathOf(viewFromLocation());
    if (location.pathname.replace(/\/+$/, '') !== canonical.replace(/\/+$/, '')) {
      history.replaceState(null, '', canonical + location.hash);
    }
    const onPop = () => goTo(viewFromLocation(), undefined, false);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.clearTimeout(navTimer.current);
    };
  }, []);

  // nền chấm bi sáng quanh con trỏ (CSS đọc --mx/--my)
  useEffect(() => {
    const glow = glowRef.current;
    if (!glow || !canHover()) return; // cảm ứng: không cần theo dõi con trỏ
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        glow.style.setProperty('--mx', e.clientX + 'px');
        glow.style.setProperty('--my', e.clientY + 'px');
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
    };
  }, []);

  // tông nền theo giờ VN: dawn / day / dusk / night (mốc dùng chung với trạng thái online)
  useEffect(() => {
    const apply = () => {
      const root = document.documentElement;
      const next = timeOfDay();
      if (root.dataset.tod === next) return;
      swapColors(() => {
        root.dataset.tod = next;
      });
      refreshAuto(); // skin 'auto' đổi theo buổi trong ngày
    };
    apply();
    return pausableInterval(apply, 60 * 1000); // ngủ hẳn lúc screensaver / tab ẩn, dậy thì áp lại ngay
  }, []);

  // Đổi màu cả trang (theme sáng/tối hoặc tông giờ) TỨC THÌ và đồng bộ: mọi phần tử + canvas cùng đổi trong một khung hình.
  // Trước đây biến màu chuyển dần 0.6s -> mỗi khung phải tính lại style/vẽ lại cả trang, máy yếu còn ~4-5 khung/giây nên các mảng
  // (khung, link nav, canvas...) đổi màu so le, nhìn như "trễ màu" (số đo: xem index.css).
  //  - theme-anim chặn transition riêng của từng phần tử (transition-colors, border-color...) đúng khoảnh khắc đổi;
  //  - syncThemeNow() cho canvas đọc màu mới ngay (không trễ khung nào);
  //  - chỉ có MỘT timer gỡ class: bấm đổi liên tiếp thì timer cũ bị huỷ, không gỡ nhầm giữa chừng.
  const swapColors = (change) => {
    const root = document.documentElement;
    window.clearTimeout(themeTimer.current);
    root.classList.add('theme-anim');
    change();
    syncThemeNow();
    syncThemeColor();
    themeTimer.current = window.setTimeout(() => root.classList.remove('theme-anim'), 120);
  };
  const toggleTheme = () => {
    const locked = forcedTheme();
    if (locked) {
      // skin chỉ có một chế độ: công tắc không đổi được, nói rõ lý do thay vì im lặng
      skinToast({ text: `${skinById(document.documentElement.dataset.skin)?.label} is ${locked}-only. open skins (Ctrl+K) for one with both.` });
      return;
    }
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    swapColors(() => {
      document.documentElement.dataset.theme = next;
    });
    setTheme(next);
    emitReaction('theme', next);
  };

  // nextView: 'home' | 'about' | 'projects' | 'lab' | 'lab/<slug>'.
  // scrollTarget (tùy chọn): css selector cần cuộn tới sau khi về home (vd
  // '#contact' khi bấm link nhảy thẳng). Không truyền thì:
  //  - về 'home': khôi phục đúng vị trí đã cuộn trước khi rời trang chính
  //  - sang tab khác: luôn bắt đầu từ đầu trang
  // Mọi lần chuyển tab đều hiện Loader trong TAB_LOADER_MS trước khi đổi
  // nội dung — trừ lần load trang chính đầu tiên, đã có Preloader riêng.
  // push=false khi chuyển do nút Back/Forward (URL đã đúng sẵn, không ghi thêm lịch sử).
  // Bấm liên tiếp nhiều tab: huỷ lượt chờ trước, chỉ giữ đích cuối cùng (trước đây các lượt
  // chồng nhau, loader tắt sớm và pushState bị ghi nhiều lần). Bấm lại đúng trang đang đứng
  // trong lúc đang chờ thì coi như huỷ chuyển trang.
  const goTo = (nextView, scrollTarget, push = true) => {
    const pending = navTimer.current;
    window.clearTimeout(pending);
    navTimer.current = 0;
    if (nextView === viewRef.current) {
      if (pending) setIsLoading(false);
      return;
    }

    // đổi mục trong cùng 1 trang (vd lưới lab <-> lab/snake): chuyển ngay, không hiện Loader
    const sameTab = nextView !== 'home' && viewRef.current !== 'home' && topOf(nextView) === topOf(viewRef.current);
    if (!sameTab && !prefersReducedMotion()) setIsLoading(true);
    // start downloading the target page's code right away; the swap waits for BOTH the loader time and the chunk
    // (a failed preload is ignored here: the ErrorBoundary shows the retry UI once the page tries to render)
    const preloaded = pageOfView(nextView)?.preload?.().catch(() => {});
    const swap = () => {
      navTimer.current = 0;
      if (viewRef.current === 'home' && nextView !== 'home') {
        savedHomeScroll.current = window.scrollY;
      }
      if (push) {
        // về home kèm mục (vd '#contact') vẫn cuộn tới đó nhưng URL giữ sạch, không thêm #anchor
        history.pushState({ from: viewRef.current }, '', pathOf(nextView)); // `from`: để nút back của Navbar biết có lùi thật được không
      }
      setView(nextView);
      emitReaction('navigate', nextView);
      if (nextView === 'home') {
        setPendingScroll(scrollTarget ?? savedHomeScroll.current);
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      setIsLoading(false);
    };
    const wait = sameTab || prefersReducedMotion() ? 0 : TAB_LOADER_MS;
    const id = window.setTimeout(() => {
      // a newer click replaced this navigation while the chunk was downloading -> drop this one
      if (navTimer.current !== id) return;
      if (!preloaded) return swap();
      preloaded.then(() => {
        if (navTimer.current === id) swap();
      });
    }, wait);
    navTimer.current = id;
  };
  const handleNavigate = (nextView, scrollTarget) => goTo(nextView, scrollTarget, true);

  const page = pageOfView(view);

  return (
    <>
      <SkinFx />
      <Cameo view={view} onNavigate={handleNavigate} onToggleTheme={toggleTheme} onOpenSkins={() => setPaletteOpen(true)} />
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <Preloader />
      <Loader show={isLoading} />
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus(); // không thêm #main vào URL
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-panel focus:text-ink focus:border focus:border-amber font-mono text-[13px]">
        skip to content
      </a>
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSkins={() => setPaletteOpen(true)}
        view={view}
        onNavigate={handleNavigate}
      />

      <main id="main" ref={mainRef} tabIndex={-1} className="outline-hidden">
      <ErrorBoundary key={view} inline>
      {page ? (
        <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
          <page.Component view={view} onNavigate={handleNavigate} />
        </Suspense>
      ) : (
        <>
          <Hero onNavigate={handleNavigate} />
          <TerminalSection onNavigate={handleNavigate} />
          <FeaturedProjects onNavigate={handleNavigate} />
          <AboutTeaser onNavigate={handleNavigate} />
          <LabTeaser onNavigate={handleNavigate} />
          <Contact />
        </>
      )}
      </ErrorBoundary>
      </main>

      <Signature />
      <Footer />
      <Ambient />
      <BackToTop />
      <Alive />
      <SkinPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <SkinToast />
    </>
  );
}
