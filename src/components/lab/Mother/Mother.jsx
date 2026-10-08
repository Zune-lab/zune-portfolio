import CreatureStage from '../CreatureStage/CreatureStage.jsx';
import { makeMother } from './mother.js';

// Mẹ đang ngủ trong bóng tối, dưới một khối tóc đen. Chọc để con của bà bò ra; bóp chết con thì bà tỉnh. Bấm lần đầu để bật âm thanh.
export default function Mother() {
  return <CreatureStage make={makeMother} height={420} />;
}
