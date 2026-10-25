import { skinById, swatchOf } from '../../../config/skins.js';
import useSkin from '../../../lib/useSkin.js';

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');

// Nút mở bảng chọn skin. Hai kiểu:
//   variant="icon" (desktop, ở navbar): ô vuông 32px chỉ có bảng 2x2 màu của skin đang dùng; tên skin + phím tắt hiện ở chú thích khi rê chuột / focus,
//     nên navbar không còn bị một cái pill ~170px chiếm chỗ
//   variant="pill": [thanh 4 màu] tên skin  Ctrl K (bản rộng cũ, hiện không dùng ở navbar)
//   variant="row"  (mobile, nằm đầu menu hamburger): một dòng rộng, dễ chạm, thay cho ô vuông nhỏ xíu đứng cạnh cây đèn pin
export default function SkinButton({ onClick, variant = 'icon' }) {
  const { choice, skin, theme } = useSkin();
  const def = skinById(skin) ?? skinById('zune');
  const colors = swatchOf(def, theme);
  const name = choice === 'auto' ? `auto · ${def.label}` : def.label;
  const key = isMac() ? '⌘K' : 'Ctrl K';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`Change site skin, current: ${name} (Ctrl+K)`}
      title={variant === 'icon' ? undefined : 'change skin · Ctrl+K'}
      className={`skin-btn skin-btn--${variant}`}
    >
      <span className="skin-btn-chip" aria-hidden="true">
        {colors.map((c, i) => (
          <i key={i} style={{ background: c }} />
        ))}
      </span>
      {variant === 'icon' ? (
        <span className="skin-btn-tip" aria-hidden="true">
          {name}
          <kbd className="skin-btn-kbd">{key}</kbd>
        </span>
      ) : (
        <>
          <span className="skin-btn-name">{name}</span>
          {variant === 'pill' ? (
            <kbd className="skin-btn-kbd" aria-hidden="true">
              {key}
            </kbd>
          ) : (
            <span className="skin-btn-go" aria-hidden="true">change →</span>
          )}
        </>
      )}
    </button>
  );
}
