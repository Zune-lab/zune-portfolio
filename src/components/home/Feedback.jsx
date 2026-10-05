import { useState } from 'react';
import Btn31 from '../ui/Btn31/Btn31.jsx';
import CopyEmail from './CopyEmail/CopyEmail.jsx';
import { site } from '../../config/site.js';
import useTimer from '../../lib/useTimer.js';

const MAX_MAILTO = 1900;

// icon mặt cười / mặt buồn (Font Awesome, viewBox 512)
const GOOD_FACE =
  'M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm177.6 62.1C192.8 334.5 218.8 352 256 352s63.2-17.5 78.4-33.9c9-9.7 24.2-10.4 33.9-1.4s10.4 24.2 1.4 33.9c-22 23.8-60 49.4-113.6 49.4s-91.7-25.5-113.6-49.4c-9-9.7-8.4-24.9 1.4-33.9s24.9-8.4 33.9 1.4zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm192-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z';
const BAD_FACE =
  'M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM174.6 384.1c-4.5 12.5-18.2 18.9-30.7 14.4s-18.9-18.2-14.4-30.7C146.9 319.4 198.9 288 256 288s109.1 31.4 126.6 79.9c4.5 12.5-2 26.2-14.4 30.7s-26.2-2-30.7-14.4C328.2 358.5 297.2 336 256 336s-72.2 22.5-81.4 48.1zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm192-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z';

// nút chọn cảm xúc: bật thì nền amber, chữ tối
function MoodButton({ label, on, onClick, path }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      className={`w-[38px] h-[38px] flex items-center justify-center rounded-lg border transition-colors duration-300 ${
        on ? 'bg-amber border-amber' : 'bg-panel border-line text-dim hover:border-amber-dim hover:text-amber'
      }`}
      style={on ? { color: 'var(--on-amber)' } : undefined}
    >
      <svg viewBox="0 0 512 512" className="w-[18px] h-[18px]">
        <path fill="currentColor" d={path} />
      </svg>
    </button>
  );
}

export default function Feedback() {
  const [text, setText] = useState('');
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const copiedT = useTimer(); // bấm liên tiếp: set() huỷ lượt trước nên "copied" không tắt sớm

  // máy không có app mail thì mailto: không làm gì cả -> cho copy địa chỉ để gửi bằng cách khác
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      copiedT.set(() => setCopied(false), 2000);
    } catch {
      setNote(`Couldn't copy automatically, my email is ${site.email}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;

    const moodTag = mood === 'good' ? ' (liked it)' : mood === 'bad' ? ' (not a fan)' : '';
    const subject = encodeURIComponent(`Feedback from ${site.handle}` + moodTag);
    const head = `mailto:${site.email}?subject=${subject}&body=`;
    // link mailto: dài quá ~2000 ký tự sẽ bị một số client cắt im lặng -> cắt trước và báo cho người dùng
    let body = encodeURIComponent(message);
    let cut = false;
    if (head.length + body.length > MAX_MAILTO) {
      cut = true;
      const chars = Array.from(message); // theo code point: cắt giữa emoji sẽ làm encodeURIComponent ném URIError
      let n = chars.length;
      while (n > 0 && head.length + encodeURIComponent(chars.slice(0, n).join('')).length > MAX_MAILTO) n -= 50;
      body = encodeURIComponent(chars.slice(0, Math.max(n, 0)).join(''));
      navigator.clipboard?.writeText(message).catch(() => {}); // bản đầy đủ nằm trong clipboard
    }
    window.location.href = head + body;

    // giữ nguyên nội dung: nếu máy không có ứng dụng mail thì người dùng không mất những gì đã viết
    setNote(
      cut
        ? `Message was too long for a mail link, so it was trimmed (full text copied to clipboard if allowed). Or email ${site.email} directly.`
        : `Mail app should open. If nothing happens, email ${site.email} directly - thanks!`
    );
  };

  return (
    <div>
        <p className="font-mono text-[12.5px] text-dim mb-5">
          // even a one-line note is fine, I read everything
        </p>
        <form onSubmit={handleSubmit} className="bg-inset border border-line rounded-[10px] p-5 flex flex-col gap-3.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write something about this page..."
            required
            aria-label="Your feedback"
            className="w-full min-h-[110px] resize-y bg-panel border border-line rounded-lg px-3.5 py-3 text-ink text-sm outline-hidden focus:border-amber placeholder:text-dim"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <MoodButton label="I like this page" on={mood === 'good'} onClick={() => setMood(mood === 'good' ? null : 'good')} path={GOOD_FACE} />
              <MoodButton label="Not a fan" on={mood === 'bad'} onClick={() => setMood(mood === 'bad' ? null : 'bad')} path={BAD_FACE} />
            </div>
            <Btn31
              type="submit"
              icon={
                <svg fill="none" viewBox="0 0 24 24" className="w-full h-full">
                  <path
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    d="M7.4 6.32L15.89 3.49c3.81-1.27 5.88.81 4.62 4.62L17.68 16.6c-1.9 5.71-5.02 5.71-6.92 0l-.84-2.52-2.52-.84c-5.71-1.9-5.71-5.01 0-6.92z"
                  />
                  <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="1.5" stroke="currentColor" d="M10.11 13.65l3.58-3.59" />
                </svg>
              }
            >
              send
            </Btn31>
          </div>
          <span role="status" className="font-mono text-xs empty:-mt-3.5" style={{ color: 'var(--green)' }}>
            {note}
          </span>
        </form>
        <div className="mt-6">
          <p className="font-mono text-[12.5px] text-dim mb-3">// no mail app? copy my email and write from anywhere</p>
          <CopyEmail email={site.email} copied={copied} onCopy={copyEmail} />
        </div>
    </div>
  );
}
