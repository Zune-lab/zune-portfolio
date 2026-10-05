import { useCallback, useState } from 'react';
import { readBest, saveBest } from './storage.js';

// Kỷ lục của mini game (lưu localStorage): dùng chung cho Snake, BugSquash, MemoryMatch.
//   const { best, newBest, record, clearNew } = useBest(KEY, { lowerIsBetter })
//   record(n)  gọi khi hết ván: nếu n phá kỷ lục thì lưu lại và bật cờ newBest
//   clearNew() gọi khi bắt đầu ván mới
// lowerIsBetter: kỷ lục là số nhỏ nhất (vd MemoryMatch = ít lượt nhất); chưa có kỷ lục (0) thì ván đầu luôn tính.
export default function useBest(key, { lowerIsBetter = false } = {}) {
  const [best, setBest] = useState(() => readBest(key));
  const [newBest, setNewBest] = useState(false);
  const record = useCallback(
    (n) => {
      const beats = lowerIsBetter ? !best || n < best : n > best;
      if (!beats) return;
      setBest(n);
      saveBest(key, n);
      setNewBest(true);
    },
    [best, key, lowerIsBetter]
  );
  const clearNew = useCallback(() => setNewBest(false), []);
  return { best, newBest, record, clearNew };
}
