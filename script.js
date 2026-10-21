"use strict";
const { sb, esc, brl, parseMoney, STATUS, fmtDate, authError, isNetworkError } = window.App;
const $ = id => document.getElementById(id);

// ====== Cardápio de segurança (usado só se o banco não responder) ======
const FALLBACK_CATS = [
  { slug: "kombucha", title: "Kombucha", text: "Chá fermentado, naturalmente gaseificado." },
  { slug: "kefir", title: "Kefir e iogurtes", text: "Cremosos, com geleias e sementes para completar." }
];
// [slug, grupo, nome, ml, cor, pote?, foto]
const FALLBACK_PRODUCTS = [
  ["k-jabuticaba", "kombucha", "Kombucha de jabuticaba", 300, "#2e0f2c", 0, "img/k-jabuticaba.jpg"],
  ["k-maracuja", "kombucha", "Kombucha de maracujá", 300, "#f0a500", 0, "img/k-maracuja.jpg"],
  ["k-uvas", "kombucha", "Kombucha de uvas", 300, "#5b2a86", 0, "img/k-uvas.jpg"],
  ["k-morango", "kombucha", "Kombucha de morango", 300, "#d62839", 0, "img/k-morango.jpg"],
  ["k-goiaba", "kombucha", "Kombucha de goiaba", 300, "#ee6c7b", 0, "img/k-goiaba.jpg"],
  ["k-cidreira", "kombucha", "Kombucha de cidreira com hibisco", 300, "#a9bf6a", 0, "img/k-cidreira.jpg"],
  ["k-abacaxi", "kombucha", "Kombucha de abacaxi com hortelã", 300, "#f6d04d", 0, "img/k-abacaxi.jpg"],
  ["k-limao", "kombucha", "Kombucha de limão", 300, "#c7d84a", 0, "img/k-limao.jpg"],
  ["k-pitaya", "kombucha", "Kombucha de pitaya", 300, "#d6336c", 0, "img/k-pitaya.jpg"],
  ["k-pitaya-morango", "kombucha", "Kombucha de pitaya com morango", null, "#e8478a", 0, null],
  ["f-natural", "kefir", "Kefir natural", 300, "#f1ebe0", 0, "img/f-natural.jpg"],
  ["f-grego", "kefir", "Kefir grego", 190, "#fbf5e6", 0, "img/f-grego.jpg"],
  ["f-geleia-vermelhas", "kefir", "Geleia de frutas vermelhas", null, "#9b1b30", 1, null],
  ["f-geleia-maracuja", "kefir", "Geleia de maracujá", null, "#e9a820", 1, null],
  ["f-sementes", "kefir", "Mix de sementes", null, "#a67c52", 1, null]
];

// ====== Cidades atendidas (edite aqui para incluir ou tirar) ======
const CITIES = ["Londrina", "Cambé", "Ibiporã", "Rolândia", "Arapongas"];
const cityOptions = sel => CITIES.concat(sel && !CITIES.includes(sel) ? [sel] : [])
  .map(c => `<option${c === sel ? " selected" : ""}>${esc(c)}</option>`).join("");

const SETTINGS = {
  whatsapp: "5543991442024",
  deliveryFee: null,      // centavos ou null = "a combinar"
  minOrder: null,         // centavos ou null = sem mínimo
  payments: ["Pix", "Cartão (na entrega)", "Dinheiro"],
  ordersEnabled: true
};
let CATS = [], PRODUCTS = [], PHOTOS = [], fromDb = false;
let submitting = false;

// ====== Desenhos (usados quando o produto não tem foto) ======
function bottle(color, cls) {
  return `<svg class="${cls || ""}" viewBox="0 0 60 160" aria-hidden="true">
    <rect x="21" y="2" width="18" height="11" rx="2.5" fill="#fff" stroke="#e3c9a5"/>
    <path d="M22 13h16v14c0 6 12 10 12 24v96a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6V51c0-14 12-18 12-24z" fill="${color}"/>
    <rect x="15" y="50" width="4" height="92" rx="2" fill="#fff" opacity=".28"/>
    <rect x="10" y="74" width="40" height="52" fill="#fff"/>
    <rect x="24" y="82" width="12" height="14" rx="3" fill="#f28a12"/>
    <rect x="25" y="79" width="10" height="3" rx="1" fill="#b7791f"/>
    <rect x="17" y="102" width="26" height="3" rx="1.5" fill="#d9c3a5"/>
    <rect x="21" y="109" width="18" height="3" rx="1.5" fill="#e9dbc6"/>
  </svg>`;
}
function jar(color, cls) {
  return `<svg class="${cls || ""}" viewBox="0 0 60 80" aria-hidden="true">
    <rect x="8" y="6" width="44" height="13" rx="3" fill="#b7791f"/>
    <rect x="6" y="19" width="48" height="56" rx="10" fill="${color}"/>
    <rect x="11" y="30" width="4" height="36" rx="2" fill="#fff" opacity=".28"/>
    <rect x="14" y="36" width="32" height="26" fill="#fff"/>
    <rect x="26" y="40" width="8" height="9" rx="2" fill="#f28a12"/>
    <rect x="19" y="53" width="22" height="3" rx="1.5" fill="#d9c3a5"/>
  </svg>`;
}
const pic = (p, cls) => p.jar ? jar(p.color, cls) : bottle(p.color, cls);
const priceText = p => p.priceCents == null ? "Consulte o valor" : brl(p.priceCents);
const CAM = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>';
const thumb = p => p.photo
  ? `<button type="button" class="thumb" data-photo="${esc(p.id)}" aria-label="Ver foto de ${esc(p.name)}">${pic(p, "mini")}<i class="cam">${CAM}</i><span>ver foto</span></button>`
  : `<div class="thumb none">${pic(p, "mini")}</div>`;

