import { useEffect, useRef, useState } from 'react';
import { api, session } from '../api';

const keyId = (import.meta.env.VITE_RAZORPAY_TEST_KEY_ID || '').trim();
const testMode = /^rzp_test_[A-Za-z0-9]+$/.test(keyId);
const orderIdPattern = /^order_[A-Za-z0-9]+$/;
const paymentIdPattern = /^pay_[A-Za-z0-9]+$/;
const signaturePattern = /^[0-9a-fA-F]{64}$/;
const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

let scriptLoad;
let checkoutOpen = false;

function loadCheckout() {
  if (typeof window.Razorpay === 'function') return Promise.resolve(window.Razorpay);

  if (!scriptLoad) {
    scriptLoad = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;

      const timer = setTimeout(fail, 12000);
      function fail() {
        clearTimeout(timer);
        script.remove();
        reject(new Error('Could not load Razorpay Checkout. Try again.'));
      }

      script.onerror = fail;
      script.onload = () => {
        if (typeof window.Razorpay !== 'function') return fail();
        clearTimeout(timer);
        resolve(window.Razorpay);
      };
      document.head.appendChild(script);
    }).catch((error) => {
      scriptLoad = undefined;
      throw error;
    });
  }

  return scriptLoad;
}

function openCheckout(Razorpay, order) {
  if (checkoutOpen) throw new Error('Close the other Razorpay Checkout window first.');
  checkoutOpen = true;

  return new Promise((resolve) => {
    const checkout = new Razorpay({
      key: keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: 'UrbanServe',
      description: 'Test Mode payment',
      handler: resolve,
      modal: { confirm_close: true, ondismiss: () => resolve(null) },
    });

    checkout.open();
  }).finally(() => {
    checkoutOpen = false;
  });
}

function hasReceipt(receipt) {
  return receipt != null
    && typeof receipt.orderId === 'string' && orderIdPattern.test(receipt.orderId)
    && typeof receipt.paymentId === 'string' && paymentIdPattern.test(receipt.paymentId)
    && typeof receipt.signature === 'string' && signaturePattern.test(receipt.signature);
}

function readReceipt(key) {
  try {
    const receipt = JSON.parse(sessionStorage.getItem(key));
    return hasReceipt(receipt) ? receipt : null;
  } catch {
    return null;
  }
}

async function readSavedStatus(bookingId, amount) {
  const saved = await api.paymentStatus(bookingId);
  if (saved?.bookingId !== bookingId
      || (saved.paymentStatus !== 'NOT_STARTED'
          && (saved.amount !== amount || saved.currency !== 'INR'))) {
    throw new Error('The payment status did not match this booking.');
  }
  return saved;
}

function canOpenCheckout(saved) {
  return saved?.paymentStatus === 'NOT_STARTED'
    || (saved?.paymentMethod === 'ONLINE' && saved.paymentStatus === 'PENDING');
}

function canVerify(saved) {
  return saved?.paymentMethod === 'ONLINE'
    && ['PENDING', 'AUTHORIZED'].includes(saved.paymentStatus);
}

function statusLabel(saved, total) {
  switch (saved.paymentStatus) {
    case 'PAID':
      return `${saved.paymentMethod === 'ONLINE' ? 'Paid (Test Mode)' : 'Paid'} · ${total}`;
    case 'PENDING':
      return saved.paymentMethod === 'ONLINE' ? 'Online payment pending' : 'Payment pending';
    case 'AUTHORIZED':
      return 'Payment authorized. Waiting for confirmation.';
    case 'COLLECTION_PENDING':
      return 'Payment collection pending';
    case 'FAILED':
      return 'Payment failed';
    case 'REFUNDED':
      return 'Payment refunded';
    default:
      return '';
  }
}

export default function PayOnline({ booking, account }) {
  if (!testMode || !account
      || !Number.isSafeInteger(booking.totalAmountPaise)
      || booking.totalAmountPaise <= 0) return null;

  const identity = `${account}:${booking.id}:${booking.createdAt || ''}`;
  return (
    <BookingPayment
      key={identity}
      booking={booking}
      account={account}
      storageKey={`us.testPayment.v1:${identity}`}
    />
  );
}

