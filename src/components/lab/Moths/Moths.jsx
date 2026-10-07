import CreatureStage from '../CreatureStage/CreatureStage.jsx';
import { makeMoths } from './moths.js';

// Một đàn bướm đêm bay vòng quanh con trỏ (là ngọn đèn). Bấm để tắt đèn: cả đàn đậu vào tường. Bấm nữa để bật lại.
export default function Moths() {
  return <CreatureStage make={makeMoths} />;
}