// ====== Catálogo ======
const descText = (ml, d) => [ml ? ml + " ml" : "", d || ""].filter(Boolean).join(" · ");

function useFallback() {
  fromDb = false;
  CATS = FALLBACK_CATS.map(c => ({ slug: c.slug, title: c.title, text: c.text }));
  PRODUCTS = FALLBACK_PRODUCTS.map(r => ({
    id: r[0], dbId: null, group: r[1], name: r[2], desc: descText(r[3], ""),
    color: r[4], jar: !!r[5], photo: r[6], priceCents: null, available: true
  }));
}

async function fetchCatalog() {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000));
  const [c, p, s] = await Promise.race([Promise.all([
    sb.from("categories").select("id,slug,title,description,sort_order").order("sort_order"),
    sb.from("products").select("id,slug,category_id,name,description,size_ml,price_cents,photo_path,color_hex,icon,is_available,sort_order").order("sort_order"),
    sb.from("settings").select("key,value")
  ]), timeout]);
  if (c.error || p.error || s.error) throw (c.error || p.error || s.error);
  if (!c.data.length || !p.data.length) throw new Error("catálogo vazio");

  const catSlug = {};
  CATS = c.data.map(x => { catSlug[x.id] = x.slug; return { slug: x.slug, title: x.title, text: x.description }; });
  PRODUCTS = p.data.filter(x => catSlug[x.category_id]).map(x => ({
    id: x.slug, dbId: x.id, group: catSlug[x.category_id], name: x.name,
    desc: descText(x.size_ml, x.description), color: x.color_hex, jar: x.icon === "pote",
    photo: x.photo_path || null, priceCents: x.price_cents, available: x.is_available
  }));
  const st = {};
  s.data.forEach(r => { st[r.key] = r.value; });
  if (typeof st.whatsapp_number === "string" && /^\d{10,15}$/.test(st.whatsapp_number)) SETTINGS.whatsapp = st.whatsapp_number;
  SETTINGS.deliveryFee = typeof st.delivery_fee_cents === "number" ? st.delivery_fee_cents : null;
  SETTINGS.minOrder = typeof st.min_order_cents === "number" ? st.min_order_cents : null;
  if (Array.isArray(st.payment_methods) && st.payment_methods.length) SETTINGS.payments = st.payment_methods.map(String);
  SETTINGS.ordersEnabled = st.orders_enabled !== false;
  fromDb = true;
}

async function loadCatalog() {
  if (sb) {
    try { await fetchCatalog(); }
    catch (e) { console.warn("Catálogo do banco indisponível, usando o cardápio padrão.", e); useFallback(); }
  } else useFallback();
  applyCatalog();
}

function applyCatalog() {
  // tira do carrinho o que não existe mais ou esgotou
  Object.keys(qty).forEach(id => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p || !p.available) delete qty[id];
  });
  save();
  PHOTOS = PRODUCTS.filter(p => p.photo);
  renderMenu();
  renderShelf();
  const sel = $("pag"), prev = sel.value;
  sel.innerHTML = SETTINGS.payments.map(m => `<option>${esc(m)}</option>`).join("");
  if (SETTINGS.payments.includes(prev)) sel.value = prev;
  $("notice").hidden = SETTINGS.ordersEnabled;
  document.querySelectorAll("a[data-wa]").forEach(a => {
    a.href = waBase() + "?text=" + encodeURIComponent("Olá, tudo bem? Vim pelo site e gostaria de saber mais sobre os fermentados.");
    a.target = "_blank"; a.rel = "noopener";
  });
  render();
}
// Abre o WhatsApp em outra aba. (Não usar "noopener" aqui: com ele o navegador devolve null
// mesmo quando abriu, e a aba do site acabava sendo trocada pelo WhatsApp também.)
function openWhatsApp(url, navigateIfBlocked) {
  const w = window.open(url, "_blank");
  if (w) { try { w.opener = null; } catch (e) {} return true; }
  if (navigateIfBlocked) location.href = url;
  return false;
}
const waBase = () => "https://wa.me/" + SETTINGS.whatsapp;

