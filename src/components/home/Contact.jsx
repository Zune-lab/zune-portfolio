import SectionHead from '../ui/SectionHead.jsx';
import Feedback from './Feedback.jsx';
import Socials from './Socials/Socials.jsx';
import { SECTION_ANCHOR, WRAP } from '../../config/ui.js';
import { CONTACT } from '../../config/pages.js';

// feedback + socials gộp một mục để nav chỉ cần một link `contact.sh`.
// Mobile: 1 cột (feedback trước, socials sau); từ md: 2 cột.
export default function Contact() {
  return (
    <section id={CONTACT.id} className={SECTION_ANCHOR}>
      <div className={WRAP}>
        <SectionHead num="04" title={CONTACT.label} />
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,520px)_1fr] gap-12 md:gap-14 items-start">
          <Feedback />
          <Socials />
        </div>
      </div>
    </section>
  );
}
