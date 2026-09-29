// CẦN CHỈNH TRƯỚC KHI DÙNG:
// Đảm bảo mỗi object trong mảng `projects` (trong src/data.js) có đủ các
// field: { file, desc, color, href } - đúng tên props mà ProjectCard.jsx
// cần. Nếu data.js của bạn đặt tên khác (vd: name, description, link...),
// đổi lại tên field trong data.js hoặc sửa dòng {...p} bên dưới cho khớp.

import SectionHead from '../SectionHead.jsx';
import ProjectCard from './ProjectCard.jsx';
import { projects } from '../../data.js';

export default function Projects() {
  return (
    <section id="projects" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="04" title="projects/" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {projects.map((p, i) => (
            <ProjectCard key={p.file} num={String(i + 1).padStart(2, '0')} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}