function rowHtml(p) {
  const control = p.available
    ? `<div class="stepper" role="group" aria-label="Quantidade de ${esc(p.name)}">
         <button type="button" data-id="${esc(p.id)}" data-d="-1" aria-label="Diminuir ${esc(p.name)}">−</button>
         <output id="q-${esc(p.id)}">0</output>
         <button type="button" class="plus" data-id="${esc(p.id)}" data-d="1" aria-label="Aumentar ${esc(p.name)}">+</button>
       </div>`
    : '<span class="soldout">Esgotado</span>';
  return `<div class="row${p.available ? "" : " off"}">
      ${thumb(p)}
      <div>
        <div class="name">${esc(p.name)}</div>
        ${p.desc ? `<div class="desc">${esc(p.desc)}</div>` : ""}
        <div class="price">${priceText(p)}</div>
      </div>
      ${control}
    </div>`;
}
function renderMenu() {
  $("groups").innerHTML = CATS.map(c => {
    const items = PRODUCTS.filter(p => p.group === c.slug);
    return items.length
      ? `<div class="group"><h3>${esc(c.title)}</h3><p>${esc(c.text || "")}</p>${items.map(rowHtml).join("")}</div>` : "";
  }).join("") || '<p class="empty">Cardápio indisponível no momento. Fale com a gente pelo WhatsApp.</p>';
}
function renderShelf() {
  const pref = ["k-jabuticaba", "k-maracuja", "k-morango", "k-pitaya", "k-limao"];
  let list = pref.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  if (list.length < 5) list = PRODUCTS.filter(p => !p.jar).slice(0, 5);
  $("shelf").innerHTML = list.map(p => bottle(p.color)).join("");
}

// ====== Carrinho (guardado no navegador) ======
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("fdm-cart")) || {};
    const ok = {};
    Object.keys(saved).forEach(id => { if (Number.isInteger(saved[id]) && saved[id] > 0 && saved[id] < 100) ok[id] = saved[id]; });
    return ok;
  } catch (e) { return {}; }
}
function save() { try { localStorage.setItem("fdm-cart", JSON.stringify(qty)); } catch (e) {} }
const qty = load();

function summary() {
  const lines = PRODUCTS.filter(p => qty[p.id] > 0).map(p => ({ p, n: qty[p.id] }));
  const count = lines.reduce((s, l) => s + l.n, 0);
  const priced = lines.length > 0 && lines.every(l => l.p.priceCents != null);
  const sub = priced ? lines.reduce((s, l) => s + l.p.priceCents * l.n, 0) : null;
  return { lines, count, sub };
}
const mode = () => document.querySelector('input[name="mode"]:checked').value;
const plural = n => n + (n === 1 ? " item" : " itens");

function render() {
  const { lines, count, sub } = summary();
  PRODUCTS.forEach(p => { const q = $("q-" + p.id); if (q) q.textContent = qty[p.id] || 0; });

  $("count").textContent = plural(count);
  $("bar-total").textContent = sub != null ? "· " + brl(sub) : "";
  $("bar").classList.toggle("on", count > 0);
  $("badge").textContent = count;
  $("badge").hidden = count === 0;

  $("cart-items").innerHTML = lines.length ? lines.map(({ p, n }) => `
    <div class="citem">
      <div><div class="name">${esc(p.name)}</div>
        <div class="price">${p.priceCents == null ? "Consulte o valor" : n + " × " + brl(p.priceCents) + " = " + brl(p.priceCents * n)}</div></div>
      <div class="stepper" role="group" aria-label="Quantidade de ${esc(p.name)}">
        <button type="button" data-id="${esc(p.id)}" data-d="-1" aria-label="Diminuir ${esc(p.name)}">−</button>
        <output>${n}</output>
        <button type="button" class="plus" data-id="${esc(p.id)}" data-d="1" aria-label="Aumentar ${esc(p.name)}">+</button>
      </div>
    </div>`).join("") : '<p class="empty">Seu carrinho está vazio. Escolha seus sabores no cardápio.</p>';
  $("clear").hidden = lines.length === 0;
  $("submit").disabled = lines.length === 0 || !SETTINGS.ordersEnabled || submitting;

  const delivery = mode() === "Entrega";
  const fee = delivery ? SETTINGS.deliveryFee : 0;
  const total = sub != null && fee != null ? sub + fee : null;
  $("totals").innerHTML = `
    <div><span>Subtotal</span><span>${sub != null ? brl(sub) : "a confirmar"}</span></div>
    <div><span>${delivery ? "Entrega" : "Retirada"}</span><span>${!delivery ? "sem taxa" : fee == null ? "a combinar" : brl(fee)}</span></div>
    <div class="grand"><span>Total</span><span>${total != null ? brl(total) : "a confirmar"}</span></div>
    ${SETTINGS.minOrder != null ? `<div class="min"><span>Pedido mínimo</span><span>${brl(SETTINGS.minOrder)}</span></div>` : ""}`;

  if (current) { $("lb-q").textContent = qty[current] || 0; }
}

