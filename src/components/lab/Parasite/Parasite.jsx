import CreatureStage from '../CreatureStage/CreatureStage.jsx';
import { makeParasite } from './parasite.js';

// Con trỏ là cây đèn pin: ánh sáng đốt giun, bóng tối để chúng chạy. Giun chui vào con trỏ thì lắc chuột thật mạnh để nôn ra; nhiễm đủ là thua.
// Bấm "respawn" (hoặc bấm khi màn thua hiện ra) để chơi lại. Kỷ lục lưu localStorage.
export default function Parasite() {
  return <CreatureStage make={makeParasite} />;
}
