// Menos Pista — checkout do Pro internacional (Stripe, USD/EUR). Módulo ES sem dependências.
// Uso (páginas /en e /es, já com Firebase Auth inicializado):
//   import { startStripeCheckout, stripeReturnStatus } from '/assets/stripe-checkout.js';
//   await startStripeCheckout(auth.currentUser, { currency: 'usd', period: 'monthly', lang: 'en' }); // redireciona
//   stripeReturnStatus() // 'ok' | 'cancel' | null (lê ?stripe= na volta do checkout)
// O servidor (Worker menospista-pay, POST /stripe/checkout) confere o login e escolhe o preço; o Pro é liberado pelo webhook.
export const WORKER_URL = 'https://menospista-pay.jadsonr.workers.dev';

export async function createStripeCheckout(user, { currency, period, lang } = {}) {
  if (!user) throw Object.assign(new Error('login required'), { code: 'unauthenticated' });
  if (currency !== 'usd' && currency !== 'eur') throw Object.assign(new Error('invalid currency'), { code: 'invalid-argument' });
  if (period !== 'monthly' && period !== 'annual') throw Object.assign(new Error('invalid period'), { code: 'invalid-argument' });
  const idToken = await user.getIdToken();
  const r = await fetch(WORKER_URL + '/stripe/checkout', {
    method: 'POST', headers: { 'Authorization': 'Bearer ' + idToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency, period, ...(lang === 'en' || lang === 'es' ? { lang } : {}) }),
    credentials: 'omit', referrerPolicy: 'no-referrer'
  });
  const j = await r.json().catch(() => ({}));
  // 503 = Stripe ainda não configurado: a página deve mostrar "coming soon / próximamente".
  if (!r.ok || typeof j.url !== 'string') throw Object.assign(new Error(j.message || 'error'), { code: j.error || 'internal', status: r.status });
  return j.url;
}

export async function startStripeCheckout(user, opts) {
  const url = await createStripeCheckout(user, opts);
  if (!/^https:\/\/checkout\.stripe\.com\//.test(url)) throw Object.assign(new Error('unexpected checkout url'), { code: 'internal' });
  location.assign(url);
}

export function stripeReturnStatus() {
  const s = new URLSearchParams(location.search).get('stripe');
  return s === 'ok' || s === 'cancel' ? s : null;
}