function change(id, d) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p || (d > 0 && !p.available)) return;
  const n = Math.min(99, Math.max(0, (qty[id] || 0) + d));
  if (n) qty[id] = n; else delete qty[id];
  save(); render();
}
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-id]");
  if (b) change(b.dataset.id, Number(b.dataset.d));
});
$("clear").addEventListener("click", () => { Object.keys(qty).forEach(k => delete qty[k]); save(); render(); });

// ====== Gaveta do carrinho ======
const drawer = $("drawer"), overlay = $("overlay");
let lastFocus = null;
function openCart() {
  lastFocus = document.activeElement;
  overlay.hidden = false;
  drawer.classList.add("on");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  $("close-cart").focus();
}
function closeCart() {
  overlay.hidden = true;
  drawer.classList.remove("on");
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  delete $("drawer-body").dataset.view;
  if (lastFocus) lastFocus.focus();
}
$("open-cart").addEventListener("click", openCart);
$("cart-top").addEventListener("click", openCart);
$("close-cart").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.addEventListener("keydown", e => {
  if (!drawer.classList.contains("on") || modals.length) return;
  if (e.key === "Escape") return closeCart();
  if (e.key === "Tab") {
    const f = [...drawer.querySelectorAll("button, input, select, textarea, a[href]")].filter(x => !x.disabled && !x.hidden && x.offsetParent);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// ====== Fotos dos sabores ======
const lb = $("lb"), lbImg = $("lb-img");
let current = null, lbFocus = null;
function showPhoto(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  current = id;
  lbImg.src = p.photo;
  lbImg.alt = "Foto de " + p.name;
  $("lb-name").textContent = p.name;
  $("lb-desc").textContent = p.desc || "";
  $("lb-minus").dataset.id = $("lb-plus").dataset.id = id;
  $("lb-minus").setAttribute("aria-label", "Diminuir " + p.name);
  $("lb-plus").setAttribute("aria-label", "Aumentar " + p.name);
  $("lb-plus").disabled = !p.available;
  $("lb-q").textContent = qty[id] || 0;
  const i = PHOTOS.indexOf(p);
  [1, -1].forEach(d => { new Image().src = PHOTOS[(i + d + PHOTOS.length) % PHOTOS.length].photo; });
}
function openPhoto(id) {
  lbFocus = document.activeElement;
  lb.hidden = false;
  document.body.style.overflow = "hidden";
  showPhoto(id);
  $("lb-close").focus();
}
function closePhoto() {
  lb.hidden = true;
  current = null;
  lbImg.removeAttribute("src");
  document.body.style.overflow = drawer.classList.contains("on") ? "hidden" : "";
  if (lbFocus) lbFocus.focus();
}
function stepPhoto(d) {
  const i = PHOTOS.findIndex(x => x.id === current);
  showPhoto(PHOTOS[(i + d + PHOTOS.length) % PHOTOS.length].id);
}
document.addEventListener("click", e => {
  const t = e.target.closest("button[data-photo]");
  if (t) openPhoto(t.dataset.photo);
  else if (e.target === lb) closePhoto();
});
$("lb-close").addEventListener("click", closePhoto);
$("lb-prev").addEventListener("click", () => stepPhoto(-1));
$("lb-next").addEventListener("click", () => stepPhoto(1));
document.addEventListener("keydown", e => {
  if (lb.hidden) return;
  if (e.key === "Escape") return closePhoto();
  if (e.key === "ArrowLeft") return stepPhoto(-1);
  if (e.key === "ArrowRight") return stepPhoto(1);
  if (e.key === "Tab") {
    const f = [...lb.querySelectorAll("button")].filter(x => !x.disabled);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
let touchX = null;
lbImg.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
lbImg.addEventListener("touchend", e => {
  if (touchX == null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 50) stepPhoto(dx < 0 ? 1 : -1);
});

// ====== Janelas (login e conta) ======
const modals = [];
function openModal(m) {
  m._last = document.activeElement;
  m.hidden = false;
  document.body.style.overflow = "hidden";
  modals.push(m);
  const f = m.querySelector("input:not([type=hidden]), button:not(.mx)");
  if (f) setTimeout(() => f.focus(), 30);
}
function closeModal(m) {
  const i = modals.indexOf(m);
  if (i >= 0) modals.splice(i, 1);
  m.hidden = true;
  if (!modals.length) document.body.style.overflow = drawer.classList.contains("on") ? "hidden" : "";
  if (m._last && document.contains(m._last)) m._last.focus();
}
document.addEventListener("keydown", e => {
  if (!modals.length) return;
  const m = modals[modals.length - 1];
  if (e.key === "Escape") return closeModal(m);
  if (e.key !== "Tab") return;
  const f = [...m.querySelectorAll("button, input, select, textarea, a[href]")].filter(x => !x.disabled && !x.hidden && x.offsetParent);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (!m.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
document.addEventListener("click", e => {
  const m = e.target.closest(".modal");
  if (!m) { const o = e.target.closest("[data-open-auth]"); if (o) openAuth("login"); return; }
  if (e.target === m || e.target.closest("[data-close]")) closeModal(m);
});

// ====== Login / cadastro ======
const authEl = $("auth");
let user = null, profile = null, isAdmin = false, addresses = [], loadedFor = null;

function authTab(name) {
  authEl.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  ["login", "signup", "reset"].forEach(n => { $(n + "-form").hidden = n !== name; });
  $("auth-title").textContent = { login: "Entrar", signup: "Criar conta", reset: "Nova senha" }[name];
  authEl.querySelector(".tabs").hidden = name === "reset";
  authMsg("", "");
}
function authMsg(err, note) { $("auth-err").textContent = err || ""; $("auth-note").textContent = note || ""; }
function openAuth(tab) {
  if (!sb) { alert("O login ainda não está disponível. Fale com a gente pelo WhatsApp."); return; }
  authTab(tab || "login");
  if (authEl.hidden) openModal(authEl);
}
function busy(form, on, text) {
  const b = form.querySelector("button[type=submit]");
  if (!b) return;
  if (on) { b.dataset.t = b.textContent; b.textContent = text || "Aguarde…"; } else if (b.dataset.t) b.textContent = b.dataset.t;
  b.disabled = on;
}
authEl.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => authTab(b.dataset.tab)));

$("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, email = f.elements.email.value.trim(), password = f.elements.password.value;
  if (!email || !password) return authMsg("Informe e-mail e senha.");
  busy(f, true, "Entrando…");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  busy(f, false);
  if (error) return authMsg(authError(error));
  f.reset();
  closeModal(authEl);
});
$("signup-form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, nome = f.elements.nome.value.trim(), email = f.elements.email.value.trim(), password = f.elements.password.value;
  if (!nome || !email) return authMsg("Preencha nome e e-mail.");
  if (password.length < 8) return authMsg("A senha precisa ter pelo menos 8 caracteres.");
  busy(f, true, "Criando…");
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: nome }, emailRedirectTo: location.origin + location.pathname }
  });
  busy(f, false);
  if (error) return authMsg(authError(error));
  if (data.user && data.user.identities && data.user.identities.length === 0)
    return authMsg("Este e-mail já tem cadastro. Use \"Entrar\" ou recupere a senha.");
  f.reset();
  if (data.session) { closeModal(authEl); return; }
  authTab("login");
  $("login-form").elements.email.value = email;
  authMsg("", "Quase lá! Enviamos um e-mail de confirmação para " + email + ". Clique no link e depois entre aqui.");
});
$("forgot").addEventListener("click", async () => {
  const email = $("login-form").elements.email.value.trim();
  if (!email) return authMsg("Digite seu e-mail acima e clique em \"Esqueci a senha\" de novo.");
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) return authMsg(authError(error));
  authMsg("", "Se esse e-mail tiver cadastro, enviamos um link para criar uma nova senha.");
});
$("reset-form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, p1 = f.elements.password.value;
  if (p1.length < 8) return authMsg("A senha precisa ter pelo menos 8 caracteres.");
  busy(f, true, "Salvando…");
  const { error } = await sb.auth.updateUser({ password: p1 });
  busy(f, false);
  if (error) return authMsg(authError(error));
  f.reset();
  closeModal(authEl);
  alert("Senha alterada com sucesso!");
});

