import { skinById, swatchOf } from '../../../config/skins.js';
import useSkin from '../../../lib/useSkin.js';

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');

// Nút mở bảng chọn skin. Hai kiểu:
//   variant="pill" (desktop, ở navbar): [thanh 4 màu] tên skin  Ctrl K, rõ là nút bấm và nói luôn skin đang dùng + phím tắt
//   variant="row"  (mobile, nằm đầu menu hamburger): một dòng rộng, dễ chạm, thay cho ô vuông nhỏ xíu đứng cạnh cây đèn pin
export default function SkinButton({ onClick, variant = 'pill' }) {
  const { choice, skin, theme } = useSkin();
  const def = skinById(skin) ?? skinById('zune');
  const colors = swatchOf(def, theme);
  const name = choice === 'auto' ? `auto · ${def.label}` : def.label;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`Change site skin, current: ${name} (Ctrl+K)`}
      title="change skin · Ctrl+K"
      className={`skin-btn skin-btn--${variant}`}
    >
      <span className="skin-btn-chip" aria-hidden="true">
        {colors.map((c, i) => (
          <i key={i} style={{ background: c }} />
        ))}
      </span>
      <span className="skin-btn-name">{name}</span>
      {variant === 'pill' ? (
        <kbd className="skin-btn-kbd" aria-hidden="true">
          {isMac() ? '⌘K' : 'Ctrl K'}
        </kbd>
      ) : (
        <span className="skin-btn-go" aria-hidden="true">change →</span>
      )}
    </button>
  );
}
