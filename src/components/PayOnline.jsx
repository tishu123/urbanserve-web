import { useRef, useState } from 'react';
import { api, session } from '../api';

const keyId = (import.meta.env.VITE_RAZORPAY_TEST_KEY_ID || '').trim();
const testMode = /^rzp_test_[A-Za-z0-9]+$/.test(keyId);
const orderIdPattern = /^order_[A-Za-z0-9]+$/;
const paymentIdPattern = /^pay_[A-Za-z0-9]+$/;
const signaturePattern = /^[0-9a-fA-F]{64}$/;
const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
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
  }).finally(() => { checkoutOpen = false; });
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

export default function PayOnline({ booking, account }) {
  const storageKey = `us.testPayment.v1:${account}:${booking.id}:${booking.createdAt || ''}`;
  const [receipt, setReceipt] = useState(() => readReceipt(storageKey));
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('');
  const inProgress = useRef(false);

  const amount = booking.totalAmountPaise;
  const canStart = ['PENDING', 'CONFIRMED'].includes(booking.status);
  if (!testMode || !account || !Number.isSafeInteger(amount) || amount < 100
      || (!canStart && !receipt)) return null;

  async function run() {
    if (inProgress.current || phase === 'paid') return;
    inProgress.current = true;
    let proof = receipt;
    let callbackReceived = Boolean(receipt);
    setMessage('');

    try {
      if (!proof) {
        setPhase('opening');
        const Razorpay = await loadCheckout();
        if (session.get()?.phone !== account) {
          throw new Error('The signed-in account changed. Sign in again before paying.');
        }
        const order = await api.prepareOnlinePayment(booking.id);
        if (order?.bookingId !== booking.id || order.amount !== amount
            || order.currency !== 'INR' || order.paymentMethod !== 'ONLINE'
            || order.paymentStatus !== 'PENDING'
            || typeof order.razorpayOrderId !== 'string'
            || !orderIdPattern.test(order.razorpayOrderId)) {
          throw new Error('The order did not match your booking. Checkout was not opened.');
        }

        if (session.get()?.phone !== account) {
          throw new Error('The signed-in account changed. Sign in again before paying.');
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
          setPhase('unconfirmed');
          setMessage('Checkout returned unexpected details. Check the test payment in Razorpay before trying again.');
          return;
        }
        setReceipt(proof);
        try { sessionStorage.setItem(storageKey, JSON.stringify(proof)); } catch { /* same-page retry still works */ }
      }

      setPhase('verifying');
      if (session.get()?.phone !== account) throw new Error('The signed-in account changed.');
      const paid = await api.verifyOnlinePayment(booking.id, proof.paymentId, proof.signature);
      if (paid?.bookingId !== booking.id || paid.amount !== amount
          || paid.currency !== 'INR' || paid.paymentMethod !== 'ONLINE'
          || paid.paymentStatus !== 'PAID' || paid.razorpayOrderId !== proof.orderId
          || paid.razorpayPaymentId !== proof.paymentId) {
        throw new Error('The verification response did not match the payment.');
      }
      setPhase('paid');
    } catch (error) {
      setMessage(callbackReceived
        ? 'Payment is not confirmed yet. Use Check payment again instead of paying again.'
        : error.message || 'Could not open checkout.');
    } finally {
      inProgress.current = false;
      setPhase((current) => ['paid', 'unconfirmed'].includes(current) ? current : 'idle');
    }
  }

  const busy = phase === 'opening' || phase === 'verifying';
  const total = formatter.format(amount / 100);
  return (
    <div>
      {phase === 'paid'
        ? <p role="status">Paid (Test Mode) · {total}</p>
        : phase !== 'unconfirmed' && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={run}>
            {phase === 'opening' ? 'Opening checkout…'
              : phase === 'verifying' ? 'Checking payment…'
                : receipt ? 'Check payment again' : `Pay online (Test Mode) · ${total}`}
          </button>
        )}
      {message && <p className="muted small" role="status">{message}</p>}
    </div>
  );
}
