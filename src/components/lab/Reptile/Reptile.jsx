import CreatureStage from '../CreatureStage/CreatureStage.jsx';
import { makeReptile } from './creature.js';

// Bò sát bám theo con trỏ. Bấm "respawn" để đổi con khác. ~30 khung/giây như bản gốc.
export default function Reptile() {
  return <CreatureStage make={makeReptile} minFrameMs={33} />;
}
