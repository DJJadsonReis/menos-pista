// Minha conta: perfil, plano (mesmo critério do app: isPro) e chamados do usuário. Só leitura; segue as regras publicadas.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, collection, doc, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const app = initializeApp({
  apiKey: 'AIzaSyA1R525o7a3ThSC4BEv-k2J0iaMal_JBN4', authDomain: 'menos-pista.firebaseapp.com', projectId: 'menos-pista',
  storageBucket: 'menos-pista.firebasestorage.app', messagingSenderId: '213910230748'
});
const auth = getAuth(app), db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
getRedirectResult(auth).catch(() => {});

const LANG = (document.documentElement.lang || 'pt').slice(0, 2);
const I18N = {
  en: { Aberto: 'Open', 'Em andamento': 'In progress', 'Aguardando você': 'Waiting for you', Resolvido: 'Resolved', Fechado: 'Closed', 'Cortesia/manual': 'Courtesy/manual',
    'Não foi possível entrar com o Google. Tente de novo.': 'Could not sign in with Google. Please try again.', 'sem data de fim': 'no end date', 'até ': 'until ', 'venceu em ': 'expired on ',
    'Sua conta': 'Your account', 'Não foi possível ler o plano agora.': 'Could not read your plan right now.', 'Você ainda não abriu nenhum chamado.': 'You have not opened any tickets yet.',
    Chamado: 'Ticket', Outro: 'Other', 'resposta nova': 'new reply', 'Não foi possível carregar os chamados agora.': 'Could not load your tickets right now.' },
  es: { Aberto: 'Abierto', 'Em andamento': 'En curso', 'Aguardando você': 'Esperando tu respuesta', Resolvido: 'Resuelto', Fechado: 'Cerrado', 'Cortesia/manual': 'Cortesía/manual',
    'Não foi possível entrar com o Google. Tente de novo.': 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.', 'sem data de fim': 'sin fecha de fin', 'até ': 'hasta ', 'venceu em ': 'venció el ',
    'Sua conta': 'Tu cuenta', 'Não foi possível ler o plano agora.': 'No se pudo leer tu plan ahora.', 'Você ainda não abriu nenhum chamado.': 'Todavía no abriste ningún ticket.',
    Chamado: 'Ticket', Outro: 'Otro', 'resposta nova': 'respuesta nueva', 'Não foi possível carregar os chamados agora.': 'No se pudieron cargar tus tickets ahora.' }
};
const tr = (t) => (I18N[LANG] && I18N[LANG][t]) || t;
const LOC = LANG === 'en' ? 'en-US' : LANG === 'es' ? 'es-ES' : 'pt-BR';
const SUP = LANG === 'en' ? '/en/support' : LANG === 'es' ? '/es/soporte' : 'suporte';
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = tr(text); return e; };
const STATUS = { aberto: ['Aberto', 'st-open'], em_atendimento: ['Em andamento', 'st-work'], aguardando_usuario: ['Aguardando você', 'st-wait'], resolvido: ['Resolvido', 'st-ok'], fechado: ['Fechado', 'st-ok'] };
const SOURCE = { manual: 'Cortesia/manual', mercadopago: 'Mercado Pago', play: 'Google Play', stripe: 'Stripe' };
const when = (t) => (t && t.toDate ? t.toDate().toLocaleString(LOC, { dateStyle: 'short', timeStyle: 'short' }) : '—');
const fmtDate = (t) => (t && t.toDate ? t.toDate().toLocaleDateString(LOC) : '—');

// Mesmo critério do app e do apoiar.html: plan 'pro' + planSource válido + (proUntil ausente = sem fim, ou proUntil > agora).
export function isPro(d, now) {
  if (!d || d.plan !== 'pro' || !['manual', 'mercadopago', 'play', 'stripe'].includes(d.planSource)) return false;
  if (d.proUntil == null) return true;
  const until = d.proUntil.toMillis ? d.proUntil.toMillis() : NaN;
  return until > (now == null ? Date.now() : now);
}

let unsubUser = null, unsubList = null;
async function login() {
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, p); } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return signInWithRedirect(auth, p);
    if (e.code !== 'auth/popup-closed-by-user') { $('mcMsg').textContent = tr('Não foi possível entrar com o Google. Tente de novo.'); $('mcMsg').className = 'sp-msg err'; }
  }
}
$('mcLogin').onclick = login;
$('mcLogout').onclick = () => signOut(auth);

function paintPlan(d) {
  const pro = isPro(d);
  $('mcPlan').textContent = pro ? 'Pro' : 'Free'; $('mcPlan').className = 'sp-st ' + (pro ? 'st-ok' : 'st-open');
  $('mcSource').textContent = pro ? tr(SOURCE[d.planSource] || d.planSource) : '—';
  $('mcUntil').textContent = pro ? (d.proUntil == null ? tr('sem data de fim') : tr('até ') + fmtDate(d.proUntil)) : (d.plan === 'pro' && d.proUntil ? tr('venceu em ') + fmtDate(d.proUntil) : '—');
}

onAuthStateChanged(auth, (u) => {
  unsubUser?.(); unsubList?.(); unsubUser = unsubList = null;
  $('mcOut').hidden = !!u; $('mcIn').hidden = !u;
  if (!u) return;
  $('mcName').textContent = u.displayName || tr('Sua conta');
  $('mcEmail').textContent = u.email || '';
  if (u.photoURL && /^https:\/\//.test(u.photoURL)) { $('mcAvatar').src = u.photoURL; $('mcAvatar').hidden = false; } else $('mcAvatar').hidden = true;
  unsubUser = onSnapshot(doc(db, 'users', u.uid), (s) => paintPlan(s.exists() ? s.data() : {}), () => { $('mcPlan').textContent = 'Free'; $('mcUntil').textContent = tr('Não foi possível ler o plano agora.'); });
  // Só where uid== (sem índice composto); ordena no cliente.
  unsubList = onSnapshot(query(collection(db, 'supportTickets'), where('uid', '==', u.uid)), (s) => {
    const list = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    const box = $('mcList'); box.replaceChildren(); $('mcCount').textContent = list.length ? String(list.length) : '';
    if (!list.length) { box.append(el('p', 'small', 'Você ainda não abriu nenhum chamado.')); return; }
    for (const t of list) {
      const [lbl, cls] = STATUS[t.status] || [t.status || 'Aberto', 'st-open'];
      const a = el('a', 'sp-item'); a.href = SUP;
      const top = el('div', 'sp-item-top'); top.append(el('b', null, t.subject || 'Chamado'), el('span', 'sp-st ' + cls, lbl));
      a.append(top, el('small', null, `${tr(t.category || 'Outro')} · ${when(t.updatedAt)}`)); if (t.unreadByUser && !['resolvido', 'fechado'].includes(t.status)) a.append(el('span', 'sp-new', 'resposta nova'));
      box.append(a);
    }
  }, () => { $('mcList').replaceChildren(el('p', 'small', 'Não foi possível carregar os chamados agora.')); });
});
