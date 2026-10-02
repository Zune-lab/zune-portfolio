import './CopyEmail.css';

// Email chip with a copy button: the address is always visible (nothing to hunt for), the icon box is amber so it
// reads as a button, and the clipboard icon swaps to a check once copied.
// Idea: the "copy to clipboard + tooltip" elements on uiverse.io; markup and styles are our own, on the site's theme vars.
export default function CopyEmail({ email, copied, onCopy }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      data-copied={copied}
      aria-label={copied ? 'Email address copied' : `Copy email address ${email}`}
      className="copy-mail font-mono"
    >
      <span className="copy-mail-addr">{email}</span>
      <span className="copy-mail-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="copy-mail-svg copy-mail-clip" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="8" width="12" height="12" rx="2.5" />
          <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
        </svg>
        <svg viewBox="0 0 24 24" className="copy-mail-svg copy-mail-check" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="copy-mail-tip" aria-hidden="true">
        <span className="copy-mail-tip-idle">click to copy</span>
        <span className="copy-mail-tip-done">copied!</span>
      </span>
      <span role="status" className="sr-only">
        {copied ? 'Email address copied to clipboard' : ''}
      </span>
    </button>
  );
}
