import { useEffect, useRef, useState } from 'react';
import { Link, useQuery } from '../router';
import { api } from '../api';
import { useStore } from '../store';
import { ConfirmDialog, ErrorBox, Icon, Loading, Stars, StatusPill, maskPhone } from '../components/ui';

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const CANCELLABLE = ['PENDING', 'CONFIRMED'];
const POLL_MS = 3000;
const POLL_FOR_MS = 3 * 60 * 1000;

/**
 * Re-fetches while any booking is still PENDING (dispatch is finding a professional), so the card
 * flips to Confirmed without a manual refresh. Stops after 3 minutes or when nothing is pending.
 */
function usePollWhilePending(list, refetch) {
  const started = useRef(Date.now());
  const pending = (list || []).some((b) => b.status === 'PENDING');
  useEffect(() => {
    if (!pending || Date.now() - started.current > POLL_FOR_MS) return;
    const t = setTimeout(refetch, POLL_MS);
    return () => clearTimeout(t);
  }, [list]);
}

function BookingCard({ b, onCancel, busy }) {
  const pro = b.assignedProvider;
  const noPro = b.status === 'CANCELLED' && b.statusReason;
  return (
    <article className="card booking-card">
      <div className="booking-head">
        <div>
          <div className="booking-id">Booking #{b.id}</div>
          <h3>{b.category?.name}</h3>
        </div>
        {noPro ? <span className="pill pill-cancelled">Not available</span> : <StatusPill status={b.status} />}
      </div>

      {b.status === 'PENDING' && (
        <div className="dispatch-note finding"><span className="spinner" /> Finding the best available professional for you…</div>
      )}

      {pro && b.status !== 'CANCELLED' && (
        <div className="pro-row">
          <span className="pro-avatar">{pro.name?.[0] || '?'}</span>
          <div className="pro-info">
            <b>{pro.name}</b>
            {pro.rating != null && <Stars value={pro.rating} />}
            {b.arrivalWindowStart && (
              <span className="muted">Arriving {fmtTime(b.arrivalWindowStart)} – {fmtTime(b.arrivalWindowEnd)}, {fmtDay(b.arrivalWindowStart)}</span>
            )}
          </div>
          {pro.phone && <a className="btn btn-outline btn-sm" href={`tel:+91${pro.phone}`}>Call</a>}
        </div>
      )}

      {noPro && (
        <div className="dispatch-note unavailable">
          {b.statusReason}. <Link to="/">Try another time slot</Link>
        </div>
      )}

      <div className="booking-grid">
        <div><Icon name="clock" size={16} /> {fmtWhen(b.scheduledAt)}</div>
        <div><Icon name="pin" size={16} /> {b.address}{b.city ? `, ${b.city}` : ''}</div>
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
  const [toCancel, setToCancel] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true); setError(null);
    api.myBookings().then(setList).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [user?.phone]);

  usePollWhilePending(list, () => api.myBookings().then(setList).catch(() => { /* keep last list */ }));

  async function cancel(b) {
    setToCancel(null);
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
        : <div className="booking-list">{list.map((b) => <BookingCard key={b.id} b={b} onCancel={setToCancel} busy={busyId === b.id} />)}</div>)}
      <ConfirmDialog
        open={!!toCancel}
        title="Cancel booking?"
        message={toCancel ? `Cancel your ${toCancel.category?.name} booking for ${fmtWhen(toCancel.scheduledAt)}?` : ''}
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        danger
        onConfirm={() => cancel(toCancel)}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}

export function BookingSuccess() {
  const ids = (useQuery().get('ids') || '').split(',').filter(Boolean);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  const load = () => Promise.all(ids.map((id) => api.booking(id))).then(setItems);
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  usePollWhilePending(items, () => load().catch(() => { /* keep last */ }));

  const pending = !items || items.some((b) => b.status === 'PENDING'); // new bookings start PENDING
  const allConfirmed = items?.length > 0 && items.every((b) => b.status === 'CONFIRMED');

  return (
    <div className="container section narrow">
      <div className="success-hero">
        <span className="success-icon"><Icon name="check" size={36} /></span>
        <h1>{allConfirmed ? 'Booking confirmed!' : 'Booking placed!'}</h1>
        <p className="muted">
          {allConfirmed
            ? 'Your professional is assigned. Details are below and in My bookings.'
            : pending
              ? 'We’re finding the best available professional for your time slot. This usually takes a few seconds.'
              : 'You’ll see status updates in My bookings.'}
        </p>
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
