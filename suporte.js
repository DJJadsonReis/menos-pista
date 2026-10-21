// Suporte: abrir chamado e acompanhar as respostas ao vivo (Firestore supportTickets + messages).
// Segue as regras publicadas (docs/REGRA-SUPORTE.md do admin). Texto do banco entra sempre como texto.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const app = initializeApp({
  apiKey: 'AIzaSyA1R525o7a3ThSC4BEv-k2J0iaMal_JBN4', authDomain: 'menos-pista.firebaseapp.com', projectId: 'menos-pista',
  storageBucket: 'menos-pista.firebasestorage.app', messagingSenderId: '213910230748'
});
const auth = getAuth(app), db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
getRedirectResult(auth).catch(() => {});

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const STATUS = { aberto: ['Aberto', 'st-open'], em_atendimento: ['Em andamento', 'st-work'], aguardando_usuario: ['Aguardando você', 'st-wait'], resolvido: ['Resolvido', 'st-ok'], fechado: ['Fechado', 'st-ok'] };
const when = (t) => (t && t.toDate ? t.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'agora');
let user = null, unsubList = null, unsubChat = null, openId = null, tickets = [];

const say = (box, t, err) => { box.textContent = t; box.className = 'sp-msg' + (err ? ' err' : ''); };
const errText = (e) => (/permission|insufficient/i.test(e?.message || '') ? 'Sem permissão para isso. Saia e entre de novo.' : 'Não deu certo. Confira a internet e tente de novo.');

async function login() {
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, p); } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return signInWithRedirect(auth, p);
    if (e.code !== 'auth/popup-closed-by-user') say($('spFormMsg'), 'Não foi possível entrar com o Google. Tente de novo.', true);
  }
}
$('spLogin').onclick = login;
$('spLogout').onclick = () => signOut(auth);

onAuthStateChanged(auth, (u) => {
  user = u; unsubList?.(); unsubChat?.(); openId = null;
  $('spOut').hidden = !!u; $('spIn').hidden = !u;
  if (!u) return;
  $('spWho').textContent = u.displayName || u.email || 'Sua conta';
  $('spEmail').textContent = u.email || '';
  if (u.photoURL) { $('spAvatar').src = u.photoURL; $('spAvatar').hidden = false; } else $('spAvatar').hidden = true;
  unsubList = onSnapshot(query(collection(db, 'supportTickets'), where('uid', '==', u.uid)), (s) => {
    tickets = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.updatedAt?.toMillis?.() || Date.now()) - (a.updatedAt?.toMillis?.() || Date.now()));
    renderList();
  }, (e) => { $('spList').replaceChildren(el('p', 'small', errText(e))); });
});

function renderList() {
  const box = $('spList'); box.replaceChildren();
  $('spCount').textContent = tickets.length ? `${tickets.length}` : '';
  if (!tickets.length) { box.append(el('p', 'small', 'Você ainda não abriu nenhum chamado.')); return; }
  for (const t of tickets) {
    const [lbl, cls] = STATUS[t.status] || [t.status || 'Aberto', 'st-open'];
    const b = el('button', 'sp-item' + (t.id === openId ? ' on' : '')); b.type = 'button';
    const top = el('div', 'sp-item-top'); top.append(el('b', null, t.subject || 'Chamado'), el('span', 'sp-st ' + cls, lbl));
    const sub = el('small', null, `${t.category || 'Outro'} · ${when(t.updatedAt)}`);
    b.append(top, sub); if (t.unreadByUser) b.append(el('span', 'sp-new', 'resposta nova'));
    b.onclick = () => openTicket(t.id); box.append(b);
  }
  if (openId) { const t = tickets.find((x) => x.id === openId); if (t) paintHead(t); }
}

function paintHead(t) {
  const [lbl, cls] = STATUS[t.status] || [t.status, 'st-open'];
  $('spChatTitle').textContent = t.subject || 'Chamado';
  const st = $('spChatStatus'); st.textContent = lbl; st.className = 'sp-st ' + cls;
  $('spReopenHint').hidden = !['resolvido', 'fechado'].includes(t.status);
}

function openTicket(id) {
  unsubChat?.(); openId = id; renderList();
  const t = tickets.find((x) => x.id === id); if (!t) return;
  $('spChat').hidden = false; paintHead(t);
  if (t.unreadByUser) updateDoc(doc(db, 'supportTickets', id), { unreadByUser: false }).catch(() => {});
  const box = $('spThread'); box.replaceChildren(el('p', 'small', 'Carregando…'));
  unsubChat = onSnapshot(query(collection(db, 'supportTickets', id, 'messages'), orderBy('createdAt', 'asc')), (s) => {
    box.replaceChildren();
    s.docs.forEach((d) => { const m = d.data(); const b = el('div', 'sp-bubble ' + (m.from === 'admin' ? 'them' : 'me'));
      b.append(el('p', null, m.text || ''), el('small', null, `${m.from === 'admin' ? (m.authorName || 'Suporte Menos Pista') : 'Você'} · ${when(m.createdAt)}`)); box.append(b); });
    if (!s.size) box.append(el('p', 'small', 'Sem mensagens ainda.'));
    box.scrollTop = box.scrollHeight;
  }, (e) => box.replaceChildren(el('p', 'small', errText(e))));
  $('spChat').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

$('spForm').onsubmit = async (ev) => {
  ev.preventDefault(); if (!user) return login();
  const subject = $('spSubject').value.trim(), category = $('spCategory').value, text = $('spText').value.trim();
  const msg = $('spFormMsg');
  if (subject.length < 3) return say(msg, 'Escreva um assunto (mínimo 3 letras).', true);
  if (text.length < 5) return say(msg, 'Conte um pouco mais na mensagem.', true);
  const btn = $('spSend'); btn.disabled = true; say(msg, 'Enviando…');
  try {
    // Duas gravações: a regra da mensagem confere o dono no chamado já gravado.
    const ref = await addDoc(collection(db, 'supportTickets'), {
      uid: user.uid, email: user.email || null, name: user.displayName || null, subject: subject.slice(0, 140), category,
      status: 'aberto', source: 'site', userAgent: navigator.userAgent.slice(0, 200),
      unreadByAdmin: true, unreadByUser: false, lastReplyBy: 'user', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    await addDoc(collection(ref, 'messages'), { from: 'user', text: text.slice(0, 5000), authorUid: user.uid, createdAt: serverTimestamp() });
    $('spForm').reset(); say(msg, 'Chamado aberto! A resposta aparece aqui em “Meus chamados”.');
    openTicket(ref.id);
  } catch (e) { console.error(e); say(msg, errText(e), true); } finally { btn.disabled = false; }
};

$('spReplyForm').onsubmit = async (ev) => {
  ev.preventDefault(); const text = $('spReply').value.trim(); if (!text || !openId || !user) return;
  const btn = $('spReplySend'); btn.disabled = true;
  try {
    const tRef = doc(db, 'supportTickets', openId); const t = tickets.find((x) => x.id === openId);
    await addDoc(collection(tRef, 'messages'), { from: 'user', text: text.slice(0, 5000), authorUid: user.uid, createdAt: serverTimestamp() });
    await updateDoc(tRef, { unreadByAdmin: true, unreadByUser: false, lastReplyBy: 'user', updatedAt: serverTimestamp(), ...(t && t.status !== 'aberto' && t.status !== 'em_atendimento' ? { status: 'aberto' } : {}) });
    $('spReply').value = '';
  } catch (e) { console.error(e); say($('spReplyMsg'), errText(e), true); } finally { btn.disabled = false; }
};
