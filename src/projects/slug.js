// "Slug" của project = tên file bỏ đuôi (calendar.js -> calendar), cũng là tên thư mục src/projects/<slug>/ và tên ảnh preview.
// File thuần (không import Vite/React) để cả component, projects/index.js lẫn system/scripts/make-previews.mjs (Node) cùng dùng.
export const slugOfFile = (file) => file.replace(/\.[^.]+$/, '');
export const slugOf = (project) => slugOfFile(project.file);
