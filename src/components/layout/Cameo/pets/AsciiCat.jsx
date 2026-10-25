import { useEffect, useState } from 'react';
import useBubble from '../shared/useBubble.js';
import './AsciiCat.css';

// Mèo vẽ bằng chữ đi dạo dưới đáy màn hình (skin crt-amber). Bấm vào thì nó ngồi xuống kêu meo rồi đi tiếp.
const WALK_A = ['  /\\_/\\  ', ' ( o.o ) ~', '  > ^ <  ', '  /|_|\\  '].join('\n');
const WALK_B = ['  /\\_/\\  ', ' ( o.o )~ ', '  > ^ <  ', '  _/ \\_  '].join('\n');
const SIT = ['  /\\_/\\  ', ' ( -.- )  ', '  > ^ <  ', ' (_____)~ '].join('\n');
const SOUNDS = ['meow', 'mrrp?', 'purr~', 'meow meow', '*stares at cursor*'];

export default function AsciiCat() {
  const [sit, setSit] = useState(false);
  const [n, setN] = useState(0);
  const { text, say } = useBubble(2200);

  useEffect(() => {
    if (!sit) return undefined;
    const id = setTimeout(() => setSit(false), 4200);
    return () => clearTimeout(id);
  }, [sit]);

  return (
    <div className={`acat ${sit ? 'is-sit' : ''}`}>
      <div className="acat-flip">
        <button
          type="button"
          className="acat-hit"
          aria-label="pet the ascii cat"
          title="pet the cat"
          onClick={() => {
            setSit(true);
            setN((v) => v + 1);
            say(SOUNDS[n % SOUNDS.length]);
          }}>
          {sit ? (
            <pre>{SIT}</pre>
          ) : (
            <>
              <pre className="acat-f1">{WALK_A}</pre>
              <pre className="acat-f2">{WALK_B}</pre>
            </>
          )}
        </button>
      </div>
      {text && <div className="cameo-bubble acat-bubble">{text}</div>}
    </div>
  );
}
