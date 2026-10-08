import CreatureStage from '../CreatureStage/CreatureStage.jsx';
import { makeChoir } from './choir.js';

// Dàn đồng ca đứng trong bóng tối, nhìn thẳng ra màn hình. Rê chuột để họ hát, dừng lại thì họ tới gần. Bấm lần đầu để bật âm thanh.
export default function Choir() {
  return <CreatureStage make={makeChoir} height={420} />;
}
