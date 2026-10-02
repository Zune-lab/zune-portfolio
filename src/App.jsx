import { Suspense, useEffect, useRef, useState } from 'react';
import Preloader from './components/layout/Preloader.jsx';
import ErrorBoundary from './components/layout/ErrorBoundary.jsx';
import Loader from './components/layout/Loader.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Hero from './components/home/Hero.jsx';
import { Stats, Support } from './components/home/StatsSupport.jsx';
import Feedback from './components/home/Feedback.jsx';
import Socials from './components/home/Socials.jsx';
import { Signature, Footer } from './components/layout/Signature.jsx';
import BackToTop from './components/layout/BackToTop.jsx';
import { pageOfView, titleOf, topOf, viewFromLocation } from './config/pages.js';
import { pathOf } from './lib/paths.js';
import { storageSet } from './lib/storage.js';
import { timeOfDay } from './lib/vnTime.js';

// bao lâu thì hiện Loader khi chuyển tab (chỉ để người dùng kịp thấy hiệu
// ứng — bản thân việc đổi view là tức thì, không có gì thật sự cần tải)
const TAB_LOADER_MS = 450;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  );
  const [view, setView] = useState(viewFromLocation); // 'home' | id trong PAGES (src/config/pages.js) | '<id>/<con>' vd 'lab/snake'
  const [pendingScroll, setPendingScroll] = useState(null); // string selector | number Y | null
  const [isLoading, setIsLoading] = useState(false);
  const savedHomeScroll = useRef(0);
  const navTimer = useRef(0);
  const glowRef = useRef(null);
  const mainRef = useRef(null);
  const firstView = useRef(true);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f3ec' : '#0a0c10');
    storageSet('zune-theme', theme); // storage bị chặn: vẫn đổi theme được, chỉ không nhớ lại lần sau
  }, [theme]);

  // sau khi view đổi sang 'home', cuộn tới đích đang chờ: 1 selector cụ thể
  // (vd '#feedback' khi nhảy thẳng từ tab khác) hoặc vị trí cũ đã lưu lại.
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

  // mở thẳng địa chỉ có #anchor của trang chính (vd Ctrl+click "socials/" ra tab mới):
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
    if (!glow || !window.matchMedia('(hover: hover)').matches) return; // cảm ứng: không cần theo dõi con trỏ
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
      document.documentElement.dataset.tod = timeOfDay();
    };
    apply();
    const id = setInterval(apply, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  // nextView: 'home' | 'about' | 'projects' | 'lab' | 'lab/<slug>'.
  // scrollTarget (tùy chọn): css selector cần cuộn tới sau khi về home (vd
  // '#feedback' khi bấm link nhảy thẳng). Không truyền thì:
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
    if (!sameTab && !reducedMotion()) setIsLoading(true);
    navTimer.current = window.setTimeout(() => {
      navTimer.current = 0;
      if (viewRef.current === 'home' && nextView !== 'home') {
        savedHomeScroll.current = window.scrollY;
      }
      if (push) {
        // về home kèm mục (vd '#feedback') vẫn cuộn tới đó nhưng URL giữ sạch, không thêm #anchor
        history.pushState({ from: viewRef.current }, '', pathOf(nextView)); // `from`: để nút back của Navbar biết có lùi thật được không
      }
      setView(nextView);
      if (nextView === 'home') {
        setPendingScroll(scrollTarget ?? savedHomeScroll.current);
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      setIsLoading(false);
    }, sameTab || reducedMotion() ? 0 : TAB_LOADER_MS);
  };
  const handleNavigate = (nextView, scrollTarget) => goTo(nextView, scrollTarget, true);

  const page = pageOfView(view);

  return (
    <>
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <Preloader />
      {isLoading && <Loader />}
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus(); // không thêm #main vào URL
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-panel focus:text-ink focus:border focus:border-amber font-mono text-[13px]">
        skip to content
      </a>
      <Navbar theme={theme} onToggleTheme={toggleTheme} view={view} onNavigate={handleNavigate} />

      <main id="main" ref={mainRef} tabIndex={-1} className="outline-none">
      <ErrorBoundary key={view} inline>
      {page ? (
        <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
          <page.Component view={view} onNavigate={handleNavigate} />
        </Suspense>
      ) : (
        <>
          <Hero onNavigate={handleNavigate} />
          <Stats />
          <Support />
          <Feedback />
          <Socials />
        </>
      )}
      </ErrorBoundary>
      </main>

      <Signature />
      <Footer />
      <BackToTop />
    </>
  );
}