function BookingPayment({ booking, account, storageKey }) {
  const bookingId = booking.id;
  const amount = booking.totalAmountPaise;
  const total = formatter.format(amount / 100);
  const canStart = amount >= 100 && ['PENDING', 'CONFIRMED'].includes(booking.status);

  const [saved, setSaved] = useState(null);
  const [statusError, setStatusError] = useState(false);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [receipt, setReceipt] = useState(() => readReceipt(storageKey));
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('');
  const [unexpectedCallback, setUnexpectedCallback] = useState(false);
  const inProgress = useRef(false);

  useEffect(() => {
    let active = true;
    readSavedStatus(bookingId, amount)
      .then((result) => { if (active) setSaved(result); })
      .catch(() => { if (active) setStatusError(true); });
    return () => { active = false; };
  }, [bookingId, amount, statusAttempt]);

  async function run() {
    if (inProgress.current) return;
    inProgress.current = true;
    let proof = receipt;
    let callbackReceived = Boolean(receipt);
    let statusChecked = false;
    setMessage('');
    setPhase(proof ? 'verifying' : 'opening');

    try {
      if (session.get()?.phone !== account) {
        throw new Error('Sign in again to manage this payment.');
      }

      const latest = await readSavedStatus(bookingId, amount);
      statusChecked = true;
      setSaved(latest);

      if (latest.paymentStatus === 'PAID') return;

      if (proof) {
        if (!canVerify(latest)) return;
      } else {
        if (!canStart || !canOpenCheckout(latest)) return;

        const Razorpay = await loadCheckout();
        if (session.get()?.phone !== account) {
          throw new Error('Sign in again before paying.');
        }

        const order = await api.prepareOnlinePayment(bookingId);
        if (order?.bookingId !== bookingId || order.amount !== amount
            || order.currency !== 'INR' || order.paymentMethod !== 'ONLINE'
            || order.paymentStatus !== 'PENDING'
            || typeof order.razorpayOrderId !== 'string'
            || !orderIdPattern.test(order.razorpayOrderId)) {
          throw new Error('The order did not match your booking. Checkout was not opened.');
        }

        setSaved(order);

        if (session.get()?.phone !== account) {
          throw new Error('Sign in again before paying.');
        }

        const result = await openCheckout(Razorpay, order);
        if (result === null) {
          setMessage('Checkout closed. UrbanServe has not confirmed a payment.');
          return;
        }

        callbackReceived = true;
        proof = {
          orderId: result?.razorpay_order_id,
          paymentId: result?.razorpay_payment_id,
          signature: result?.razorpay_signature,
        };

        if (!hasReceipt(proof) || proof.orderId !== order.razorpayOrderId) {
          setUnexpectedCallback(true);
          setMessage('Checkout returned unexpected details. Check the test payment in Razorpay before trying again.');
          return;
        }

        setReceipt(proof);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(proof));
        } catch {
          // Verification can still be retried while this card is open.
        }
      }

      setPhase('verifying');
      if (session.get()?.phone !== account) {
        throw new Error('Sign in again to verify your payment.');
      }

      const paid = await api.verifyOnlinePayment(bookingId, proof.paymentId, proof.signature);
      if (paid?.bookingId !== bookingId || paid.amount !== amount
          || paid.currency !== 'INR' || paid.paymentMethod !== 'ONLINE'
          || paid.paymentStatus !== 'PAID' || paid.razorpayOrderId !== proof.orderId
          || paid.razorpayPaymentId !== proof.paymentId) {
        throw new Error('The verification response did not match the payment.');
      }

      setSaved(paid);
      setReceipt(null);
      try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
    } catch (error) {
      if (!statusChecked) {
        setStatusError(true);
      } else {
        setMessage(callbackReceived
          ? 'Payment is not confirmed yet. Use Check payment again instead of paying again.'
          : error.message || 'Could not open checkout.');
      }
    } finally {
      inProgress.current = false;
      setPhase('idle');
    }
  }

  if (statusError) {
    return (
      <div>
        <p className="muted small" role="status">Payment status is unavailable.</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => {
          setSaved(null);
          setStatusError(false);
          setStatusAttempt((value) => value + 1);
        }}>
          Check payment status
        </button>
      </div>
    );
  }

  if (!saved) return <p className="muted small" role="status">Checking payment status…</p>;

  const label = statusLabel(saved, total);
  const mayVerify = receipt && canVerify(saved);
  const mayPay = !receipt && !unexpectedCallback && canStart && canOpenCheckout(saved);
  const busy = phase !== 'idle';

  return (
    <div>
      {label && <p role="status">{label}</p>}
      {(mayVerify || mayPay) && (
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={run}>
          {phase === 'opening' ? 'Opening checkout…'
            : phase === 'verifying' ? 'Checking payment…'
              : mayVerify ? 'Check payment again'
                : saved.paymentStatus === 'PENDING' ? `Resume online payment (Test Mode) · ${total}`
                  : `Pay online (Test Mode) · ${total}`}
        </button>
      )}
      {message && <p className="muted small" role="status">{message}</p>}
    </div>
  );
}