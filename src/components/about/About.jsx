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
          <pre className="bg-inset border border-line rounded-[10px] px-[26px] py-[22px] font-mono text-[13px] leading-[1.9] overflow-x-auto text-ink">
            <span className="text-dim">$ git log --oneline --reverse life</span>
            {'\n\n'}
            {gitLog.map((entry, i) => (
              <span key={entry.hash}>
                <span style={{ color: 'var(--amber)' }}>{entry.hash}</span>{' '}
                <span style={{ color: 'var(--green)' }}>{entry.date.padEnd(7)}</span> {entry.msg}
                {i < gitLog.length - 1 ? '\n' : ''}
              </span>
            ))}
          </pre>
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