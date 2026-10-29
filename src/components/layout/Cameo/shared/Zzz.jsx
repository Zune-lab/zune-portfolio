// Ba chữ z bay lên khi nhân vật ngủ. Đặt bên trong phần tử gốc của nhân vật (phải là position: absolute / relative).
export default function Zzz({ show }) {
  if (!show) return null;
  return (
    <span className="pet-zzz" aria-hidden="true">
      <i>z</i>
      <i>z</i>
      <i>Z</i>
    </span>
  );
}
