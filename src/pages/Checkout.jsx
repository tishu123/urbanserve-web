import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useRouter } from '../router';
import { useStore } from '../store';
import { api } from '../api';
import { TIME_SLOTS } from '../catalog';
import { CartSummary, ErrorBox } from '../components/ui';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function nextDays(n) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    out.push({
      iso: isoDate(x),
      dow: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : x.toLocaleDateString('en-IN', { weekday: 'short' }),
      label: x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    });
  }
  return out;
}

// Backend requires @Future; keep a 1-hour buffer.
const slotOpen = (dateIso, slot) => new Date(`${dateIso}T${slot}:00`).getTime() > Date.now() + 60 * 60 * 1000;

export default function Checkout() {
  const { lines, city, clearCart, setQty, user, cartReady } = useStore();
  const { navigate } = useRouter();
  const days = useMemo(() => nextDays(7), []);

  const [form, setForm] = useState(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('us.customer')) || {}; } catch { /* ignore */ }
    return { name: saved.name || '', address: saved.address || '' };
  });
  const [date, setDate] = useState(days[0].iso);
  const [slot, setSlot] = useState('');
  const [providerChoice, setProviderChoice] = useState({}); // categoryId -> providerId | ''
  const [providers, setProviders] = useState({}); // categoryId -> Provider[]
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const submissionInProgress = useRef(false);

  const categoryIds = [...new Set(lines.filter((line) => line.category).map((line) => line.categoryId))];
  const catKey = categoryIds.join(',');

  useEffect(() => {
    categoryIds.forEach((id) =>
      api.providers({ categoryId: id, city })
        .then((list) => setProviders((p) => ({ ...p, [id]: list })))
        .catch(() => setProviders((p) => ({ ...p, [id]: [] }))));
  }, [catKey, city]);

  // If the chosen slot becomes invalid (e.g. switching to today), clear it.
  useEffect(() => { if (slot && !slotOpen(date, slot)) setSlot(''); }, [date]);

  if (lines.length === 0) {
    return (
      <div className="container section narrow center">
        <h1>Your cart is empty</h1>
        <p className="muted">Add a service to book a professional.</p>
        <Link to="/" className="btn btn-primary">Browse services</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container section narrow center">
        <h1>Log in to book</h1>
        <p className="muted">Verify your mobile number with a one-time code. Your cart is saved.</p>
        <Link to="/login?next=/checkout" className="btn btn-primary">Log in with OTP</Link>
      </div>
    );
  }

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest);
  };

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Please enter your name';
    if (form.address.trim().length < 8) e.address = 'Please enter your full address';
    if (!slot) e.slot = 'Pick a time slot';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev) {
    ev?.preventDefault();
    if (submissionInProgress.current || !cartReady || !validate()) return;
    submissionInProgress.current = true;
    setSubmitting(true);
    setSubmitError(null);
    const customer = { name: form.name.trim(), address: form.address.trim() };
    try { localStorage.setItem('us.customer', JSON.stringify(customer)); } catch { /* ignore */ }

    // The backend books one category per booking, so create one per category in the cart.
    const created = [];
    const failed = [];
    for (const categoryId of categoryIds) {
      const categoryLines = lines.filter((line) => line.categoryId === categoryId);
      try {
        const b = await api.createBooking({
          customerName: customer.name,
          address: customer.address,
          city,
          scheduledAt: `${date}T${slot}:00`,
          categoryId,
          providerId: providerChoice[categoryId] ? Number(providerChoice[categoryId]) : null,
          items: categoryLines.map((line) => ({
            packageCode: line.packageId,
            quantity: line.qty,
          })),
        });
        created.push(b.id);
        categoryLines.forEach((l) => setQty(l.categoryId, l.packageId, 0));
      } catch (e) {
        failed.push({ categoryId, message: e.message });
      }
    }
    submissionInProgress.current = false;
    setSubmitting(false);

    if (failed.length === 0) {
      clearCart();
      navigate(`/booking-success?ids=${created.join(',')}`, { replace: true });
    } else {
      const names = failed.map((f) => lines.find((l) => l.categoryId === f.categoryId)?.category.name).join(', ');
      setSubmitError(
        `${created.length ? `Booked ${created.length} service(s). ` : ''}Couldn’t book ${names}: ${failed[0].message}`
      );
    }
  }

  return (
    <div className="container section">
      <h1>Book your service</h1>
      <div className="checkout-layout">
        <form className="card form" onSubmit={submit} noValidate>
          <h3>Contact details</h3>
          <div className="field-row">
            <Field label="Full name" error={errors.name}>
              <input value={form.name} onChange={set('name')} autoComplete="name" placeholder="Your name" />
            </Field>
            <Field label="Mobile number (verified)">
              <div className="phone-input verified"><span>+91</span>
                <input value={user.phone} readOnly aria-readonly="true" />
              </div>
            </Field>
          </div>
          <Field label={`Service address (${city})`} error={errors.address}>
            <textarea rows={2} value={form.address} onChange={set('address')} autoComplete="street-address" placeholder="Flat / house no., street, area, landmark" />
          </Field>

          <h3>Select date</h3>
          <div className="day-chips">
            {days.map((d) => (
              <button type="button" key={d.iso} className={`day-chip ${date === d.iso ? 'sel' : ''}`} onClick={() => setDate(d.iso)}>
                <span>{d.dow}</span><b>{d.label}</b>
              </button>
            ))}
          </div>

          <h3>Arrival time</h3>
          <div className="slot-chips">
            {TIME_SLOTS.map((s) => {
              const open = slotOpen(date, s);
              return (
                <button type="button" key={s} disabled={!open} className={`slot-chip ${slot === s ? 'sel' : ''}`} onClick={() => { setSlot(s); setErrors(({ slot: _, ...rest }) => rest); }}>
                  {formatSlot(s)}
                </button>
              );
            })}
          </div>
          {errors.slot && <div className="field-error">{errors.slot}</div>}

          <h3>Professional</h3>
          {categoryIds.map((id) => {
            const cat = lines.find((l) => l.categoryId === id).category;
            const list = providers[id];
            return (
              <Field key={id} label={cat.name}>
                <select value={providerChoice[id] || ''} onChange={(e) => setProviderChoice((p) => ({ ...p, [id]: e.target.value }))}>
                  <option value="">Any available professional (recommended)</option>
                  {(list || []).map((p) => <option key={p.id} value={p.id}>Prefer {p.name} — ★ {p.rating.toFixed(1)}</option>)}
                </select>
                <div className="hint">We assign a top-rated professional who is free at your time slot{providerChoice[id] ? ', trying your preferred one first' : ''}.</div>
              </Field>
            );
          })}

          {submitError && <ErrorBox message={submitError} />}
          <button className="btn btn-primary btn-block btn-lg only-mobile" disabled={submitting || !cartReady}>
            {submitting ? 'Booking…' : 'Confirm booking'}
          </button>
        </form>

        <aside className="sticky">
          <CartSummary ctaLabel={submitting ? 'Booking…' : 'Confirm booking'} onCta={submit} busy={submitting} />
          <p className="muted small">Pay after service. Cancel free from My bookings before the professional is assigned.</p>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function formatSlot(s) {
  const h = Number(s.slice(0, 2));
  const fmt = (x) => `${((x + 11) % 12) + 1} ${x < 12 ? 'AM' : 'PM'}`;
  return `${fmt(h)} – ${fmt(h + 2)}`;
}