// ====== Sessão ======
async function applySession(session) {
  user = session && session.user || null;
  if (!user) {
    if (loadedFor) {                       // acabou de sair: não deixar dados pessoais no formulário
      form.reset();
      form.elements.cidade.innerHTML = cityOptions("Londrina");
      if (!acct.hidden) closeModal(acct);
    }
    profile = null; isAdmin = false; addresses = []; loadedFor = null;
    paintHeader();
    return;
  }
  if (loadedFor === user.id) return;
  loadedFor = user.id;
  const [p, a, adm] = await Promise.all([
    sb.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle(),
    sb.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at"),
    sb.rpc("is_admin")
  ]);
  profile = p.data || { full_name: "", phone: null };
  addresses = a.data || [];
  isAdmin = adm.data === true;
  paintHeader();
  prefillCheckout();
}
function firstName() {
  const n = (profile && profile.full_name || "").trim() || (user && user.email || "").split("@")[0];
  return n.split(/\s+/)[0];
}
function paintHeader() {
  const b = $("auth-btn");
  b.textContent = user ? "Olá, " + firstName() : "Entrar";
  b.setAttribute("aria-label", user ? "Abrir minha conta" : "Entrar ou criar conta");
  $("admin-link").hidden = !isAdmin;
  $("login-hint").hidden = !!user;
  $("save-addr").hidden = !user;
}
function prefillCheckout() {
  const f = form.elements;
  if (profile) {
    if (!f.nome.value && profile.full_name) f.nome.value = profile.full_name;
    if (!f.fone.value && profile.phone) f.fone.value = profile.phone;
  }
  const a = addresses.find(x => x.is_default) || addresses[0];
  if (a && !f.rua.value && !f.bairro.value) {
    if (a.city && !CITIES.includes(a.city)) f.cidade.insertAdjacentHTML("beforeend", `<option>${esc(a.city)}</option>`);
    f.rua.value = a.street; f.bairro.value = a.neighborhood; f.cidade.value = a.city; f.comp.value = a.complement || "";
  }
}
$("auth-btn").addEventListener("click", () => user ? openAccount("orders") : openAuth("login"));
if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    // não chamar o Supabase direto aqui dentro (evita travar); adiamos para o próximo ciclo
    setTimeout(() => {
      if (event === "PASSWORD_RECOVERY") { openAuth("reset"); authTab("reset"); }
      applySession(session);
    }, 0);
  });
} else {
  $("auth-btn").hidden = true;
}

