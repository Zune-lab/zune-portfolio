/**
 * Nhận feedback từ form trên site. Người gửi PHẢI đăng nhập bằng Google (Gmail): server kiểm tra ID token của
 * Google nên địa chỉ email là THẬT và là của chính họ (không gõ tay, không mượn email người khác được).
 * Mọi tin hợp lệ đều được GHI VÀO GOOGLE SHEET; chỉ tin "sạch" mới được gửi mail tới chính tài khoản Google chạy
 * script (kèm replyTo = email đã xác minh nên bấm Reply là trả lời được luôn).
 * Địa chỉ nhận mail nằm ở đây (phía server), không lộ trong bundle của site.
 *
 * CÁCH CÀI (làm 1 lần):
 * A. Lấy Google Client ID (miễn phí, chỉ để xác minh email người gửi):
 *    1. https://console.cloud.google.com -> tạo project mới.
 *    2. APIs & Services -> OAuth consent screen: chọn External, điền tên app + email hỗ trợ, rồi bấm PUBLISH APP
 *       (để "In production"). Nếu để "Testing" thì chỉ test user mới đăng nhập được. Chỉ dùng scope cơ bản
 *       (openid/email/profile) nên không cần Google duyệt.
 *    3. Credentials -> Create credentials -> OAuth client ID -> Web application. Mục "Authorized JavaScript
 *       origins" thêm: https://zune-lab.github.io  và  http://localhost:5173  (không cần redirect URI).
 *    4. Copy Client ID (dạng xxxx.apps.googleusercontent.com), dán vào CONFIG.GOOGLE_CLIENT_ID bên dưới
 *       VÀ vào src/config/feedback.js (GOOGLE_CLIENT_ID). Client ID là công khai, không phải bí mật.
 * B. Apps Script:
 *    1. Tạo 1 Google Sheet mới (đặt tên "zune feedback"), mở Extensions -> Apps Script, dán toàn bộ file này vào.
 *       (Phải mở Apps Script TỪ Sheet thì script mới biết ghi vào đâu.)
 *    2. Bấm Run (chọn hàm doPost) -> Review permissions -> cho phép gửi mail, sửa Sheet và kết nối dịch vụ ngoài
 *       (để gọi Google xác minh token). Chạy lần đầu sẽ báo lỗi vì không có dữ liệu, bỏ qua, quyền đã được cấp.
 *    3. Deploy -> New deployment -> loại "Web app":  Execute as: Me  |  Who has access: Anyone.
 *       Bấm Deploy, copy URL kết thúc bằng /exec.
 *    4. Dán URL vào src/config/feedback.js (FEEDBACK_ENDPOINT), build lại và deploy site.
 * Sửa script sau này: Deploy -> Manage deployments -> Edit -> New version thì mới có hiệu lực.
 *
 * THIẾT KẾ: URL này công khai nên ai cũng gọi được, nhưng muốn gửi thì phải có Google ID token hợp lệ:
 *  - Token được xác minh phía server (gọi tokeninfo của Google, kiểm tra aud = Client ID của bạn, email_verified,
 *    còn hạn). Kẻ spam phải có tài khoản Google thật cho mỗi tin, mà mỗi email chỉ được 1 tin / CONTACT_COOLDOWN_S
 *    và bạn có thể cấm hẳn 1 email bằng BLOCKED_EMAILS.
 *  - Số lần gọi xác minh bị giới hạn mỗi phút để token rác không làm cạn hạn mức UrlFetch của Google.
 *  - Mọi tin hợp lệ vào Sheet (cột "flags" cho biết vì sao bị giữ lại); chỉ tin không bị gắn cờ mới thành mail.
 *  - Trần mail mỗi ngày: không làm cạn hạn mức Gmail, hộp thư của bạn không bị ngập.
 *  - Tin trùng nội dung bị gắn cờ; nhiều link bị gắn cờ; gửi quá nhanh sau khi mở trang bị gắn cờ; từ trong
 *    BLOCKLIST bị gắn cờ.
 *  - Toàn bộ phần kiểm tra + ghi chạy trong 1 khoá (LockService) nên nhiều request cùng lúc không lách được giới hạn.
 *  - Ô trong Sheet đặt định dạng text nên tin bắt đầu bằng "=" không bị chạy như công thức.
 *  - Tin bị gắn cờ vẫn trả "ok" cho người gửi (không cho bot biết đã bị chặn). Bạn xem lại trong Sheet.
 * Bạn chỉ thấy: email Google đã xác minh, nội dung, mood, giờ gửi. Không có IP / tên / thiết bị.
 */
