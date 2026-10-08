import CreatureStage from '../CreatureStage/CreatureStage.jsx';
import { makeParasite } from './parasite.js';

// Con sâu ký sinh chui vào con trỏ. Lắc chuột thật mạnh để nôn nó ra. Bấm "respawn" để bắt đầu lại từ đầu.
export default function Parasite() {
  return <CreatureStage make={makeParasite} />;
}
