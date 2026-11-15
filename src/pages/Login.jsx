import { useEffect, useRef, useState } from 'react';
import { useQuery, useRouter } from '../router';
import { useStore } from '../store';
import { api } from '../api';
import { ErrorBox, Icon } from '../components/ui';

// Only allow redirects to paths inside this app (prevents open redirects via ?next=).
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/login') ? n : '/');

export default function Login() {
  const { user, login } = useStore();
  const { navigate } = useRouter();
  const next = safeNext(useQuery().get('next'));

  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => { if (user) navigate(next, { replace: true }); }, [user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  async function sendCode(e) {
    e?.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit mobile number.'); return; }
    setBusy(true); setError(null);
    try {
      const res = await api.requestOtp(phone);
      setStep('code');
      setCode('');
      setCooldown(res.resendAfterSeconds ?? 30);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  async function verify(e) {
    e?.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code.'); return; }
    setBusy(true); setError(null);
    try {
      login(await api.verifyOtp(phone, code)); // effect above redirects to `next`
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally { setBusy(false); }
  }

  return (
    <div className="container section auth-wrap">
      <div className="card auth-card">
        <span className="why-icon"><Icon name="shield" /></span>
        {step === 'phone' ? (
          <form onSubmit={sendCode} noValidate>
            <h1>Log in</h1>
            <p className="muted">We’ll send a 6-digit code to your mobile number.</p>
            <label className="field">
              <span className="field-label">Mobile number</span>
              <div className="phone-input"><span>+91</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder="10-digit number" autoFocus />
              </div>
            </label>
            {error && <ErrorBox message={error} />}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
          </form>
        ) : (
          <form onSubmit={verify} noValidate>
            <h1>Enter code</h1>
            <p className="muted">
              Sent to +91 {phone}.{' '}
              <button type="button" className="link-btn" onClick={() => { setStep('phone'); setError(null); }}>Change</button>
            </p>
            <label className="field">
              <span className="field-label">6-digit code</span>
              <input ref={codeRef} className="otp-input" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" />
            </label>
            {error && <ErrorBox message={error} />}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
            <p className="muted small center">
              {cooldown > 0
                ? `Resend code in ${cooldown}s`
                : <button type="button" className="link-btn" onClick={sendCode} disabled={busy}>Resend code</button>}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
