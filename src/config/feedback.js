// URL web app của Google Apps Script nhận feedback (kết thúc bằng /exec).
// Cách tạo: xem scripts/feedback-apps-script.gs. Để trống thì form báo "chưa cấu hình" khi bấm gửi.
export const FEEDBACK_ENDPOINT = '';

// Google OAuth Client ID (dạng xxxx.apps.googleusercontent.com) để người gửi đăng nhập Google, nhờ đó email
// của họ được xác minh. Là giá trị công khai, KHÔNG phải bí mật. Phải giống CONFIG.GOOGLE_CLIENT_ID trong script.
export const GOOGLE_CLIENT_ID = '';
