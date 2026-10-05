import SectionHead from '../ui/SectionHead.jsx';
import Feedback from './Feedback.jsx';
import Socials from './Socials/Socials.jsx';
import { WRAP } from '../../config/ui.js';

// feedback + socials gộp một mục để nav chỉ cần một link `contact.sh`.
// Mobile: 1 cột (feedback trước, socials sau); từ md: 2 cột.
export default function Contact() {
  return (
    <section id="contact" className="py-20 border-t border-line scroll-mt-14">
      <div className={WRAP}>
        <SectionHead num="04" title="contact.sh" />
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,520px)_1fr] gap-12 md:gap-14 items-start">
          <Feedback />
          <Socials />
        </div>
      </div>
    </section>
  );
}
