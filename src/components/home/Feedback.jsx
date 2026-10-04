import { useState } from 'react';
import SectionHead from '../ui/SectionHead.jsx';
import Btn31 from '../ui/Btn31/Btn31.jsx';
import CopyEmail from './CopyEmail/CopyEmail.jsx';

const MAX_MAILTO = 1900;
const TO_EMAIL = 'nguyenhaivuong06@gmail.com';

export default function Feedback() {
  const [text, setText] = useState('');
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);

  // máy không có app mail thì mailto: không làm gì cả -> cho copy địa chỉ để gửi bằng cách khác
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(TO_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNote(`Couldn't copy automatically, my email is ${TO_EMAIL}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;

    const moodTag = mood === 'good' ? ' (liked it)' : mood === 'bad' ? ' (not a fan)' : '';
    const subject = encodeURIComponent('Feedback from zune.dev' + moodTag);
    const head = `mailto:${TO_EMAIL}?subject=${subject}&body=`;
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
        ? `Message was too long for a mail link, so it was trimmed (full text copied to clipboard if allowed). Or email ${TO_EMAIL} directly.`
        : `Mail app should open. If nothing happens, email ${TO_EMAIL} directly - thanks!`
    );
  };

  return (
    <section id="feedback" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="04" title="feedback.sh" />
        <p className="font-mono text-[12.5px] text-dim -mt-6 mb-5">
          // even a one-line note is fine, I read everything
        </p>
        <form onSubmit={handleSubmit} className="max-w-[520px] bg-inset border border-line rounded-[10px] p-5 flex flex-col gap-3.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write something about this page..."
            required
            aria-label="Your feedback"
            className="w-full min-h-[110px] resize-y bg-panel border border-line rounded-lg px-3.5 py-3 text-ink text-sm outline-none focus:border-amber placeholder:text-dim"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMood(mood === 'good' ? null : 'good')}
                aria-label="I like this page"
                aria-pressed={mood === 'good'}
                className={`w-[38px] h-[38px] flex items-center justify-center rounded-lg border transition-colors duration-300 ${
                  mood === 'good' ? 'bg-amber border-amber' : 'bg-panel border-line text-dim hover:border-amber-dim hover:text-amber'
                }`}
                style={mood === 'good' ? { color: '#0A0C10' } : undefined}
              >
                <svg viewBox="0 0 512 512" className="w-[18px] h-[18px]">
                  <path
                    fill="currentColor"
                    d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm177.6 62.1C192.8 334.5 218.8 352 256 352s63.2-17.5 78.4-33.9c9-9.7 24.2-10.4 33.9-1.4s10.4 24.2 1.4 33.9c-22 23.8-60 49.4-113.6 49.4s-91.7-25.5-113.6-49.4c-9-9.7-8.4-24.9 1.4-33.9s24.9-8.4 33.9 1.4zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm192-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setMood(mood === 'bad' ? null : 'bad')}
                aria-label="Not a fan"
                aria-pressed={mood === 'bad'}
                className={`w-[38px] h-[38px] flex items-center justify-center rounded-lg border transition-colors duration-300 ${
                  mood === 'bad' ? 'bg-amber border-amber' : 'bg-panel border-line text-dim hover:border-amber-dim hover:text-amber'
                }`}
                style={mood === 'bad' ? { color: '#0A0C10' } : undefined}
              >
                <svg viewBox="0 0 512 512" className="w-[18px] h-[18px]">
                  <path
                    fill="currentColor"
                    d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM174.6 384.1c-4.5 12.5-18.2 18.9-30.7 14.4s-18.9-18.2-14.4-30.7C146.9 319.4 198.9 288 256 288s109.1 31.4 126.6 79.9c4.5 12.5-2 26.2-14.4 30.7s-26.2-2-30.7-14.4C328.2 358.5 297.2 336 256 336s-72.2 22.5-81.4 48.1zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm192-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"
                  />
                </svg>
              </button>
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
        <div className="mt-6 max-w-[520px]">
          <p className="font-mono text-[12.5px] text-dim mb-3">// no mail app? copy my email and write from anywhere</p>
          <CopyEmail email={TO_EMAIL} copied={copied} onCopy={copyEmail} />
        </div>
      </div>
    </section>
  );
}
