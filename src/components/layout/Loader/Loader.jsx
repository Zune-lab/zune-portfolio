import './Loader.css';

export default function Loader() {
  return (
    <div className="page-loader fixed inset-0 z-[90] flex items-center justify-center">
      <div className="loader">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="loader-square" />
        ))}
      </div>
    </div>
  );
}
