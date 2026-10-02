// URL web app của Google Apps Script nhận feedback (kết thúc bằng /exec).
// Cách tạo: xem scripts/feedback-apps-script.gs. Để trống thì form báo "chưa cấu hình" khi bấm gửi.
export const FEEDBACK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzYFBdU-mgR0SiqGqL-qIKn83-7Mg_r-mnzfL75E_P6g-u13C9lfePyr3VNW4evQKEo/exec';

// Google OAuth Client ID (dạng xxxx.apps.googleusercontent.com) để người gửi đăng nhập Google, nhờ đó email
// của họ được xác minh. Là giá trị công khai, KHÔNG phải bí mật. Phải giống CONFIG.GOOGLE_CLIENT_ID trong script.
export const GOOGLE_CLIENT_ID = '920116527365-vpppnt657dvo5i8sv9t8t6l9ts77t9ek.apps.googleusercontent.com';
