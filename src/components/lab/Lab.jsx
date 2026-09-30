import SectionHead from '../SectionHead.jsx';
import CssPlayground from './CssPlayground.jsx';
import BugSquash from './BugSquash.jsx';
import Reptile from './Reptile.jsx';
import Cat from './Cat.jsx';
import './Lab.css';

function SubHead({ children }) {
  return (
    <h3 className="font-mono text-[12.5px] uppercase tracking-[0.08em] text-dim mb-4">
      {children}
    </h3>
  );
}

// trang lab: chỗ cho mọi người vào chơi thử CSS và một mini game
export default function Lab() {
  return (
    <section id="lab" className="pt-10 pb-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="07" title="lab.css" />
        <p className="font-mono text-[12.5px] text-dim -mt-6 mb-10">
          // poke around: chase a lizard, squash a few bugs, tweak some CSS
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

        <div id="lab-playground" className="mb-12 scroll-mt-20">
          <SubHead>// playground.css</SubHead>
          <CssPlayground />
        </div>

        <div id="lab-game" className="scroll-mt-20">
          <SubHead>// bug-squash.js</SubHead>
          <BugSquash />
        </div>
      </div>
    </section>
  );
}
