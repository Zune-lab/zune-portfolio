// Một nguồn duy nhất cho "giờ VN" – nền (data-tod) và trạng thái online/offline
// cùng dùng chung để không bao giờ lệch mốc nhau.
// Tạo Intl.DateTimeFormat rất tốn (~60µs/lần) mà vnHour() bị gọi mỗi khung hình (HeroWorm -> getStatusKey)
// và mỗi lần React hỏi snapshot, nên tạo MỘT lần rồi dùng lại (~30 lần nhanh hơn).
const hourFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: 'numeric',
  hourCycle: 'h23',
});
function vnHour() {
  return parseInt(hourFmt.format(new Date()), 10);
}

// dawn 5-8 | day 8-17 | dusk 17-23 | night 23-5
export function timeOfDay(h = vnHour()) {
  if (h >= 23 || h < 5) return 'night';
  if (h < 8) return 'dawn';
  if (h < 17) return 'day';
  return 'dusk';
}

// online = day + dusk (8h-23h); offline = dawn + night
export const isOnlineHour = (h = vnHour()) => h >= 8 && h < 23;