const CONFIG = {
  GOOGLE_CLIENT_ID: '', // dán Client ID ở bước A.4
  REQUIRE_GMAIL: true, // chỉ nhận @gmail.com / @googlemail.com; false = nhận mọi tài khoản Google (cả Workspace)
  MAX_LEN: 2000,
  MIN_LEN: 3,
  MAX_LINKS: 1,
  MIN_FILL_MS: 3000, // người thật không gõ + bấm gửi trong < 3 giây
  GLOBAL_COOLDOWN_S: 3, // khoảng nghỉ tối thiểu giữa 2 tin bất kỳ
  CONTACT_COOLDOWN_S: 600, // mỗi email: 1 tin / 10 phút
  DUPLICATE_TTL_S: 6 * 3600, // cùng nội dung trong 6 giờ coi là trùng (tối đa 21600 = 6 giờ của CacheService)
  DAILY_EMAIL_CAP: 10, // quá số này trong ngày: chỉ ghi Sheet, không gửi mail nữa
  VERIFY_PER_MIN: 10, // tối đa số lần gọi Google xác minh token mỗi phút (bảo vệ hạn mức UrlFetch)
  MAX_ROWS: 5000, // Sheet đầy quá số dòng này thì ngừng ghi (không để spam làm phình Sheet)
  BLOCKED_EMAILS: [], // email bị cấm, vd ['bad@gmail.com'] (tin vẫn trả "ok" nhưng chỉ ghi Sheet, không gửi mail)
  BLOCKLIST: [], // từ/cụm bị gắn cờ, vd ['casino', 'xxx'] (không phân biệt hoa thường)
};
const MOODS = { good: 'liked it', bad: 'not a fan' };
const GMAIL_RE = /@(gmail|googlemail)\.com$/;

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const message = clean(String(data.message || '')).trim().slice(0, CONFIG.MAX_LEN);
    if (message.length < CONFIG.MIN_LEN) return reply({ ok: false, error: 'empty' });

    // 1) xác minh người gửi (ngoài khoá vì gọi mạng khá chậm)
    const who = verifyGoogleToken(String(data.credential || ''));
    if (!who.email) return reply({ ok: false, error: who.error });
    const contact = who.email;

    // 2) từ đây tới hết: kiểm tra giới hạn + gửi mail + ghi Sheet, tất cả trong 1 khoá
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
    } catch (err) {
      return reply({ ok: false, error: 'rate' });
    }
    try {
      const mood = MOODS[data.mood] || '';
      if (CONFIG.BLOCKED_EMAILS.some((m) => String(m).toLowerCase() === contact)) {
        log([new Date(), contact, mood, message, 'blocked-email', 'no']);
        return reply({ ok: true });
      }

      const cache = CacheService.getScriptCache();
      if (cache.get('g')) return reply({ ok: false, error: 'rate' });
      const contactKey = 'c:' + hash(contact);
      if (cache.get(contactKey)) return reply({ ok: false, error: 'rate' });
      cache.put('g', '1', CONFIG.GLOBAL_COOLDOWN_S);
      cache.put(contactKey, '1', CONFIG.CONTACT_COOLDOWN_S);

      const flags = [];
      if (!(Number(data.elapsed) >= CONFIG.MIN_FILL_MS)) flags.push('too-fast'); // thiếu / NaN / quá nhanh đều bị gắn cờ
      if ((message.match(/https?:\/\/|www\./gi) || []).length > CONFIG.MAX_LINKS) flags.push('links');
      const lower = message.toLowerCase();
      if (CONFIG.BLOCKLIST.some((w) => w && lower.indexOf(String(w).toLowerCase()) !== -1)) flags.push('blocklist');
      const dupKey = 'm:' + hash(lower);
      if (cache.get(dupKey)) flags.push('duplicate');
      else cache.put(dupKey, '1', CONFIG.DUPLICATE_TTL_S);

      let emailed = false;
      if (!flags.length && takeDailySlot()) {
        MailApp.sendEmail({
          to: Session.getEffectiveUser().getEmail(),
          replyTo: contact,
          subject: 'Feedback from zune.dev' + (mood ? ' (' + mood + ')' : ''),
          body: message + '\n\n-- from (Google-verified): ' + contact,
        });
        emailed = true;
      } else if (!flags.length) {
        flags.push('daily-cap');
      }
      log([new Date(), contact, mood, message, flags.join(','), emailed ? 'yes' : 'no']);
      return reply({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err); // xem trong Apps Script -> Executions
    return reply({ ok: false, error: 'server' });
  }
}

