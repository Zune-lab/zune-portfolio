// CÂN CHỈNH CÁC MINI GAME: toàn bộ con số "cứng" của Snake, BugSquash, MemoryMatch nằm ở đây. Sửa ở đây là đổi cho game, không phải lục trong component.

export const SNAKE = {
  grid: 18, // lưới N x N
  cell: 20, // px mỗi ô (bàn vẽ N * cell px, CSS co giãn theo khung)
  start: { x: 5, y: 9, length: 3 }, // đầu rắn lúc bắt đầu, dài `length` ô quay sang phải
  firstStepMs: 140, // bước đầu tiên của ván
  stepMs: 140, // chu kỳ bước lúc mới chơi
  minStepMs: 60, // nhanh nhất có thể
  speedUpMs: 3, // mỗi mồi ăn được rút bớt chừng này ms
  swipeMinPx: 20, // vuốt ngắn hơn ngưỡng này thì bỏ qua
  maxQueuedTurns: 2, // số lần rẽ xếp hàng tối đa giữa hai bước
};

export const BUG_SQUASH = {
  cells: 9, // 3 x 3
  durationS: 30,
  lifeStartMs: 900, // bug sống bao lâu lúc đầu
  lifeMinMs: 450, // sống ngắn nhất
  lifeShrinkMsPerS: 15, // mỗi giây trôi qua bug sống ngắn đi chừng này
  respawnAfterHitMs: 120, // diệt xong bao lâu thì bug kế tiếp nhô lên
};

export const MEMORY = {
  symbols: ['{ }', '</>', '[ ]', '=>', '&&', '#!'], // mỗi ký hiệu thành một cặp
  mismatchMs: 750, // lật sai thì úp lại sau chừng này
};
