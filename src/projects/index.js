// Danh sách project — CHỈ metadata, JS thuần (script Node `npm run previews` cũng đọc file này).
//
// THÊM PROJECT MỚI:
//   1. tạo thư mục src/projects/<tên-file-bỏ-đuôi>/ gồm:
//        meta.js  -> { file, desc, color, href, site? }
//        Art.jsx  -> hình vẽ hiện trên card (tuỳ chọn; không có thì card hiện icon)
//        Art.css  -> style riêng cho hình vẽ (tuỳ chọn)
//   2. thêm 1 dòng import + 1 phần tử vào mảng bên dưới (thứ tự mảng = thứ tự hiển thị)
//   3. (tuỳ chọn) npm run previews <tên> để chụp ảnh hiện khi hover
// Art.jsx được nạp tự động theo tên thư mục (xem arts.js), khỏi khai báo ở đâu nữa.

import aDumbGift from './a-dumb-gift/meta.js';
import symphony from './symphony/meta.js';
import illusion from './illusion/meta.js';
import leTotNghiep from './le-tot-nghiep/meta.js';
import calender from './calender/meta.js';
import aGiftForU from './a-gift-for-u/meta.js';

export const projects = [
  aDumbGift,
  symphony,
  illusion,
  leTotNghiep,
  calender,
  aGiftForU,
];
