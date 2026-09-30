import { useEffect, useRef, useState } from 'react';
import Preloader from './components/Preloader.jsx';
import Loader from './components/Loader.jsx';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import { Stats, Support } from './components/StatsSupport.jsx';
import Feedback from './components/Feedback.jsx';
import Socials from './components/Socials.jsx';
import { Signature, Footer } from './components/Signature.jsx';
import BackToTop from './components/BackToTop.jsx';
import { PAGES, HOME_TITLE, pageOf, pathOf, viewFromLocation } from './pages.js';
import { timeOfDay } from './lib/vnTime.js';

// bao lâu thì hiện Loader khi chuyển tab (chỉ để người dùng kịp thấy hiệu
// ứng — bản thân việc đổi view là tức thì, không có gì thật sự cần tải)
const TAB_LOADER_MS = 450;

export default function App() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  );
  const [view, setView] = useState(viewFromLocation); // 'home' | id trong PAGES (src/pages.js)
  const [pendingScroll, setPendingScroll] = useState(null); // string selector | number Y | null
  const [isLoading, setIsLoading] = useState(false);
  const savedHomeScroll = useRef(0);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('zune-theme', theme);
  }, [theme]);

  // sau khi view đổi sang 'home', cuộn tới đích đang chờ: 1 selector cụ thể
  // (vd '#feedback' khi nhảy thẳng từ tab khác) hoặc vị trí cũ đã lưu lại.
  useEffect(() => {
    if (view !== 'home' || pendingScroll == null) return;
    if (typeof pendingScroll === 'string') {
      const el = document.querySelector(pendingScroll);
      if (el) el.scrollIntoView({ block: 'start' });
    } else {
      window.scrollTo({ top: pendingScroll });
    }
    setPendingScroll(null);
  }, [view, pendingScroll]);

  useEffect(() => {
    document.title = pageOf(view)?.title ?? HOME_TITLE;
  }, [view]);

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
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // nền chấm bi sáng quanh con trỏ (CSS đọc --mx/--my)
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty('--mx', e.clientX + 'px');
        root.style.setProperty('--my', e.clientY + 'px');
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

  // nextView: 'home' | 'about' | 'projects'.
  // scrollTarget (tùy chọn): css selector cần cuộn tới sau khi về home (vd
  // '#feedback' khi bấm link nhảy thẳng). Không truyền thì:
  //  - về 'home': khôi phục đúng vị trí đã cuộn trước khi rời trang chính
  //  - sang tab khác: luôn bắt đầu từ đầu trang
  // Mọi lần chuyển tab đều hiện Loader trong TAB_LOADER_MS trước khi đổi
  // nội dung — trừ lần load trang chính đầu tiên, đã có Preloader riêng.
  // push=false khi chuyển do nút Back/Forward (URL đã đúng sẵn, không ghi thêm lịch sử).
  const goTo = (nextView, scrollTarget, push = true) => {
    if (nextView === viewRef.current) return;

    setIsLoading(true);
    window.setTimeout(() => {
      if (viewRef.current === 'home' && nextView !== 'home') {
        savedHomeScroll.current = window.scrollY;
      }
      if (push) {
        // về home kèm anchor (vd '#feedback') thì giữ anchor trong URL, còn lại URL sạch
        const hash = nextView === 'home' && typeof scrollTarget === 'string' ? scrollTarget : '';
        history.pushState(null, '', pathOf(nextView) + hash);
      }
      setView(nextView);
      if (nextView === 'home') {
        setPendingScroll(scrollTarget ?? savedHomeScroll.current);
      } else {
        window.scrollTo({ top: 0 });
      }
      setIsLoading(false);
    }, TAB_LOADER_MS);
  };
  const handleNavigate = (nextView, scrollTarget) => goTo(nextView, scrollTarget, true);

  const page = pageOf(view);

  return (
    <>
      <Preloader />
      {isLoading && <Loader />}
      <Navbar theme={theme} onToggleTheme={toggleTheme} view={view} onNavigate={handleNavigate} />

      {page ? (
        <page.Component />
      ) : (
        <>
          <Hero onNavigate={handleNavigate} />
          <Stats />
          <Support />
          <Feedback />
          <Socials />
        </>
      )}

      <Signature />
      <Footer />
      <BackToTop />
    </>
  );
}