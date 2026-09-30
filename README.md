# zune.dev

Trang portfolio cá nhân của **Zune** — một website "về mình", giao diện kiểu terminal/code editor, làm bằng React + Tailwind và chạy trên GitHub Pages.

🔗 **Xem trang:** https://zune-lab.github.io/zune-portfolio/

> `chillax guys. code for fun, ship small weird things.`

---

## Về trang này

Đây là nơi gom mọi thứ về mình vào một chỗ: mình là ai, đã đi qua những gì, đang làm gì và liên hệ với mình bằng cách nào. Cả trang được "đóng vai" một cái terminal: tiêu đề mục là tên file (`about.js`, `log.sh`, `projects/`), nhật ký hành trình viết như `git log`, và có hẳn một terminal gõ lệnh được ở đầu trang.

## Vì sao làm trang này

- **Gom về một chỗ.** Dự án nằm rải rác trên GitHub, mạng xã hội thì mỗi nơi một kiểu. Một trang riêng giúp người xem hiểu nhanh mình làm gì mà không phải đi tìm.
- **Có chỗ để thử.** Đây cũng là sân chơi cho giao diện và animation: công tắc đèn pin, preloader, hiệu ứng card, nền đổi theo giờ... những thứ khó đặt vào một dự án nghiêm túc nhưng làm rất vui.
- **Có chỗ để nhìn lại.** Mục `log.sh` ghi hành trình học code, để sau này nhìn lại thấy mình đã đi từ đâu tới đâu.
- **Học bằng cách làm.** Trang được chuyển từ HTML/CSS/JS thuần sang React (Vite) + Tailwind để dễ mở rộng và bảo trì hơn, đồng thời luyện cách tổ chức một dự án frontend thật.

## Có gì trong trang

- **Terminal tương tác** ở đầu trang: gõ `help` để xem lệnh (`ls`, `cat`, `cd`, `whoami`, `date`, `clear`...). Thử `sudo hire zune` xem sao.
- **Theme sáng/tối** bằng công tắc "đèn pin" ở thanh nav, nhớ lựa chọn của người xem.
- **Nền đổi theo giờ Việt Nam** (bình minh / ngày / hoàng hôn / đêm).
- **Trạng thái online/offline** tự suy ra từ giờ Việt Nam (không cần server), người xem có thể bấm để đổi tay sang `busy` hoặc `focus`.
- **Trang About:** `about.js` (giới thiệu), `log.sh` (nhật ký hành trình dạng git log), `skills.js` (công nghệ đang dùng).
- **Trang Projects:** mỗi dự án là một card có hình vẽ riêng, rê chuột vào để xem mô tả và link.
- **Feedback** gửi qua ứng dụng mail của người xem (không lưu dữ liệu ở đâu cả), cùng **mạng xã hội** và mục ủng hộ.
- **Mỗi trang có địa chỉ riêng** (`/about`, `/projects`), mở thẳng hay F5 đều đúng trang.

## Công nghệ và lý do chọn

| Công nghệ | Vì sao |
|---|---|
| **React 18 + Vite** | Chia trang thành component nhỏ, sửa một chỗ không ảnh hưởng chỗ khác; Vite chạy dev và build rất nhanh. |
| **Tailwind CSS + biến CSS** | Viết giao diện nhanh; màu theo theme và giờ trong ngày đều nằm ở biến CSS (`src/index.css`) nên đổi theme không cần đụng component. |
| **CSS thuần cho animation phức tạp** | Đèn pin 3D, preloader, hiệu ứng wipe... khó diễn tả gọn bằng utility class nên viết CSS riêng cạnh từng component. |
| **Không có backend** | Trạng thái online theo giờ, feedback qua `mailto:`... đều chạy phía trình duyệt: đơn giản, miễn phí, không lưu dữ liệu người xem. |
| **GitHub Pages + GitHub Actions** | Hosting miễn phí; mỗi lần push lên `main` là tự build và deploy. |

## Chạy thử

Cần Node 20.19+ (GitHub Actions dùng Node 22).

```bash
npm install
npm run dev        # chạy dev: http://localhost:5173/zune-portfolio/
npm run build      # build vào dist/ (+ tạo các trang con và 404.html)
npm run preview    # xem thử bản build
```

## Deploy

Push lên nhánh `main` là xong: workflow `.github/workflows/deploy.yml` tự build và đưa `dist/` lên GitHub Pages.

Lưu ý: `base` trong `vite.config.js` (`/zune-portfolio/`) phải khớp đúng tên repo, vì site chạy ở subpath. Sai thì trang trắng do asset trỏ nhầm đường dẫn.

## Cấu trúc thư mục

```
src/
  App.jsx            ghép toàn bộ trang, quản lý theme, preloader, chuyển trang
  pages.js           sổ đăng ký các trang (about, projects...) — thêm trang mới ở đây
  data.js            nội dung: stack, git log, mạng xã hội
  index.css          biến màu theo theme + animation dùng chung
  components/        mỗi section/thành phần một file (kèm .css nếu có animation riêng)
  components/about/  trang About
  projects/          mọi thứ về project (xem bên dưới)
  lib/vnTime.js      "giờ Việt Nam" dùng chung cho nền và trạng thái online
scripts/
  spa-404.mjs        tạo trang con + 404.html sau khi build (xem "Vì sao có spa-404")
  make-previews.mjs  chụp ảnh preview cho card project (tuỳ chọn)
```

## Sửa nhanh

- **Thêm trang mới:** tạo component rồi thêm một mục vào `PAGES` trong `src/pages.js`. Nav, URL, tiêu đề tab, lệnh `cd`/`ls` trong terminal và thư mục sau build đều tự theo.
- **Thêm project mới:** tạo thư mục `src/projects/<tên>/` gồm `meta.js` (`order`, `file`, `desc`, `color`, `href`), tuỳ chọn `Art.jsx` + `Art.css`. Không phải sửa file nào khác.
- **Sửa nhật ký `log.sh`:** chỉnh mảng `gitLog` trong `src/data.js`.
- **Ảnh nền khi hover card:** đặt ảnh 1280×720 vào `public/previews/<tên>.png` (chưa có ảnh thì card dùng nền trơn). Chụp tự động:
  ```bash
  npm i --no-save playwright && npx playwright install chromium
  npm run previews              # chụp tất cả (bỏ qua project có manualShot)
  npm run previews symphony     # chỉ project có tên chứa "symphony"
  ```

## Vì sao có `spa-404`

GitHub Pages chỉ phục vụ file có thật, mà trang chỉ có một `index.html`; mở thẳng `/about` hay F5 ở đó sẽ ra 404. Sau `vite build`, `scripts/spa-404.mjs` đọc danh sách trang trong `src/pages.js`, chép `index.html` thành `dist/<id>/index.html` cho từng trang (và `404.html` cho địa chỉ lạ). App đọc URL rồi tự hiện đúng trang.

## Credit

Nhiều hiệu ứng nhỏ lấy cảm hứng và chỉnh lại từ [uiverse.io](https://uiverse.io):

- công tắc đèn pin (`ThemeToggleTorch`), nút contact (`ContactButton`), nút back-to-top (`BackToTop`), nút cuộn xuống (`ScrollArrow`), loader (`Preloader`)
- nút mạng xã hội gộp thành một component `SocialButton` (nằm trong `Socials.jsx`) dùng chung cho mọi mạng

Một số mẫu khác (card gradient, feedback card nền trắng, dock social...) không được dùng vì không hợp tông terminal/amber của trang.