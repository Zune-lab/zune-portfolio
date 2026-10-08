import { useCallback, useState } from 'react';
import useBest from '../../../lib/useBest.js';

// Vòng đời một ván dùng chung cho game có đồng hồ riêng (Snake, BugSquash).
//   status  'idle' | 'playing' | 'over'
//   round   tăng mỗi lần begin(): đặt vào deps của effect để "restart" giữa ván dựng lại timer từ đầu
//   begin() bắt đầu / chơi lại: xoá cờ newBest, sang 'playing'
//   finish(score) hết ván: ghi kỷ lục rồi sang 'over' (gọi thẳng từ vòng chơi, không cần effect theo dõi status)
// finish ổn định giữa các lần render trong lúc đang chơi (chỉ đổi khi kỷ lục đổi, tức là lúc ván đã kết thúc),
// nên đưa vào deps của effect vòng chơi mà không làm timer bị dựng lại.
export default function useGameRound(bestKey, bestOptions) {
  const [status, setStatus] = useState('idle');
  const [round, setRound] = useState(0);
  const { best, newBest, record, clearNew } = useBest(bestKey, bestOptions);

  const begin = useCallback(() => {
    clearNew();
    setStatus('playing');
    setRound((r) => r + 1);
  }, [clearNew]);

  const finish = useCallback(
    (score) => {
      record(score);
      setStatus('over');
    },
    [record]
  );

  return { status, round, best, newBest, begin, finish };
}
