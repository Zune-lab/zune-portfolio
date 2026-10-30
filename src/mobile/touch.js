// Hằng số + hàm dùng chung cho cảm ứng (iOS / Android). Gom một chỗ để chỉnh cho dễ.

// Giữ ngón tay đứng yên chừng này ms trên một vật kéo được (chữ ở hero...) thì mới tính là "cầm" nó.
// Vuốt ngay từ đầu thì trình duyệt cuộn trang bình thường, không bị vật kéo chặn.
export const HOLD_MS = 170;
// Ngón tay trượt quá chừng này px trước khi đủ HOLD_MS thì coi là đang cuộn trang, huỷ ý định cầm.
export const HOLD_SLOP_PX = 8;

export const isTouchPointer = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';
