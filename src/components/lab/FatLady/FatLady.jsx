import { useEffect, useRef, useState } from 'react';

// "I Love You Like A Fat Lady Loves Apples" - Valentine's Day Flash piece của Geoffrey Lillemon × Random Studio (2013).
// Bản lưu trữ: https://theuselessweb.com/sites-we-lost/iloveyoulikeafatladylovesapples/
// Chạy file gốc FatLady.swf (đặt ở public/swf/FatLady.swf) bằng Ruffle, không sửa nội dung game.
const BASE = import.meta.env.BASE_URL;
const SWF = `${BASE}swf/FatLady.swf`;
const RUFFLE = `${BASE}ruffle/ruffle.js`;

// Ruffle tự đăng ký vào window.RufflePlayer khi script chạy; chỉ nạp 1 lần cho cả trang
let ruffleReady;
function loadRuffle() {
  if (window.RufflePlayer?.newest) return Promise.resolve();
  ruffleReady ??= new Promise((resolve, reject) => {
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = { ...window.RufflePlayer.config, publicPath: `${BASE}ruffle/` };
    const s = document.createElement('script');
    s.src = RUFFLE;
    s.onload = resolve;
    s.onerror = () => {
      ruffleReady = undefined;
      reject(new Error('ruffle'));
    };
    document.head.appendChild(s);
  });
  return ruffleReady;
}

export default function FatLady() {
  const host = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let player;
    let dead = false;
    (async () => {
      try {
        const head = await fetch(SWF, { method: 'HEAD' });
        // dev server/GitHub Pages trả 404 (hoặc index.html) khi chưa có file
        if (!head.ok || (head.headers.get('content-type') || '').includes('text/html')) throw new Error('swf');
        await loadRuffle();
        if (dead) return;
        const ruffle = window.RufflePlayer.newest();
        player = ruffle.createPlayer();
        player.style.width = '100%';
        player.style.height = '100%';
        host.current.appendChild(player);
        player.config = {
          letterbox: 'on',
          splashScreen: false,
          contextMenu: 'off',
          showSwfDownload: false,
          openUrlMode: 'deny',
        };
        await player.ruffle().load(SWF);
        if (!dead) setStatus('ready');
      } catch {
        if (!dead) setStatus('error');
      }
    })();
    return () => {
      dead = true;
      player?.remove();
    };
  }, []);

  return (
    <div className="w-full">
      <div
        ref={host}
        className="relative w-full overflow-hidden rounded-[10px] border border-line bg-white"
        style={{ height: 'min(72vh, 600px)' }}
      >
        {status !== 'ready' && (
          <p className="absolute inset-0 grid place-items-center m-0 px-6 text-center font-mono text-[13px] text-dim">
            {status === 'loading' ? '// loading flash…' : '// FatLady.swf not found: put it in public/swf/'}
          </p>
        )}
      </div>
      <p className="font-mono text-[12px] text-dim mt-3">
        {'// by Geoffrey Lillemon × Random Studio · '}
        <a
          className="underline"
          href="https://theuselessweb.com/sites-we-lost/iloveyoulikeafatladylovesapples/"
          target="_blank"
          rel="noopener noreferrer"
        >
          preserved on The Useless Web
        </a>
      </p>
    </div>
  );
}
