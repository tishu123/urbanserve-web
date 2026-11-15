import { useEffect, useState } from 'react';
import { Link } from '../router';
import { api } from '../api';
import { useStore } from '../store';
import { ErrorBox, Icon, Loading } from '../components/ui';

const VIA_LABEL = { messagecentral: 'SMS (Message Central)', sns: 'SMS', log: 'test code (server log)' };

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export default function Profile() {
  const { user, logout } = useStore();
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);

  // Ask the backend to confirm the session: /api/auth/me only answers for a token that was
  // issued after a successful OTP check, so a reply here is the server's confirmation.
  useEffect(() => {
    if (!user) return;
    setMe(null); setError(null);
    api.me()
      .then(setMe)
      .catch((err) => {
        if (err.status === 401) { logout(); return; } // token expired or not OTP-verified
        setError(err.message);
      });
  }, [user?.token]);

  if (!user) {
    return (
      <div className="container section narrow center">
        <h1>Profile</h1>
        <p className="muted">You're not logged in. Log in with your mobile number to see your profile.</p>
        <Link to="/login?next=/profile" className="btn btn-primary">Log in with OTP</Link>
      </div>
    );
  }

  return (
    <div className="container section auth-wrap">
      <div className="card auth-card profile-card">
        {!me && !error && <Loading label="Confirming your login with the server…" />}
        {error && <ErrorBox message={error} />}

        {me && (
          <>
            <span className="profile-check"><Icon name="check" size={26} /></span>
            <h1>You're logged in</h1>
            <p className="profile-phone">+91 {me.phone}</p>
            {me.otpVerified && (
              <p className="verified-pill"><Icon name="shield" size={14} /> Mobile number verified by OTP</p>
            )}

            <dl className="profile-list">
              <div><dt>Verified via</dt><dd>{VIA_LABEL[me.verifiedVia] || me.verifiedVia || 'OTP'}</dd></div>
              <div><dt>Logged in at</dt><dd>{fmt(me.loggedInAt)}</dd></div>
              <div><dt>Session valid until</dt><dd>{fmt(me.expiresAt)}</dd></div>
              <div><dt>Account type</dt><dd>{me.roles.includes('ADMIN') ? 'Admin' : 'Customer'}</dd></div>
            </dl>

            <div className="profile-actions">
              <Link to="/bookings" className="btn btn-primary btn-block">My bookings</Link>
              <Link to="/" className="btn btn-ghost btn-block">Book a service</Link>
              <button className="link-btn" onClick={logout}>Log out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
