import { useEffect, useState } from 'react';
import { Link, useRouter } from '../router';
import { api } from '../api';
import { useStore } from '../store';
import { ConfirmDialog, ErrorBox, Icon, Loading, maskPhone } from '../components/ui';

export default function Profile() {
  const { user, logout } = useStore();
  const { navigate } = useRouter();
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Confirm the session with the backend: /api/auth/me only answers for a token issued after a
  // successful OTP check. A 401 means the session expired, so drop it and show the login prompt.
  useEffect(() => {
    if (!user) return;
    setMe(null); setError(null);
    api.me()
      .then(setMe)
      .catch((err) => (err.status === 401 ? logout() : setError(err.message)));
  }, [user?.token]);

  function doLogout() {
    setConfirmOpen(false);
    logout();
    navigate('/', { replace: true });
  }

  if (!user) {
    return (
      <div className="container section narrow center">
        <h1>Account</h1>
        <p className="muted">Log in with your mobile number to see your account and bookings.</p>
        <Link to="/login?next=/profile" className="btn btn-primary">Log in with OTP</Link>
      </div>
    );
  }

  return (
    <div className="container section account-wrap">
      <h1 className="account-title">Account</h1>

      {error && <ErrorBox message={error} />}
      {!me && !error && <Loading label="Loading your account…" />}

      {(me || error) && (
        <>
          <section className="card account-card" aria-label="Your account">
            <span className="avatar"><Icon name="user" size={28} /></span>
            <div>
              <p className="account-phone">+91 {maskPhone(me?.phone ?? user.phone)}</p>
              {me?.otpVerified && (
                <span className="account-sub"><Icon name="check" size={14} /> Verified mobile number</span>
              )}
            </div>
          </section>

          <nav className="card menu" aria-label="Account menu">
            <Link to="/bookings" className="menu-row">
              <span className="menu-icon"><Icon name="calendar" size={18} /></span>
              <span className="menu-label">My bookings</span>
              <Icon name="chevr" size={18} className="menu-chev" />
            </Link>
            <button type="button" className="menu-row danger" onClick={() => setConfirmOpen(true)}>
              <span className="menu-icon"><Icon name="logout" size={18} /></span>
              <span className="menu-label">Log out</span>
            </button>
          </nav>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Log out?"
        message="Are you sure you want to log out? You'll need to verify your mobile number with an OTP to log in again."
        confirmLabel="Log out"
        danger
        onConfirm={doLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
