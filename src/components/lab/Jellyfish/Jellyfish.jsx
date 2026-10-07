import CreatureStage from '../CreatureStage/CreatureStage.jsx';
import { makeJellyfish } from './jellyfish.js';

// Sứa trôi theo con trỏ bằng những nhịp co bóp. Bấm vào khung để dọa nó. Bấm "respawn" để đổi con khác.
export default function Jellyfish() {
  return <CreatureStage make={makeJellyfish} />;
}
