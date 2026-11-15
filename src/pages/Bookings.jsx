import { useEffect, useState } from 'react';
import { Link, useQuery } from '../router';
import { api } from '../api';
import { useStore } from '../store';
import { ErrorBox, Icon, Loading, Stars, StatusPill, maskPhone } from '../components/ui';

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const CANCELLABLE = ['PENDING', 'CONFIRMED'];

function BookingCard({ b, onCancel, busy }) {
  return (
    <article className="card booking-card">
      <div className="booking-head">
        <div>
          <div className="booking-id">Booking #{b.id}</div>
          <h3>{b.category?.name}</h3>
        </div>
        <StatusPill status={b.status} />
      </div>
      <div className="booking-grid">
        <div><Icon name="clock" size={16} /> {fmtWhen(b.scheduledAt)}</div>
        <div><Icon name="pin" size={16} /> {b.address}</div>
        {b.provider && (
          <div><Icon name="users" size={16} /> {b.provider.name} <Stars value={b.provider.rating} /></div>
        )}
      </div>
      {onCancel && CANCELLABLE.includes(b.status) && (
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onCancel(b)}>
          {busy ? 'Cancelling…' : 'Cancel booking'}
        </button>
      )}
    </article>
  );
}

export function MyBookings() {
  const { user } = useStore();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true); setError(null);
    api.myBookings().then(setList).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [user?.phone]);

  async function cancel(b) {
    if (!window.confirm(`Cancel booking #${b.id} for ${b.category?.name}?`)) return;
    setBusyId(b.id);
    try {
      const updated = await api.updateStatus(b.id, 'CANCELLED');
      setList((l) => l.map((x) => (x.id === b.id ? updated : x)));
    } catch (err) { setError(err.message); }
    finally { setBusyId(null); }
  }

  if (!user) {
    return (
      <div className="container section narrow center">
        <h1>My bookings</h1>
        <p className="muted">Log in with your mobile number to see and manage your bookings.</p>
        <Link to="/login?next=/bookings" className="btn btn-primary">Log in with OTP</Link>
      </div>
    );
  }

  return (
    <div className="container section narrow">
      <h1>My bookings</h1>
      <p className="muted">Bookings for +91 {maskPhone(user.phone)}</p>
      {error && <ErrorBox message={error} />}
      {loading && <Loading />}
      {list && !loading && (list.length === 0
        ? <p className="muted">You have no bookings yet. <Link to="/">Book a service</Link></p>
        : <div className="booking-list">{list.map((b) => <BookingCard key={b.id} b={b} onCancel={cancel} busy={busyId === b.id} />)}</div>)}
    </div>
  );
}

export function BookingSuccess() {
  const ids = (useQuery().get('ids') || '').split(',').filter(Boolean);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all(ids.map((id) => api.booking(id))).then(setItems).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="container section narrow">
      <div className="success-hero">
        <span className="success-icon"><Icon name="check" size={36} /></span>
        <h1>Booking placed!</h1>
        <p className="muted">We’ve assigned a professional. You’ll see status updates in My bookings.</p>
      </div>
      {error && <ErrorBox message={error} />}
      {!items && !error && <Loading />}
      {items && <div className="booking-list">{items.map((b) => <BookingCard key={b.id} b={b} />)}</div>}
      <div className="center gap">
        <Link to="/bookings" className="btn btn-primary">View my bookings</Link>
        <Link to="/" className="btn btn-ghost">Back to home</Link>
      </div>
    </div>
  );
}
