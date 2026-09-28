import SectionHead from './SectionHead.jsx';
import SocialButton from './SocialButton.jsx';
import { socials } from '../data.js';

export default function Socials() {
  return (
    <section id="socials" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="08" title="socials/" />
        <div className="flex flex-wrap gap-x-2 gap-y-6">
          {socials.map((s) => (
            <SocialButton key={s.name} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}