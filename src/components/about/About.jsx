import SectionHead from '../SectionHead.jsx';
import { gitLog, stack } from '../../data.js';

function SubHead({ children }) {
  return (
    <h3 className="font-mono text-[12.5px] uppercase tracking-[0.08em] text-dim mb-4">
      {children}
    </h3>
  );
}

export default function About() {
  return (
    <section id="about" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="01" title="about.js" />
        <p className="font-mono text-[12.5px] text-dim -mt-6 mb-10">
          // a few things about me
        </p>

        {/* Giới thiệu */}
        <div id="about-intro" className="mb-12 scroll-mt-20">
          <SubHead>// about.js</SubHead>
          <pre className="bg-inset border border-line rounded-[10px] px-[26px] py-[22px] font-mono text-sm overflow-x-auto text-ink">
            <span style={{ color: 'var(--amber)' }}>const</span> zune = {'{'}
            {'\n  role: '}
            <span style={{ color: 'var(--green)' }}>"Web Developer"</span>,
            {'\n  based_in: '}
            <span style={{ color: 'var(--green)' }}>"Ho Chi Minh City, VN"</span>,
            {'\n  started_coding: '}
            <span style={{ color: 'var(--css-lang)' }}>2022</span>,
            {'\n  favorite_stack: '}
            <span style={{ color: 'var(--green)' }}>"React + Tailwind"</span>,
            {'\n  currently_learning: '}
            <span style={{ color: 'var(--green)' }}>"Next.js App Router"</span>,
            {'\n  fun_fact: '}
            <span style={{ color: 'var(--green)' }}>"debugging CSS all night and never getting bored"</span>,
            {'\n  coffee_or_tea: '}
            <span style={{ color: 'var(--green)' }}>"tea"</span>,
            {'\n  status: '}
            <span style={{ color: 'var(--green)' }}>"chillax guys"</span>,
            {'\n};'}
          </pre>
        </div>

        {/* Hành trình */}
        <div id="about-journey" className="mb-12 scroll-mt-20">
          <SubHead>// log.sh</SubHead>
          <div className="bg-inset border border-line rounded-[10px] px-[26px] py-[22px] font-mono text-[13px] leading-[1.9] text-ink">
            <div className="text-dim mb-4">$ git log --oneline --reverse life</div>
            <ol className="m-0 p-0 list-none">
              {gitLog.map((entry) => (
                <li
                  key={entry.hash}
                  className="grid grid-cols-[auto_auto] sm:grid-cols-[auto_5.5rem_1fr] gap-x-3"
                >
                  <span style={{ color: 'var(--amber)' }}>{entry.hash}</span>
                  <span style={{ color: 'var(--green)' }}>{entry.date}</span>
                  <span className="col-span-2 sm:col-span-1">{entry.msg}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Kỹ năng */}
        <div id="about-skills" className="scroll-mt-20">
          <SubHead>// skills.js</SubHead>
          <pre className="bg-inset border border-line rounded-[10px] px-[26px] py-[22px] font-mono text-sm overflow-x-auto text-ink">
            <span style={{ color: 'var(--amber)' }}>const</span> stack = [
            {'\n  '}
            {stack.map((s, i) => (
              <span key={s}>
                <span style={{ color: 'var(--green)' }}>"{s}"</span>
                {i < stack.length - 1 ? ', ' : ''}
                {(i + 1) % 4 === 0 && i < stack.length - 1 ? '\n  ' : ''}
              </span>
            ))}
            {'\n];'}
          </pre>
        </div>
      </div>
    </section>
  );
}
