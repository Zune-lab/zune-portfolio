import { site } from '../config/site.js';

// Một nguồn duy nhất cho "giờ của chủ site" (site.timezone): nền (data-tod) và trạng thái online/offline
// cùng dùng chung để không bao giờ lệch mốc nhau. Múi giờ và các mốc giờ khai báo ở config/site.js.
// Tạo Intl.DateTimeFormat rất tốn (~60µs/lần) mà siteHour() bị gọi mỗi khung hình (HeroWorm -> getStatusKey)
// và mỗi lần React hỏi snapshot, nên tạo MỘT lần rồi dùng lại (~30 lần nhanh hơn).
const { timezone, schedule } = site;

const hourFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: timezone,
  hour: 'numeric',
  hourCycle: 'h23',
});
function siteHour() {
  return parseInt(hourFmt.format(new Date()), 10);
}

// đồng hồ HH:MM:SS (thẻ sav). Tạo formatter một lần như hourFmt ở trên.
const clockFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: timezone,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
export const siteClock = () => clockFmt.format(new Date());

// nhãn lệch múi giờ, vd "GMT+7" (tự theo site.timezone, kể cả giờ mùa hè); trình duyệt cũ không hỗ trợ thì trả chuỗi rỗng
const offsetFmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' });
export const gmtLabel = () => offsetFmt.formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? '';

// ngày + giờ đầy đủ (lệnh `date` trong terminal; hiếm gọi nên tạo formatter mỗi lần cũng được)
export const siteDateTime = () => new Date().toLocaleString('en-GB', { timeZone: timezone });

// dawn [dawn, day) | day [day, dusk) | dusk [dusk, night) | night [night, dawn) (qua nửa đêm)
export function timeOfDay(h = siteHour()) {
  if (h >= schedule.night || h < schedule.dawn) return 'night';
  if (h < schedule.day) return 'dawn';
  if (h < schedule.dusk) return 'day';
  return 'dusk';
}

// online = day + dusk; offline = dawn + night
export const isOnlineHour = (h = siteHour()) => h >= schedule.day && h < schedule.night;
