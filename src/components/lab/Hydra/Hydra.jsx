import CreatureStage from '../CreatureStage/CreatureStage.jsx';
import { makeHydra } from './hydra.js';

// Hydra có số đầu ngẫu nhiên, mỗi đầu một tính cách. Bấm vào khung để cả bọn lao vào cắn.
export default function Hydra() {
  return <CreatureStage make={makeHydra} />;
}
