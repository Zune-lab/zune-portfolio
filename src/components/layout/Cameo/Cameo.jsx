import { Component, lazy, Suspense } from 'react';
import useSkin from '../../../lib/useSkin.js';
import './Cameo.css';

// Mỗi skin "đặc biệt" (nhóm special + secret) có một nhân vật khách mời riêng, ở lớp cố định phía trên nội dung.
// Mỗi nhân vật là một chunk riêng, chỉ tải khi đúng skin đó được bật. Skin không có trong bảng này thì không có nhân vật.
const CAMEOS = {
  'retro-os': lazy(() => import('../Assistant/Assistant.jsx')), // Clippy, trợ lý thật của trang (chỉ skin này có; thay nút lên đầu trang và khung terminal)
  gameboy: lazy(() => import('./pets/Tamagotchi.jsx')), // thú cưng nuôi kiểu Tamagotchi
  crt: lazy(() => import('./pets/Invader.jsx')), // quái vật arcade đi tuần dưới đáy màn
  'crt-amber': lazy(() => import('./pets/AsciiCat.jsx')), // mèo vẽ bằng chữ đi dạo
  cyberpunk: lazy(() => import('./pets/Drone.jsx')), // drone bay theo con trỏ
  blueprint: lazy(() => import('./pets/Compass.jsx')), // compa vẽ kỹ thuật biết đi
  paper: lazy(() => import('./pets/Doodle.jsx')), // bút vẽ nguệch ngoạc ra hình
  matrix: lazy(() => import('./pets/Rabbit.jsx')), // thỏ trắng
  vaporwave: lazy(() => import('./pets/Flamingo.jsx')), // hồng hạc
};

// PHẠM VI XUẤT HIỆN của từng nhân vật theo "view" ('home' | 'about' | 'projects' | 'lab' | 'lab/<slug>').
//   only    chỉ hiện ở các view này (mặc định: mọi trang)
//   calm    ở các trang này nhân vật thôi bám con trỏ: không đè lên đồ chơi/game dùng chính con trỏ (Reptile, Moths, Mother, game...)
// - Doodle: tờ giấy dán ở khoảng trống đầu trang chủ; sang trang khác nó đè lên tiêu đề, nên chỉ ở home.
// - Drone, AsciiCat: bám/vồ con trỏ nên chỉ được "quấy" ở trang thường; vào một mục lab (lab/<slug>) thì drone đậu góc, mèo ngồi yên.
// - Còn lại (Clippy, Tamagotchi, Invader, Compass, Rabbit, Flamingo) nằm yên ở đáy/góc, không đụng tới con trỏ: hiện mọi trang.
const SCOPE = {
  paper: { only: ['home'] },
  cyberpunk: { calm: (view) => view.startsWith('lab/') },
  'crt-amber': { calm: (view) => view.startsWith('lab/') },
};

// Nhân vật chỉ là điểm nhấn: hỏng thì lặng lẽ biến mất, không được làm trắng cả site.
class Safe extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Cameo({ view, onNavigate, onToggleTheme, onOpenSkins }) {
  const { skin } = useSkin();
  const Pet = CAMEOS[skin];
  if (!Pet) return null;
  const scope = SCOPE[skin] ?? {};
  if (scope.only && !scope.only.includes(view)) return null;
  const calm = scope.calm?.(view) ?? false;
  return (
    <Safe key={skin}>
      <Suspense fallback={null}>
        <div className={`cameo-layer cameo-${skin}`}>
          <Pet view={view} calm={calm} onNavigate={onNavigate} onToggleTheme={onToggleTheme} onOpenSkins={onOpenSkins} />
        </div>
      </Suspense>
    </Safe>
  );
}
