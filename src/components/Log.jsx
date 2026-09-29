import SectionHead from '../SectionHead.jsx';
import { gitLog } from '../../data.js';

export default function Log() {
  return (
    <section id="log" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="02" title="log.sh" />
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
    </section>
  );
}