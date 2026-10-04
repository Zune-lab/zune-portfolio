import { useEffect, useState } from 'react';
import Btn31 from '../ui/Btn31/Btn31.jsx';
import ContactButton from './ContactButton/ContactButton.jsx';
import SheetCard from './SheetCard.jsx';
import { scrollToAnchor } from '../../lib/dom.js';
import HeroWorm from './HeroWorm.jsx';

// Dòng thứ 2 tự gõ - xoá - gõ lại các câu về Zune. Lần đầu hiện đủ câu đầu (không bị trống lúc tải trang),
// ~3 giây sau mới bắt đầu xoay vòng. Bật "giảm chuyển động" thì đứng yên ở câu đầu.
const PHRASES = ['I code for fun.', 'I fix 3am bugs.', 'I play with CSS.', 'I make tiny pages.'];

function Typewriter() {
  const [text, setText] = useState(PHRASES[0]);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let dead = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      let i = 0;
      await sleep(2800);
      while (!dead) {
        for (let n = PHRASES[i].length - 1; n >= 0 && !dead; n--) {
          setText(PHRASES[i].slice(0, n));
          await sleep(32);
        }
        i = (i + 1) % PHRASES.length;
        await sleep(280);
        for (let n = 1; n <= PHRASES[i].length && !dead; n++) {
          setText(PHRASES[i].slice(0, n));
          await sleep(75);
        }
        await sleep(2600);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  return (
    <>
      {text}
      <span className="term-cursor inline-block w-[0.5em] h-[0.8em] ml-2 align-baseline" />
    </>
  );
}

export default function Hero({ onNavigate }) {
  return (
    <header className="hero-full">
      <HeroWorm />
      <div className="wrap relative z-[1] max-w-[1040px] w-full mx-auto px-8 pt-10 pb-24">
        <h1 className="hero-title" aria-label="Hi, I'm Zune. I code for fun.">
          <span aria-hidden="true">
            Hi, I'm{' '}
            <span className="text-amber zune-glow">
              {[...'Zune'].map((ch, n) => (
                <span key={n} className="zune-letter">
                  {ch}
                </span>
              ))}
            </span>
            .<br />
            <Typewriter />
          </span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.05fr] gap-10 md:gap-14 mt-9 items-start">
          <div>
            <p className="text-ink text-lg leading-relaxed max-w-[440px]">
              I love messing around with CSS and building tiny pages just to see if they work.
            </p>
            <p className="font-mono text-[13px] text-dim mt-4">// introvert by default. say hi anyway →</p>
            <div className="flex gap-3.5 mt-8 flex-wrap items-center">
              <Btn31 onClick={() => scrollToAnchor('#featured')}>view projects</Btn31>
              <ContactButton href="#socials" />
            </div>
          </div>
          <SheetCard />
        </div>
      </div>

      <div className="absolute z-[1] inset-x-0 bottom-0 wrap max-w-[1040px] mx-auto w-full px-8 pb-8 flex items-end justify-between">
        <a href="#terminal" className="hero-link"
          onClick={(e) => { e.preventDefault(); scrollToAnchor('#terminal'); }}>
          Scroll to continue ↓
        </a>
        <a href="#projects" className="hero-link"
          onClick={(e) => { e.preventDefault(); onNavigate?.('projects'); }}>
          Projects ↗
        </a>
      </div>
    </header>
  );
}
