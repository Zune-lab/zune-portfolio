import SectionHead from './SectionHead.jsx';
import Btn31 from './Btn31.jsx';

export function Stats() {
  return (
    <section id="stats" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="03" title="stats.sh" />
        <div className="flex items-center justify-between gap-6 flex-wrap border border-line rounded-[10px] px-[30px] py-7 bg-panel">
          <p className="text-dim text-sm max-w-[380px]">
            Detailed coding activity (commits, streaks, languages...) already lives on GitHub, so check it there
            for the real numbers.
          </p>
          <Btn31 href="https://github.com/Zune-lab">open github profile ↗</Btn31>
        </div>
      </div>
    </section>
  );
}

export function Support() {
  return (
    <section id="support" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="04" title="support.sh" />
        <div className="flex items-center justify-between gap-6 flex-wrap border border-line rounded-[10px] px-[30px] py-7 bg-panel">
          <p className="text-dim text-sm max-w-[380px]">
            If you like what I make, you can buy me{' '}
            <span className="font-mono text-amber">$ coffee --small</span> on Ko-fi.
          </p>
          {/* TODO: đổi thành trang Ko-fi thật của bạn trước khi deploy */}
          <Btn31 href="https://ko-fi.com/REPLACE_WITH_YOUR_HANDLE">sponsor --coffee</Btn31>
        </div>
      </div>
    </section>
  );
}
