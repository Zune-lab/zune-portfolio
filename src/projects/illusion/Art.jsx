import './Art.css';

// ảo giác thuần CSS: tia quay chậm chồng lên vòng tròn đứng yên -> gợn moiré như đang xoáy
export default function Art() {
  return (
    <div className="illusion-art">
      <span className="illusion-spin" />
      <span className="illusion-rings" />
    </div>
  );
}
