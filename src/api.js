// Thin client for the UrbanServe Spring Boot API.
const BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '';

// ---- Auth token (JWT from OTP login) ----
const TOKEN_KEY = 'us.auth';
let auth = null;
try { auth = JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch { /* ignore */ }
if (auth && new Date(auth.expiresAt) <= new Date()) auth = null;
const listeners = new Set();

export const session = {
  get: () => auth,
  set(value) {
    auth = value;
    try { value ? localStorage.setItem(TOKEN_KEY, JSON.stringify(value)) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    listeners.forEach((fn) => fn(auth));
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Could not reach the UrbanServe server. Is the backend running on port 8080?');
  }
  if (res.status === 401 && auth && !path.startsWith('/api/auth/')) {
    session.set(null); // expired or revoked token
    const err = new Error('Your session has expired. Please log in again.');
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      // Spring's default error body; add server.error.include-message=always to get `message`.
      msg = body.message || body.error || msg;
    } catch { /* non-JSON error */ }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  requestOtp: (phone) => request('/api/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (phone, code) => request('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  /** Server-side confirmation of the logged-in, OTP-verified phone number. */
  me: () => request('/api/auth/me'),

  categories: () => request('/api/categories'),

  providers: ({ categoryId, city } = {}) => {
    const q = new URLSearchParams();
    if (categoryId != null) q.set('categoryId', categoryId);
    if (city) q.set('city', city);
    return request(`/api/providers?${q}`);
  },

  /** body: { customerName, address, scheduledAt: 'YYYY-MM-DDTHH:mm:ss', categoryId, providerId? } (phone comes from the token) */
  createBooking: (body) => request('/api/bookings', { method: 'POST', body: JSON.stringify(body) }),

  booking: (id) => request(`/api/bookings/${id}`),

  myBookings: () => request('/api/bookings'),

  updateStatus: (id, status) =>
    request(`/api/bookings/${id}/status?status=${status}`, { method: 'PATCH' }),
};
