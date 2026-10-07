import CreatureStage from '../CreatureStage/CreatureStage.jsx';
import { makeGloop } from './gloop.js';

// Một giọt amip mềm nhão với số mắt ngẫu nhiên, bò theo con trỏ bằng chân giả. Bấm vào khung để nó "bloop".
export default function Gloop() {
  return <CreatureStage make={makeGloop} />;
}
