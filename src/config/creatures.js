// CÂN CHỈNH CÁC SINH VẬT KINH DỊ TRONG LAB (Choir): số liệu, màu, font nằm ở đây thay vì rải trong mã vẽ.
// Hình học (toạ độ mũi tên con trỏ, đường cong thân người...) vẫn nằm trong mã vì sửa số đó là sửa hình, không phải cân chỉnh.

// font đơn cách dùng chung cho chữ trên canvas
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export const CHOIR = {
  maxSingers: 14,
  chord: [0, 7, 12, 15, 19, 24, 27, 31, 36], // nửa cung so với nốt gốc, mỗi người một nốt
  tilts: [-0.12, 0, 0.1, 0.28, -0.3, 0.55, -0.6, 1.0, -1.0], // các góc nghiêng đầu (rad)
  colors: { robe: '#0a0b0e', skin: '#b9b2a2', edge: 'rgba(215,210,195,0.22)', text: '#ebe4d2' },
  font: `14px ${MONO}`,
};
