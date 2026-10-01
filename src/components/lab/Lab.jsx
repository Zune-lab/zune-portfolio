import SectionHead from '../SectionHead.jsx';
import BannerMaker from './BannerMaker.jsx';
import BugSquash from './BugSquash.jsx';
import Reptile from './Reptile.jsx';
import Cat from './Cat.jsx';
import Ghost from './Ghost.jsx';
import MemoryMatch from './MemoryMatch.jsx';
import Snake from './Snake.jsx';
import './Lab.css';

function SubHead({ children }) {
  return (
    <h3 className="font-mono text-[12.5px] uppercase tracking-[0.08em] text-dim mb-4">
      {children}
    </h3>
  );
}

// trang lab: chỗ cho mọi người vào chơi thử: thằn lằn, mèo, ma CSS, thiết kế banner và vài mini game
export default function Lab() {
  return (
    <section id="lab" className="pt-10 pb-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="09" title="lab.css" />
        <p className="font-mono text-[12.5px] text-dim -mt-6 mb-10">
          // poke around: chase a lizard, scare a ghost, design a banner, play a few games
        </p>

        <div id="lab-reptile" className="mb-12 scroll-mt-20">
          <SubHead>// reptile.js</SubHead>
          <Reptile />
        </div>

        <div id="lab-cat" className="mb-12 scroll-mt-20">
          <SubHead>// upside-down-cat.css</SubHead>
          <div className="relative h-[340px] rounded-[10px] border border-line overflow-hidden" style={{ background: '#ff9a2e' }}>
            <Cat />
          </div>
        </div>

        <div id="lab-ghost" className="mb-12 scroll-mt-20">
          <SubHead>// floating-ghost.css</SubHead>
          <div className="relative h-[340px] rounded-[10px] border border-line overflow-hidden">
            <Ghost />
          </div>
        </div>

        <div id="lab-playground" className="mb-12 scroll-mt-20">
          <SubHead>// banner-maker.js</SubHead>
          <BannerMaker />
        </div>

        <div id="lab-game" className="mb-12 scroll-mt-20">
          <SubHead>// bug-squash.js</SubHead>
          <BugSquash />
        </div>

        <div id="lab-memory" className="mb-12 scroll-mt-20">
          <SubHead>// memory-match.js</SubHead>
          <MemoryMatch />
        </div>

        <div id="lab-snake" className="scroll-mt-20">
          <SubHead>// snake.js</SubHead>
          <Snake />
        </div>
      </div>
    </section>
  );
}