// Xác minh Google ID token. Trả { email } nếu hợp lệ, hoặc { error } với error: 'auth' | 'gmail' | 'rate'.
function verifyGoogleToken(idToken) {
  if (!CONFIG.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID chưa được điền trong CONFIG');
  const parts = idToken.split('.');
  if (parts.length !== 3 || idToken.length > 4096) return { error: 'auth' };

  // kiểm tra rẻ phía local trước: token sai Client ID / hết hạn thì khỏi tốn 1 lượt gọi Google
  let p;
  try {
    let b64 = parts[1];
    while (b64.length % 4) b64 += '=';
    p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(b64)).getDataAsString());
  } catch (err) {
    return { error: 'auth' };
  }
  if (!p || p.aud !== CONFIG.GOOGLE_CLIENT_ID || !(Number(p.exp) * 1000 > Date.now())) return { error: 'auth' };

  if (!takeVerifySlot()) return { error: 'rate' };

  // chữ ký thật sự được Google kiểm tra ở đây; payload ở trên chỉ để lọc sớm, KHÔNG được tin
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) return { error: 'auth' };
  const t = JSON.parse(res.getContentText());
  const issOk = t.iss === 'accounts.google.com' || t.iss === 'https://accounts.google.com';
  if (!issOk || t.aud !== CONFIG.GOOGLE_CLIENT_ID || String(t.email_verified) !== 'true' || !(Number(t.exp) * 1000 > Date.now())) {
    return { error: 'auth' };
  }
  const email = String(t.email || '').trim().toLowerCase();
  if (!email) return { error: 'auth' };
  if (CONFIG.REQUIRE_GMAIL && !GMAIL_RE.test(email)) return { error: 'gmail' };
  return { email: email };
}

// ngân sách số lần gọi xác minh mỗi phút (khoá ngắn để đếm chính xác)
function takeVerifySlot() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (err) {
    return false;
  }
  try {
    const cache = CacheService.getScriptCache();
    const key = 'vb:' + Math.floor(Date.now() / 60000);
    const used = Number(cache.get(key)) || 0;
    if (used >= CONFIG.VERIFY_PER_MIN) return false;
    cache.put(key, String(used + 1), 120);
    return true;
  } finally {
    lock.releaseLock();
  }
}

// còn "suất" mail trong ngày không? (chỉ gọi khi đã đang giữ khoá chính)
function takeDailySlot() {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  const used = props.getProperty('day') === today ? Number(props.getProperty('count')) || 0 : 0;
  if (used >= CONFIG.DAILY_EMAIL_CAP) return false;
  props.setProperties({ day: today, count: String(used + 1) });
  return true;
}

// ghi 1 dòng vào Sheet đang gắn với script (chỉ gọi khi đang giữ khoá chính); lỗi ghi Sheet không được làm hỏng việc nhận tin.
// Ô đặt định dạng text ('@') nên nội dung bắt đầu bằng = + - @ chỉ là chữ, không thành công thức.
function log(row) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    const sheet = ss.getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(['time', 'contact', 'mood', 'message', 'flags', 'emailed']);
    if (sheet.getLastRow() >= CONFIG.MAX_ROWS) return;
    const cells = row.map((v) => (v instanceof Date ? v.toISOString() : String(v)));
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, cells.length).setNumberFormat('@').setValues([cells]);
  } catch (err) {
    console.error(err);
  }
}

// bỏ ký tự điều khiển (giữ xuống dòng và tab) để không lọt vào mail / Sheet
function clean(s) {
  return s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

function hash(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s));
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
