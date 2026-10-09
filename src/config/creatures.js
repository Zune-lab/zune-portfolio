// CÂN CHỈNH CÁC SINH VẬT KINH DỊ TRONG LAB (Parasite, Choir): số liệu, màu, font nằm ở đây thay vì rải trong mã vẽ.
// Hình học (toạ độ mũi tên con trỏ, đường cong thân người...) vẫn nằm trong mã vì sửa số đó là sửa hình, không phải cân chỉnh.

// font đơn cách dùng chung cho chữ trên canvas
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export const PARASITE = {
  segPx: 5, // khoảng cách giữa hai đốt giun
  lightRadius: 80, // bán kính vòng sáng (px)
  flareSeconds: 0.38, // flare kéo dài bao lâu
  flareCooldownS: 5, // hồi flare
  // len = số đốt, w = độ dày, burn = giây ánh sáng đầy đủ để đốt chết, speed = nhân tốc độ bò
  kinds: {
    worm: { len: 46, w: 1, burn: 1.5, speed: 1, dash: true },
    thick: { len: 36, w: 1.9, burn: 3.6, speed: 0.62, dash: false },
    needle: { len: 56, w: 0.7, burn: 0.8, speed: 1.7, dash: true },
  },
  // nền luôn tối bất kể theme (đèn pin chỉ có nghĩa trong bóng tối)
  colors: { worm: '#d8d2c4', dark: '#06070a', cursorPanel: '#ecebe6', cursorInk: '#0a0a0c' },
  fonts: { hud: `12px ${MONO}`, banner: `600 18px ${MONO}`, lose: `600 22px ${MONO}` },
};

export const CHOIR = {
  maxSingers: 14,
  chord: [0, 7, 12, 15, 19, 24, 27, 31, 36], // nửa cung so với nốt gốc, mỗi người một nốt
  tilts: [-0.12, 0, 0.1, 0.28, -0.3, 0.55, -0.6, 1.0, -1.0], // các góc nghiêng đầu (rad)
  colors: { robe: '#0a0b0e', skin: '#b9b2a2', edge: 'rgba(215,210,195,0.22)', text: '#ebe4d2' },
  font: `14px ${MONO}`,
};