// ====== Minha conta ======
const acct = $("acct");
async function openAccount(tab) {
  if (!user) return openAuth("login");
  openModal(acct);
  await showAcctTab(tab || "orders");
}
async function showAcctTab(tab) {
  acct.querySelectorAll("[data-acct-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.acctTab === tab)));
  const body = $("acct-body");
  body.innerHTML = '<p class="empty">Carregando…</p>';
  try { if (tab === "orders") await renderOrders(body); else await renderProfile(body); }
  catch (e) { body.innerHTML = '<p class="err">Não foi possível carregar. Tente de novo.</p>'; }
}
acct.querySelectorAll("[data-acct-tab]").forEach(b => b.addEventListener("click", () => showAcctTab(b.dataset.acctTab)));

async function renderOrders(body) {
  const { data, error } = await sb.from("orders")
    .select("id,order_number,status,delivery_mode,subtotal_cents,total_cents,created_at,order_items(product_id,product_name,quantity)")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  if (!data.length) { body.innerHTML = '<p class="empty">Você ainda não fez pedidos por aqui. Que tal escolher uns sabores?</p>'; return; }
  body.innerHTML = data.map(o => {
    const st = STATUS[o.status] || { mine: o.status, cls: "" };
    const items = o.order_items.map(i => i.quantity + "x " + esc(i.product_name)).join(", ");
    const total = o.total_cents != null ? brl(o.total_cents) : "a confirmar";
    return `<div class="ocard">
      <div class="ohead"><b>Pedido nº ${o.order_number}</b><span class="badge-st ${st.cls}">${esc(st.mine)}</span></div>
      <div class="note">${fmtDate(o.created_at)} · ${o.delivery_mode === "entrega" ? "Entrega" : "Retirada"}</div>
      <p class="oitems">${items}</p>
      <div class="ofoot"><span>Total: <b>${total}</b></span>
        <span class="oacts">
          <button type="button" class="btn small ghost" data-act="reorder" data-id="${o.id}">Pedir de novo</button>
          ${o.status === "novo" ? `<button type="button" class="btn small ghost danger" data-act="cancel" data-id="${o.id}">Cancelar</button>` : ""}
        </span></div>
    </div>`;
  }).join("");
  body._orders = data;
}
async function renderProfile(body) {
  body.innerHTML = `
    <form id="prof-form" class="stack" novalidate>
      <h3>Meus dados</h3>
      <label class="f">Nome<input name="nome" maxlength="120" autocomplete="name" value="${esc(profile.full_name)}"></label>
      <label class="f">Telefone / WhatsApp<input name="fone" type="tel" maxlength="20" autocomplete="tel" value="${esc(profile.phone || "")}"></label>
      <p class="note">E-mail da conta: ${esc(user.email)}</p>
      <button class="btn" type="submit">Salvar dados</button>
      <p class="note" id="prof-msg" role="status"></p>
    </form>
    <div class="stack"><h3>Meus endereços</h3>
      ${addresses.length ? addresses.map(a => `<div class="acard">
        <div><b>${esc(a.label)}</b>${a.is_default ? ' <span class="badge-st st-ok">padrão</span>' : ""}<br>
          ${esc(a.street)} - ${esc(a.neighborhood)}, ${esc(a.city)}${a.complement ? " (" + esc(a.complement) + ")" : ""}</div>
        <span class="oacts">
          ${a.is_default ? "" : `<button type="button" class="btn small ghost" data-act="defaddr" data-id="${a.id}">Tornar padrão</button>`}
          <button type="button" class="btn small ghost danger" data-act="deladdr" data-id="${a.id}">Excluir</button>
        </span></div>`).join("") : '<p class="note">Nenhum endereço salvo ainda.</p>'}
      <form id="addr-form" class="stack" novalidate>
        <label class="f">Nome do endereço<input name="label" value="Casa" maxlength="40"></label>
        <label class="f">Rua e número<input name="rua" maxlength="160" autocomplete="street-address"></label>
        <div class="two"><label class="f">Bairro<input name="bairro" maxlength="80"></label><label class="f">Cidade<select name="cidade">${cityOptions("Londrina")}</select></label></div>
        <label class="f">Complemento (opcional)<input name="comp" maxlength="120"></label>
        <label class="chk"><input type="checkbox" name="padrao" ${addresses.length ? "" : "checked"}> Usar como endereço padrão</label>
        <button class="btn ghost" type="submit">Adicionar endereço</button>
        <p class="err" id="addr-err" role="alert"></p>
      </form>
    </div>
    <button class="btn ghost full" type="button" data-act="logout">Sair da conta</button>`;
}

$("acct-body").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === "prof-form") {
    const nome = f.elements.nome.value.trim(), fone = f.elements.fone.value.trim(), msg = $("prof-msg");
    if (fone && !/^[0-9+() -]{8,20}$/.test(fone)) { msg.textContent = "Telefone inválido. Use só números, com DDD."; return; }
    const { error } = await sb.from("profiles").update({ full_name: nome, phone: fone || null }).eq("id", user.id);
    if (error) { msg.textContent = "Não foi possível salvar."; return; }
    profile = { full_name: nome, phone: fone || null };
    paintHeader();
    msg.textContent = "Dados salvos ✓";
  } else if (f.id === "addr-form") {
    const v = Object.fromEntries(new FormData(f)), err = $("addr-err");
    if (!v.rua.trim() || !v.bairro.trim() || !v.cidade.trim()) { err.textContent = "Preencha rua, bairro e cidade."; return; }
    const { error } = await sb.from("addresses").insert({
      user_id: user.id, label: (v.label || "Casa").trim() || "Casa", street: v.rua.trim(),
      neighborhood: v.bairro.trim(), city: v.cidade.trim(), complement: v.comp.trim() || null, is_default: !!v.padrao
    });
    if (error) { err.textContent = "Não foi possível salvar o endereço."; return; }
    await reloadAddresses();
    showAcctTab("profile");
  }
});
$("acct-body").addEventListener("click", async e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if (act === "logout") { closeModal(acct); await sb.auth.signOut(); return; }
  if (act === "cancel") {
    if (!confirm("Cancelar este pedido?")) return;
    const { error } = await sb.rpc("cancel_my_order", { p_order_id: id });
    if (error) alert(error.message);
    showAcctTab("orders");
  } else if (act === "reorder") {
    const o = ($("acct-body")._orders || []).find(x => x.id === id);
    if (!o) return;
    let skipped = 0;
    o.order_items.forEach(i => {
      const p = PRODUCTS.find(x => x.dbId === i.product_id);
      if (p && p.available) qty[p.id] = Math.min(99, (qty[p.id] || 0) + i.quantity); else skipped++;
    });
    save(); render();
    closeModal(acct);
    openCart();
    if (skipped) alert(skipped + " item(ns) do pedido antigo não está(ão) disponível(is) agora.");
  } else if (act === "defaddr" || act === "deladdr") {
    const q = act === "defaddr"
      ? sb.from("addresses").update({ is_default: true }).eq("id", id)
      : sb.from("addresses").delete().eq("id", id);
    await q;
    await reloadAddresses();
    showAcctTab("profile");
  }
});
async function reloadAddresses() {
  const a = await sb.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at");
  addresses = a.data || [];
}

