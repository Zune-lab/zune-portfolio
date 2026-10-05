import { useSyncExternalStore } from 'react';
import { isOnlineHour } from './siteTime.js';
import { storageGet, storageSet } from './storage.js';
import { storageKey } from '../config/site.js';
import { createEmitter } from './store.js';
import { pausableInterval } from './timers.js';

// online/offline is inferred from the Vietnam clock (no backend needed);
// busy/focus can only be picked by hand, a machine can't know those.
// `label` is shown on the Hero badge, `blurb` is what the terminal prints.
const STATUS_CONFIG = {
  online: { label: 'online', blurb: 'open to new projects', color: 'var(--green)', pulse: true },
  offline: { label: 'offline', blurb: 'offline right now, will reply later', color: 'var(--text-dim)', pulse: false },
  busy: { label: 'busy - replies may be slow', blurb: 'busy, replies may be slow', color: 'var(--amber)', pulse: false },
  focus: { label: 'in focus mode', blurb: 'in focus mode, replies may be slow', color: 'var(--css-lang)', pulse: false },
};

const CYCLE = ['auto', 'busy', 'focus', 'offline'];
const STORAGE_KEY = storageKey('status-override');

const autoStatus = () => (isOnlineHour() ? 'online' : 'offline');

function readOverride() {
  const v = storageGet(STORAGE_KEY);
  return CYCLE.includes(v) ? v : 'auto';
}

// One shared store, so the Hero badge and the terminal can never disagree.
let override = readOverride();
let stopClock = null;

const current = () => (override === 'auto' ? autoStatus() : override);
export const getStatusKey = current; // đọc nhanh cho code ngoài React (social.js, canvas)
// snapshot is a string so React can compare it cheaply; it includes `override` so the "· auto" tag also updates
// when cycling back to auto lands on the same status key
const snapshot = () => `${override}:${current()}`;

// re-check the clock once a minute (sleeps while the screensaver runs or the tab is hidden); React only re-renders on change
const { subscribe, emit } = createEmitter({
  onFirst: () => (stopClock = pausableInterval(() => emit(), 60 * 1000)),
  onLast: () => {
    stopClock?.();
    stopClock = null;
  },
});

export function cycleStatus() {
  override = CYCLE[(CYCLE.indexOf(override) + 1) % CYCLE.length];
  storageSet(STORAGE_KEY, override === 'auto' ? null : override); // if storage is blocked the override lives for this session only
  emit();
}

export function useStatus() {
  const [mode, key] = useSyncExternalStore(subscribe, snapshot).split(':');
  return { key, isAuto: mode === 'auto', ...STATUS_CONFIG[key] };
}
