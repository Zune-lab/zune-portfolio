import { useEffect, useState } from 'react';
import Btn31 from '../ui/Btn31/Btn31.jsx';
import ContactButton from './ContactButton/ContactButton.jsx';
import Terminal from './Terminal/Terminal.jsx';
import { isOnlineHour } from '../../lib/vnTime.js';
import { storageGet, storageSet } from '../../lib/storage.js';

// online/offline is inferred from the Vietnam clock (no backend needed);
// busy/focus can only be picked by hand, a machine can't know those.
const STATUS_CONFIG = {
  online: { label: 'online', color: 'var(--green)', pulse: true },
  offline: { label: 'offline', color: 'var(--text-dim)', pulse: false },
  busy: { label: 'busy - replies may be slow', color: 'var(--amber)', pulse: false },
  focus: { label: 'in focus mode', color: 'var(--css-lang)', pulse: false },
};

const CYCLE = ['auto', 'busy', 'focus', 'offline'];
const STORAGE_KEY = 'zune-status-override';

function autoStatusByHour() {
  return isOnlineHour() ? 'online' : 'offline';
}

function readOverride() {
  const v = storageGet(STORAGE_KEY);
  return CYCLE.includes(v) ? v : 'auto';
}

export default function Hero({ onNavigate }) {
  const [override, setOverride] = useState(readOverride);
  const [autoStatus, setAutoStatus] = useState(autoStatusByHour);

  useEffect(() => {
    const id = setInterval(() => setAutoStatus(autoStatusByHour()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const status = STATUS_CONFIG[override === 'auto' ? autoStatus : override];

  const cycleStatus = () => {
    const next = CYCLE[(CYCLE.indexOf(override) + 1) % CYCLE.length];
    setOverride(next);
    storageSet(STORAGE_KEY, next === 'auto' ? null : next); // storage bị chặn thì override chỉ sống trong phiên này
  };

  return (
    <header className="hero relative pt-12 pb-[130px]">
      <div className="wrap max-w-[1040px] mx-auto px-8 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-14 items-start">
        <div>
          <button
            type="button"
            onClick={cycleStatus}
            title="Click to change status (auto → busy → focus → offline). Saved on this device only."
            className="font-pixel text-[11px] tracking-wide mb-[22px] flex items-center gap-2 cursor-pointer"
            style={{ color: status.color }}
          >
            <span className="relative flex h-2 w-2">
              {status.pulse && (
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                  style={{ background: status.color }}
                />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: status.color }} />
            </span>
            {status.label}
            {override === 'auto' && <span className="opacity-60">· auto</span>}
          </button>
          <h1 className="font-mono font-bold leading-[1.25] tracking-[-0.5px] text-[clamp(34px,5vw,52px)]">
            Hi, I'm <span className="text-amber">Zune</span>.<br />
            I code for fun.
          </h1>
          <p className="mt-5 text-dim text-base max-w-[420px]">
            Web developer in Ho Chi Minh City. I love messing around with CSS and building tiny pages just to see
            if they work.
          </p>
          <div className="flex gap-3.5 mt-9 flex-wrap items-center">
            <Btn31 onClick={() => onNavigate?.('projects')}>view projects</Btn31>
            <ContactButton href="#socials" />
          </div>
        </div>
        <Terminal onNavigate={onNavigate} />
      </div>
    </header>
  );
}