// ====== Finalizar pedido ======
const form = $("checkout");
form.addEventListener("change", e => {
  if (e.target.name === "mode") {
    $("addr").hidden = mode() === "Retirada";
    $("save-addr").hidden = !user || mode() === "Retirada";
    render();
  }
});
function waMessage(v, delivery, lines, order, sub) {
  const subtotal = order ? order.subtotal_cents : sub;
  const fee = order ? order.delivery_fee_cents : (delivery ? SETTINGS.deliveryFee : 0);
  const itemLines = lines.map(({ p, n }) => `- ${n}x ${p.name}` + (p.priceCents != null ? ` (${brl(p.priceCents * n)})` : ""));
  const parts = [
    "Olá, tudo bem? Gostaria de fazer um pedido:",
    order ? "*Pedido nº " + order.order_number + "*" : "",
    "",
    "*Itens*",
    ...itemLines,
    "",
    subtotal != null ? "*Subtotal:* " + brl(subtotal) : "*Subtotal:* a confirmar",
    delivery ? "*Entrega:* " + (fee == null ? "taxa a combinar" : brl(fee)) : "*Retirada:* sem taxa",
    "",
    "*Nome:* " + v.nome.trim()
  ];
  if (v.fone.trim()) parts.push("*Telefone:* " + v.fone.trim());
  if (delivery) {
    parts.push("*Endereço:* " + v.rua.trim() + " - " + v.bairro.trim() + ", " + v.cidade.trim() +
      (v.comp.trim() ? " (" + v.comp.trim() + ")" : ""));
  }
  parts.push("*Pagamento:* " + v.pag);
  if (v.obs.trim()) parts.push("*Observações:* " + v.obs.trim());
  return parts.filter((x, i) => !(x === "" && i === 1 && !order)).join("\n");
}
function businessError(e) {
  if (e.code === "23514") return "Confira os dados informados (nome, telefone e endereço).";
  if (e.code === "42501") return "Sem permissão para enviar o pedido. Fale com a gente pelo WhatsApp.";
  return e.message || "Não foi possível enviar o pedido.";
}
form.addEventListener("submit", async e => {
  e.preventDefault();
  if (submitting) return;
  const v = Object.fromEntries(new FormData(form));
  const delivery = v.mode === "Entrega";
  const { lines, sub } = summary();
  const err = $("err");
  form.querySelectorAll(".bad").forEach(x => x.classList.remove("bad"));

  const need = ["nome"].concat(delivery ? ["rua", "bairro", "cidade"] : []);
  const missing = need.filter(k => !String(v[k] || "").trim());
  if (missing.length) {
    missing.forEach(k => form.elements[k].classList.add("bad"));
    form.elements[missing[0]].focus();
    err.textContent = "Preencha os campos marcados.";
    return;
  }
  if (v.fone.trim() && !/^[0-9+() -]{8,20}$/.test(v.fone.trim())) {
    form.elements.fone.classList.add("bad"); form.elements.fone.focus();
    err.textContent = "Telefone inválido. Use só números, com DDD.";
    return;
  }
  if (!SETTINGS.ordersEnabled) { err.textContent = "No momento não estamos recebendo pedidos pelo site."; return; }
  if (SETTINGS.minOrder != null && sub != null && sub < SETTINGS.minOrder) {
    err.textContent = "O pedido mínimo é " + brl(SETTINGS.minOrder) + ".";
    return;
  }
  err.textContent = "";

  let order = null;
  submitting = true; render();
  const btn = $("submit"); const label = btn.textContent; btn.textContent = "Enviando…";
  try {
    if (sb && fromDb) {
      const { data, error } = await sb.rpc("create_order", {
        p_customer_name: v.nome.trim(),
        p_customer_phone: v.fone.trim() || null,
        p_delivery_mode: delivery ? "entrega" : "retirada",
        p_payment_method: v.pag,
        p_address: delivery ? { street: v.rua.trim(), neighborhood: v.bairro.trim(), city: v.cidade.trim(), complement: v.comp.trim() } : null,
        p_notes: v.obs.trim() || null,
        p_items: lines.map(({ p, n }) => ({ slug: p.id, quantity: n }))
      });
      if (error && !isNetworkError(error)) {
        err.textContent = businessError(error);
        if (/esgotad|indispon/i.test(error.message || "")) await loadCatalog();
        return;
      }
      order = error ? null : data;
    }
  } finally {
    submitting = false; btn.textContent = label; render();
  }

  const url = waBase() + "?text=" + encodeURIComponent(waMessage(v, delivery, lines, order, sub));
  if (!order) {
    // Sem conexão com o banco: o pedido segue só pelo WhatsApp, como antes.
    openWhatsApp(url, true);
    return;
  }
  if (user && delivery && form.elements.salvar.checked) saveAddressFromCheckout(v);
  Object.keys(qty).forEach(k => delete qty[k]);
  save(); render();
  showSuccess(order, url);
  openWhatsApp(url, false);
});
async function saveAddressFromCheckout(v) {
  const dup = addresses.some(a => a.street === v.rua.trim() && a.neighborhood === v.bairro.trim() && a.city === v.cidade.trim());
  if (dup) return;
  await sb.from("addresses").insert({
    user_id: user.id, label: "Casa", street: v.rua.trim(), neighborhood: v.bairro.trim(),
    city: v.cidade.trim(), complement: v.comp.trim() || null, is_default: addresses.length === 0
  });
  reloadAddresses();
}
function showSuccess(order, url) {
  $("success-num").textContent = "Pedido nº " + order.order_number;
  $("success-wa").href = url;
  $("drawer-body").dataset.view = "success";
  $("drawer-body").scrollTop = 0;
  $("success-wa").focus();
}
$("success-new").addEventListener("click", () => { closeCart(); });

// ====== Início ======
form.elements.cidade.innerHTML = cityOptions("Londrina");
$("groups").innerHTML = '<p class="empty">Carregando cardápio…</p>';
loadCatalog().then(() => {
  if (sb) sb.auth.getSession().then(({ data }) => applySession(data.session));
});
