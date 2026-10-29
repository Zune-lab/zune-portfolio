import { useEffect, useRef, useState } from 'react';
import Btn31 from '../ui/Btn31/Btn31.jsx';
import ContactButton from './ContactButton/ContactButton.jsx';
import SheetCard from './SheetCard.jsx';
import { scrollToAnchor } from '../../lib/dom.js';
import useSkin from '../../lib/useSkin.js';
import HeroLetters from './HeroLetters.jsx';
import { isPaused, onPauseChange } from '../../lib/nap.js';
import { prefersReducedMotion, sleep } from '../../lib/env.js';
import { observeVisible } from '../../lib/observe.js';
import { site } from '../../config/site.js';
import { WRAP } from '../../config/ui.js';
import { CONTACT } from '../../config/pages.js';
import HlArrow from '../ui/HlArrow.jsx';
import Scramble from '../ui/Scramble.jsx';

// Dòng thứ 2 tự gõ - xoá - gõ lại các câu về Zune. Lần đầu hiện đủ câu đầu (không bị trống lúc tải trang),
// ~3 giây sau mới bắt đầu xoay vòng. Bật "giảm chuyển động" thì đứng yên ở câu đầu.
const PHRASES = site.content.phrases; // khai báo ở config/site.js

function Typewriter() {
  const [text, setText] = useState(PHRASES[0]);
  const cursor = useRef(null);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let dead = false;
    let visible = true;
    const waiters = [];
    // hero cuộn khỏi màn hình, tab ẩn hoặc screensaver đang bật: đứng yên HẲN (chờ sự kiện, không còn hẹn giờ thăm dò mỗi 400ms), quay lại thì gõ tiếp
    const idle = () => !visible || isPaused();
    const wakeUp = () => {
      if (!idle()) waiters.splice(0).forEach((resolve) => resolve());
    };
    const offVisible = observeVisible(cursor.current, (v) => {
      visible = v;
      wakeUp();
    });
    const offPause = onPauseChange(wakeUp);
    const rest = () => (idle() && !dead ? new Promise((resolve) => waiters.push(resolve)) : Promise.resolve());
    (async () => {
      let i = 0;
      await sleep(2800);
      while (!dead) {
        await rest();
        if (dead) break;
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
      offVisible();
      offPause();
      waiters.splice(0).forEach((resolve) => resolve()); // để vòng async đang chờ thoát hẳn
    };
  }, []);

  return (
    <>
      {text}
      <span ref={cursor} className="term-cursor inline-block w-[0.5em] h-[0.8em] ml-2 align-baseline" />
    </>
  );
}

export default function Hero({ onNavigate }) {
  const { skin } = useSkin();
  const next = skin === 'retro-os' ? '#featured' : '#terminal'; // retro-os không có khung terminal (Clippy thay), nên cuộn thẳng tới mục kế tiếp
  const [toys, setToys] = useState(null); // chỗ đặt gợi ý + nút của sân chữ (HeroLetters), ở khoảng trống bên trái
  return (
    <header className="hero-full">
      <div className={`${WRAP} relative z-[1] w-full pt-10 pb-24`}>
        <h1 className="hero-title" aria-label={`Hi, I'm ${site.name}. ${PHRASES[0]}`}>
          <span aria-hidden="true">
            Hi, I'm{' '}
            <span className="text-amber zune-glow">
              {[...site.name].map((ch, n) => (
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
              {site.content.heroIntro}
            </p>
            <p className="font-mono text-[13px] text-dim mt-4">{site.content.heroNote}</p>
            {/* data-solid-kids / data-solid: chữ của sân chơi (HeroLetters) đáp lên các phần tử này */}
            <div className="flex gap-3.5 mt-8 flex-wrap items-center" data-solid-kids>
              <Btn31 onClick={() => scrollToAnchor('#featured')}>view projects</Btn31>
              <ContactButton href={CONTACT.href} />
            </div>
            <div ref={setToys} className="mt-10" />
          </div>
          <div data-solid>
            <SheetCard />
          </div>
        </div>
      </div>

      <div className={`absolute z-[1] inset-x-0 bottom-0 ${WRAP} w-full pb-8 flex items-end justify-between`}>
        <a href={next} data-solid className="hero-link"
          onClick={(e) => { e.preventDefault(); scrollToAnchor(next); }}>
          <Scramble>Scroll to continue</Scramble> <HlArrow dir="down" />
        </a>
        <a href="#projects" data-solid className="hero-link"
          onClick={(e) => { e.preventDefault(); onNavigate?.('projects'); }}>
          <Scramble>Projects</Scramble> <HlArrow dir="ne" />
        </a>
      </div>

      <HeroLetters slot={toys} />
    </header>
  );
}
