import { skinById, swatchOf } from '../../../config/skins.js';
import useSkin from '../../../lib/useSkin.js';

// Nút mở bảng chọn skin ở navbar. Chính nút là ô xem trước: 4 ô màu [nền, bảng, nhấn, chữ] của skin đang dùng.
export default function SkinButton({ onClick }) {
  const { skin, theme } = useSkin();
  const colors = swatchOf(skinById(skin) ?? skinById('zune'), theme);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label="Change site skin (Ctrl+K)"
      title="skins · Ctrl+K"
      className="skin-btn"
    >
      <span className="skin-btn-chip" aria-hidden="true">
        {colors.map((c, i) => (
          <i key={i} style={{ background: c }} />
        ))}
      </span>
    </button>
  );
}
