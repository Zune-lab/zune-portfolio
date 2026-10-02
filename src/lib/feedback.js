// Gửi feedback tới endpoint (Google Apps Script web app của chủ site, xem scripts/feedback-apps-script.gs).
// Body là chuỗi (Content-Type text/plain) chứ KHÔNG đặt application/json: như vậy là "simple request",
// trình duyệt không gửi preflight OPTIONS — Apps Script không trả lời được OPTIONS nên sẽ bị chặn CORS.
// payload gồm { message, credential (Google ID token), mood, elapsed }; server tự xác minh credential.
// Trả về { ok: true } hoặc { ok: false, reason: 'not-configured' | 'rate' | 'empty' | 'auth' | 'gmail' | 'server' | 'timeout' | 'network' }.
export async function sendFeedback(endpoint, payload, { fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  if (!endpoint) return { ok: false, reason: 'not-configured' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(endpoint, { method: 'POST', body: JSON.stringify(payload), signal: ctrl.signal });
    const data = await res.json();
    if (data && data.ok) return { ok: true };
    const known = ['rate', 'empty', 'auth', 'gmail'];
    return { ok: false, reason: data && known.includes(data.error) ? data.error : 'server' };
  } catch {
    return { ok: false, reason: ctrl.signal.aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
