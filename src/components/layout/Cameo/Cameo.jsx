import { Component, lazy, Suspense } from 'react';
import useSkin from '../../../lib/useSkin.js';
import './Cameo.css';

// Mỗi skin "đặc biệt" (nhóm special + secret) có một nhân vật khách mời riêng, ở lớp cố định phía trên nội dung.
// Mỗi nhân vật là một chunk riêng, chỉ tải khi đúng skin đó được bật. Skin không có trong bảng này thì không có nhân vật.
const CAMEOS = {
  gameboy: lazy(() => import('./pets/Tamagotchi.jsx')), // thú cưng nuôi kiểu Tamagotchi
  'retro-os': lazy(() => import('./pets/Clippy.jsx')), // trợ lý kẹp giấy
  crt: lazy(() => import('./pets/Invader.jsx')), // quái vật arcade đi tuần dưới đáy màn
  'crt-amber': lazy(() => import('./pets/AsciiCat.jsx')), // mèo vẽ bằng chữ đi dạo
  cyberpunk: lazy(() => import('./pets/Drone.jsx')), // drone bay theo con trỏ
  blueprint: lazy(() => import('./pets/Compass.jsx')), // compa vẽ kỹ thuật biết đi
  paper: lazy(() => import('./pets/Doodle.jsx')), // bút vẽ nguệch ngoạc ra hình
  matrix: lazy(() => import('./pets/Rabbit.jsx')), // thỏ trắng
  vaporwave: lazy(() => import('./pets/Flamingo.jsx')), // hồng hạc
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

export default function Cameo({ view, onNavigate }) {
  const { skin } = useSkin();
  const Pet = CAMEOS[skin];
  if (!Pet) return null;
  return (
    <Safe key={skin}>
      <Suspense fallback={null}>
        <div className={`cameo-layer cameo-${skin}`}>
          <Pet view={view} onNavigate={onNavigate} />
        </div>
      </Suspense>
    </Safe>
  );
}
