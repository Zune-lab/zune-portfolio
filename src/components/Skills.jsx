import SectionHead from '../SectionHead.jsx';
import { stack } from '../../data.js';

export default function Skills() {
  return (
    <section id="stack" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="03" title="skills.js" />
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
    </section>
  );
}