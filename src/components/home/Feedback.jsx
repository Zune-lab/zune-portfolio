import { useEffect, useRef, useState } from 'react';
import SectionHead from '../ui/SectionHead.jsx';
import Btn31 from '../ui/Btn31.jsx';
import { FEEDBACK_ENDPOINT, GOOGLE_CLIENT_ID } from '../../config/feedback.js';
import { sendFeedback } from '../../lib/feedback.js';
import { loadGsi, readToken, isFresh } from '../../lib/google-auth.js';
import { storageGet, storageSet } from '../../lib/storage.js';

const MAX_LEN = 2000; // khớp giới hạn phía Apps Script
const COOLDOWN_MS = 30 * 1000; // chống bấm gửi liên tục (cũng giữ cho khỏi cạn hạn mức mail/ngày)
const LAST_KEY = 'zune-feedback-last';

const ERRORS = {
  'not-configured': 'Feedback is not set up yet, sorry! Try the socials below.',
  rate: 'Too many messages at once, please try again in a few minutes.',
  signin: 'Sign in with Google first, so I know the email is really yours.',
  expired: 'Your Google sign-in expired. Please sign in again (your text is still here).',
  auth: 'Google sign-in could not be verified. Please sign in again (your text is still here).',
  gmail: 'Please sign in with a Gmail account (@gmail.com).',
  'gsi-failed': "Couldn't load Google sign-in (adblock or offline?). Try the socials below.",
  empty: 'Write a bit more first :)',
  timeout: 'That took too long. Your text is still here, try again.',
  network: "Couldn't reach the server. Your text is still here, try again.",
  server: 'Something went wrong on my side. Your text is still here, try again.',
};

export default function Feedback() {
  const [text, setText] = useState('');
  const [auth, setAuth] = useState(null); // { credential, email, exp } sau khi đăng nhập Google
  const [gsiState, setGsiState] = useState(GOOGLE_CLIENT_ID ? 'loading' : 'off'); // loading | ready | failed | off
  const btnRef = useRef(null);
  const openedAt = useRef(Date.now()); // thời gian điền form: gửi lên để server nhận ra bot (gõ + gửi trong vài trăm ms)
  const [mood, setMood] = useState(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState(null); // { ok: boolean, text: string } | null

  // khởi tạo nút "Sign in with Google" 1 lần
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;
    loadGsi()
      .then((gid) => {
        if (cancelled) return;
        gid.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          callback: ({ credential }) => {
            const info = readToken(credential);
            if (info) setAuth({ credential, email: info.email, exp: info.exp });
          },
        });
        setGsiState('ready');
      })
      .catch(() => !cancelled && setGsiState('failed'));
    return () => {
      cancelled = true;
    };
  }, []);

  // vẽ nút Google mỗi khi cần (lúc chưa đăng nhập)
  useEffect(() => {
    if (gsiState !== 'ready' || auth || !btnRef.current) return;
    const light = document.documentElement.dataset.theme === 'light';
    globalThis.google.accounts.id.renderButton(btnRef.current, {
      type: 'standard',
      theme: light ? 'outline' : 'filled_black',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
    });
  }, [gsiState, auth]);

  const signOut = () => {
    globalThis.google?.accounts?.id?.disableAutoSelect();
    setAuth(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const message = text.trim();
    if (!message) return;

    // ô ẩn "website": người thật không thấy nên không điền; bot điền -> giả vờ thành công, không gửi gì
    if (new FormData(e.currentTarget).get('website')) {
      setText('');
      setNote({ ok: true, text: 'Sent! Thanks for the feedback.' });
      return;
    }

    if (gsiState === 'failed') {
      setNote({ ok: false, text: ERRORS['gsi-failed'] });
      return;
    }
    if (!auth) {
      setNote({ ok: false, text: ERRORS[GOOGLE_CLIENT_ID ? 'signin' : 'not-configured'] });
      return;
    }
    if (!isFresh(auth)) {
      setAuth(null);
      setNote({ ok: false, text: ERRORS.expired });
      return;
    }

    const wait = COOLDOWN_MS - (Date.now() - (Number(storageGet(LAST_KEY)) || 0));
    if (wait > 0) {
      setNote({ ok: false, text: `Please wait ${Math.ceil(wait / 1000)}s before sending another one.` });
      return;
    }

    setSending(true);
    setNote(null);
    const res = await sendFeedback(FEEDBACK_ENDPOINT, {
      message: message.slice(0, MAX_LEN),
      credential: auth.credential,
      mood,
      elapsed: Date.now() - openedAt.current,
    });
    setSending(false);

    if (res.ok) {
      storageSet(LAST_KEY, Date.now());
      setText('');
      setMood(null);
      openedAt.current = Date.now();
      setNote({ ok: true, text: 'Sent! Thanks for the feedback.' });
    } else {
      if (res.reason === 'auth' || res.reason === 'gmail') setAuth(null); // buộc đăng nhập lại
      setNote({ ok: false, text: ERRORS[res.reason] ?? ERRORS.server }); // giữ nguyên nội dung để người dùng không mất những gì đã viết
    }
  };

  return (
    <section id="feedback" className="py-20 border-t border-line">
      <div className="wrap max-w-[1040px] mx-auto px-8">
        <SectionHead num="03" title="feedback.sh" />
        <p className="font-mono text-[12.5px] text-dim -mt-6 mb-5">
          // even a one-line note is fine, I read everything
        </p>
        <form onSubmit={handleSubmit} className="max-w-[520px] bg-inset border border-line rounded-[10px] p-5 flex flex-col gap-3.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_LEN}
            readOnly={sending}
            placeholder="Write something about this page..."
            required
            aria-label="Your feedback"
            className="w-full min-h-[110px] resize-y bg-panel border border-line rounded-lg px-3.5 py-3 text-ink text-sm outline-none focus:border-amber placeholder:text-dim"
          />
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[12px] text-dim">
              sign in with Google so I can reply (I only see your verified email, nothing else).{' '}
              <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noreferrer" className="underline hover:text-amber">
                privacy
              </a>
            </span>
            {auth ? (
              <div className="flex items-center justify-between gap-3 bg-panel border border-line rounded-lg px-3.5 py-2.5 text-sm">
                <span className="text-ink truncate" title={auth.email}>
                  {auth.email}
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={sending}
                  className="font-mono text-[12px] text-dim hover:text-amber transition-colors"
                >
                  change
                </button>
              </div>
            ) : gsiState === 'off' ? (
              <span className="font-mono text-[12px] text-dim">Feedback is not set up yet.</span>
            ) : gsiState === 'failed' ? (
              <span className="font-mono text-[12px]" style={{ color: 'var(--amber)' }}>
                {ERRORS['gsi-failed']}
              </span>
            ) : (
              <div ref={btnRef} className="min-h-[44px]" />
            )}
          </div>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] w-px h-px opacity-0"
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
              disabled={sending}
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
              {sending ? 'sending...' : 'send'}
            </Btn31>
          </div>
          <span
            role="status"
            className="font-mono text-xs min-h-[16px]"
            style={{ color: note?.ok ? 'var(--green)' : 'var(--amber)' }}
          >
            {note?.text}
          </span>
        </form>
      </div>
    </section>
  );
}
