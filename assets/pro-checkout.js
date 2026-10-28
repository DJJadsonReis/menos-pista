// Menos Pista — botões "Subscribe/Suscribirse" do Pro em /en e /es (Stripe real: en=USD, es=EUR).
// Uso: <a data-stripe-cta [data-period="monthly|annual"]> ; sem data-period lê #planPickX (monthly|yearly). Mensagens em [data-stripe-msg].
// Exige login Google (Firebase Auth); o Worker confere o token e escolhe o preço por lookup_key. pt-BR não usa este arquivo.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { startStripeCheckout, stripeReturnStatus } from '/assets/stripe-checkout.js?v=20261028r';

// Mesmas opções do suporte.js/minha-conta.js: na mesma página o Firebase reaproveita o app em vez de dar erro.
const app = initializeApp({ apiKey: 'AIzaSyA1R525o7a3ThSC4BEv-k2J0iaMal_JBN4', authDomain: 'menos-pista.firebaseapp.com', projectId: 'menos-pista',
  storageBucket: 'menos-pista.firebasestorage.app', messagingSenderId: '213910230748' });
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
const LANG = (document.documentElement.lang || 'en').slice(0, 2) === 'es' ? 'es' : 'en';
const CUR = LANG === 'es' ? 'eur' : 'usd';
const T = {
  en: { opening: 'Opening secure checkout…', login: 'Sign in with Google to subscribe.', loginErr: 'Could not sign in with Google. Please try again.',
    already: 'You already have an active Pro subscription.', busy: 'Too many attempts. Please wait a minute and try again.',
    err: 'Checkout is unavailable right now. Please try again later.', ok: 'Thank you! Your payment was received. Pro shows up in your account in a few seconds (sign in to the app with the same Google account).',
    cancel: 'Checkout canceled. You were not charged.' },
  es: { opening: 'Abriendo el pago seguro…', login: 'Inicia sesión con Google para suscribirte.', loginErr: 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.',
    already: 'Ya tienes una suscripción Pro activa.', busy: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    err: 'El pago no está disponible ahora. Inténtalo más tarde.', ok: '¡Gracias! Recibimos tu pago. Pro aparece en tu cuenta en unos segundos (inicia sesión en la app con la misma cuenta de Google).',
    cancel: 'Pago cancelado. No se te cobró nada.' }
}[LANG];
const PENDING = 'mpStripePending';
const say = (t, err) => document.querySelectorAll('[data-stripe-msg]').forEach((m) => { m.textContent = t; m.hidden = false; m.classList.toggle('err', !!err); });
const periodOf = (a) => {
  const p = a.dataset.period || (document.querySelector('#planPickX input:checked') || {}).value;
  return p === 'monthly' ? 'monthly' : 'annual';
};
async function go(period) {
  say(T.opening);
  try { await startStripeCheckout(auth.currentUser, { currency: CUR, period, lang: LANG }); }
  catch (e) { say(e.status === 409 ? T.already : e.status === 429 ? T.busy : e.code === 'unauthenticated' || e.status === 401 ? T.login : T.err, true); }
}
async function onClick(ev) {
  ev.preventDefault();
  const period = periodOf(ev.currentTarget);
  if (auth.currentUser) return go(period);
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, p); return go(period); } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) { sessionStorage.setItem(PENDING, period); return signInWithRedirect(auth, p); }
    if (e.code !== 'auth/popup-closed-by-user') say(T.loginErr, true);
  }
}
document.querySelectorAll('[data-stripe-cta]').forEach((a) => a.addEventListener('click', onClick));
const st = stripeReturnStatus();
if (st) { say(st === 'ok' ? T.ok : T.cancel); const m = document.querySelector('[data-stripe-msg]'); if (m) m.scrollIntoView({ block: 'center' }); }
getRedirectResult(auth).catch(() => {});
const pend = sessionStorage.getItem(PENDING);
if (pend) { const off = onAuthStateChanged(auth, (u) => { if (!u) return; off(); sessionStorage.removeItem(PENDING); go(pend === 'monthly' ? 'monthly' : 'annual'); }); }
