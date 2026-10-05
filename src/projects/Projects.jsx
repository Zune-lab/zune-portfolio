import SectionHead from '../components/ui/SectionHead.jsx';
import ProjectCard from './ProjectCard/ProjectCard.jsx';
import { projects } from './index.js';
import { WRAP } from '../config/ui.js';

// project nạp từ src/projects/<tên>/meta.js, mỗi cái cần: { file, desc, color, href } (+ shot tuỳ chọn).
// `num` tự đếm theo thứ tự, đặt SAU {...p} để không bị field nào ghi đè.
export default function Projects() {
  return (
    <section id="projects" className="py-20 border-t border-line">
      <div className={WRAP}>
        <SectionHead num="01" title="projects/" level={1} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {projects.map((p, i) => (
            <ProjectCard key={p.file} {...p} num={String(i + 1).padStart(2, '0')} />
          ))}
        </div>
      </div>
    </section>
  );
}
