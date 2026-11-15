import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '../router';
import { useStore } from '../store';
import { CITIES, formatINR, slugify } from '../catalog';

/* ---------- Icons (inline SVG, no external assets) ---------- */
const PATHS = {
  clean: 'M9 3h6v4l3 3v11H6V10l3-3zM9 12h6M9 16h6',
  plumb: 'M4 10h8a3 3 0 0 1 3 3v2h3v-5h2v9h-2v-2h-5v-4H4zM8 4h2v6H8z',
  elec: 'M13 2 5 14h6l-1 8 8-12h-6z',
  salon: 'M6 3l6 9 6-9M9 16a3 3 0 1 1-3-3M15 16a3 3 0 1 0 3-3',
  generic: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  cart: 'M3 4h2l2.5 11h10L20 7H6.5M9 20h.01M17 20h.01',
  star: 'M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z',
  check: 'M5 12l4 4 10-10',
  cross: 'M6 6l12 12M18 6 6 18',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  chev: 'M6 9l6 6 6-6',
  chevr: 'M9 6l6 6-6 6',
  user: 'M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11',
  calendar: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
};

/** 9876543210 -> "98******10" (middle six digits hidden). */
export const maskPhone = (phone = '') =>
  phone.length === 10 ? `${phone.slice(0, 2)}******${phone.slice(-2)}` : phone;

export function Icon({ name, size = 20, className = '', filled = false }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name] || PATHS.generic} />
    </svg>
  );
}

export function Stars({ value }) {
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5`}>
      <Icon name="star" size={14} filled /> {value.toFixed(1)}
    </span>
  );
}

/* ---------- Layout ---------- */
export function Header() {
  const { city, setCity, itemCount, categories, user } = useStore();
  const { pathname } = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <div className="container header-row">
        <Link to="/" className="brand">
          <span className="brand-mark"><Icon name="generic" size={18} /></span>
          <span>Urban<b>Serve</b></span>
        </Link>

        <label className="city-select">
          <Icon name="pin" size={16} />
          <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        <nav className={`nav ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          {categories.map((c) => {
            const to = `/services/${slugify(c.name)}`;
            return <Link key={c.id} to={to} className={pathname === to ? 'active' : ''}>{c.name}</Link>;
          })}
          <Link to="/bookings" className={pathname === '/bookings' ? 'active' : ''}>My bookings</Link>
          {user
            ? <Link to="/profile" className={`nav-account ${pathname === '/profile' ? 'active' : ''}`} aria-label="Account">
                <Icon name="user" size={18} /> Account
              </Link>
            : <Link to={`/login?next=${encodeURIComponent(pathname)}`} className={pathname === '/login' ? 'active' : ''}>Log in</Link>}
        </nav>

        <Link to="/checkout" className="cart-btn" aria-label={`Cart, ${itemCount} items`}>
          <Icon name="cart" />
          {itemCount > 0 && <span className="badge">{itemCount}</span>}
        </Link>
        <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menu">☰</button>
      </div>
    </header>
  );
}

export function Footer() {
  const { categories } = useStore();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="brand light"><span>Urban<b>Serve</b></span></div>
          <p className="muted-light">Trusted professionals for cleaning, repairs and grooming — booked in under a minute.</p>
        </div>
        <div>
          <h4>Services</h4>
          {categories.map((c) => <Link key={c.id} to={`/services/${slugify(c.name)}`}>{c.name}</Link>)}
        </div>
        <div>
          <h4>Cities</h4>
          {CITIES.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/profile">Account</Link>
          <Link to="/bookings">My bookings</Link>
          <Link to="/checkout">Cart</Link>
        </div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} UrbanServe</div>
    </footer>
  );
}

/* ---------- Bits ---------- */
export function QtyControl({ qty, onChange, compact = false }) {
  if (qty === 0) {
    return <button className={`btn btn-outline ${compact ? 'btn-sm' : ''}`} onClick={() => onChange(1)}>Add</button>;
  }
  return (
    <div className={`qty ${compact ? 'qty-sm' : ''}`}>
      <button onClick={() => onChange(qty - 1)} aria-label="Decrease">−</button>
      <span>{qty}</span>
      <button onClick={() => onChange(qty + 1)} aria-label="Increase">+</button>
    </div>
  );
}

export function Accordion({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="accordion">
      {items.map((it, i) => (
        <div key={i} className={`acc-item ${open === i ? 'open' : ''}`}>
          <button className="acc-head" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
            {it.q}
            <Icon name="chev" size={18} className="acc-chev" />
          </button>
          {open === i && <div className="acc-body">{it.a}</div>}
        </div>
      ))}
    </div>
  );
}

export function CartSummary({ ctaLabel = 'Proceed to book', onCta, hideCta = false }) {
  const { lines, subtotal, setQty } = useStore();
  return (
    <div className="card cart-card">
      <h3>Your cart</h3>
      {lines.length === 0 ? (
        <div className="cart-empty">
          <Icon name="cart" size={36} />
          <p>No services added yet.</p>
        </div>
      ) : (
        <>
          <ul className="cart-lines">
            {lines.map((l) => (
              <li key={`${l.categoryId}-${l.packageId}`}>
                <div>
                  <div className="line-name">{l.pkg.name}</div>
                  <div className="line-sub">{l.category.name}</div>
                </div>
                <QtyControl compact qty={l.qty} onChange={(q) => setQty(l.categoryId, l.packageId, q)} />
                <div className="line-total">{formatINR(l.total)}</div>
              </li>
            ))}
          </ul>
          <div className="cart-total">
            <span>Total</span>
            <b>{formatINR(subtotal)}</b>
          </div>
          {!hideCta && <button className="btn btn-primary btn-block" onClick={onCta}>{ctaLabel}</button>}
        </>
      )}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return <div className="loading"><span className="spinner" /> {label}</div>;
}

/** Accessible confirmation dialog (Esc / backdrop = cancel, focus starts on Cancel). */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, busy = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg">
        <h2 id="dlg-title">{title}</h2>
        <p id="dlg-msg" className="muted">{message}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} className="btn btn-ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <div className="error-box" role="alert">
      {message}
    </div>
  );
}

export const STATUS_LABEL = {
  PENDING: 'Finding professional', CONFIRMED: 'Confirmed', IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

export function StatusPill({ status }) {
  return <span className={`pill pill-${status.toLowerCase()}`}>{STATUS_LABEL[status] || status}</span>;
}
