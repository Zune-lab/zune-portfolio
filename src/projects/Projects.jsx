import SectionHead from '../components/SectionHead.jsx';
import ProjectCard from './ProjectCard.jsx';
import { projects } from '../data.js';

// project nạp từ src/projects/<tên>/meta.js, mỗi cái cần: { file, desc, color, href }.
// `num` tự đếm theo thứ tự, đặt SAU {...p} để không bị field nào ghi đè.
export default function Projects() {
  return (
    <section id="projects" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="04" title="projects/" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {projects.map((p, i) => (
            <ProjectCard key={p.file} {...p} num={String(i + 1).padStart(2, '0')} />
          ))}
        </div>
      </div>
    </section>
  );
}
