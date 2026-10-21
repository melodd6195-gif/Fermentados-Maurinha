"use strict";
const { sb, esc, brl, parseMoney, moneyInput, STATUS, fmtDate, authError } = window.App;
const $ = id => document.getElementById(id);

// ====== Utilidades ======
let toastTimer = null;
function toast(msg, bad) {
  const t = $("toast");
  t.textContent = msg; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, bad ? 6000 : 3000);
}
function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    const o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = .08; o.start();
    setTimeout(() => { o.stop(); a.close(); }, 250);
  } catch (e) {}
}
function show(view) {
  ["boot", "login", "denied", "app"].forEach(v => { $("v-" + v).hidden = v !== view; });
  $("logout").hidden = !(view === "app" || view === "denied");
}
const modals = [];
function openModal(m) { m._last = document.activeElement; m.hidden = false; document.body.style.overflow = "hidden"; modals.push(m); }
function closeModal(m) {
  const i = modals.indexOf(m); if (i >= 0) modals.splice(i, 1);
  m.hidden = true;
  if (!modals.length) document.body.style.overflow = "";
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
  if (m && (e.target === m || e.target.closest("[data-close]"))) closeModal(m);
});
// update com verificação: RLS não dá erro quando bloqueia, só não altera nada
async function upd(table, values, id) {
  const { data, error } = await sb.from(table).update(values).eq("id", id).select("id");
  if (error) return error.message || "Erro ao salvar.";
  if (!data || !data.length) return "Sem permissão ou registro não encontrado.";
  return null;
}
const digits = s => String(s || "").replace(/\D/g, "");
function waLink(phone, text) {
  let d = digits(phone);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return "https://wa.me/" + d + "?text=" + encodeURIComponent(text);
}

// ====== Sessão ======
let uid = null, poll = null, channel = null, unseen = 0;
async function handleSession(session) {
  if (!session) {
    uid = null; stopLive(); show("login"); return;
  }
  if (uid === session.user.id) return;
  uid = session.user.id;
  const { data, error } = await sb.rpc("is_admin");
  if (error || data !== true) { stopLive(); show("denied"); return; }
  show("app");
  loadOrders();
  startLive();
}
function startLive() {
  stopLive();
  poll = setInterval(loadOrders, 60000);
  channel = sb.channel("orders-live")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, payload => {
      toast("Novo pedido nº " + (payload.new && payload.new.order_number) + "!");
      beep();
      unseen++; document.title = "(" + unseen + ") Novo pedido – Painel";
      loadOrders();
    })
    .subscribe();
}
function stopLive() {
  if (poll) clearInterval(poll); poll = null;
  if (channel) { sb.removeChannel(channel); channel = null; }
}
window.addEventListener("focus", () => { unseen = 0; document.title = "Painel – Fermentados da Maurinha"; });

if (!sb) {
  show("login");
  $("login-err").textContent = "Não foi possível conectar ao Supabase. Confira o config.js e a internet.";
} else {
  sb.auth.onAuthStateChange((ev, session) => { setTimeout(() => handleSession(session), 0); });
  sb.auth.getSession().then(({ data }) => handleSession(data.session));
}
$("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, err = $("login-err");
  const email = f.elements.email.value.trim(), password = f.elements.password.value;
  if (!email || !password) { err.textContent = "Informe e-mail e senha."; return; }
  err.textContent = "";
  const b = f.querySelector("button[type=submit]"); b.disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  b.disabled = false;
  if (error) err.textContent = authError(error); else f.reset();
});
$("logout").addEventListener("click", async () => { await sb.auth.signOut(); });

// ====== Abas ======
document.querySelectorAll(".adm .tabs [data-tab]").forEach(b => b.addEventListener("click", () => {
  const t = b.dataset.tab;
  document.querySelectorAll(".adm .tabs [data-tab]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
  ["orders", "products", "settings"].forEach(n => { $("t-" + n).hidden = n !== t; });
  if (t === "products") loadProducts();
  if (t === "settings") loadSettings();
  if (t === "orders") loadOrders();
}));

// ====== Pedidos ======
const ACTIVE = ["novo", "confirmado", "em_preparo", "saiu_para_entrega"];
const FILTERS = [
  { id: "ativos", label: "Em andamento", test: o => ACTIVE.includes(o.status) },
  { id: "entregues", label: "Entregues", test: o => o.status === "entregue" },
  { id: "cancelados", label: "Cancelados", test: o => o.status === "cancelado" },
  { id: "todos", label: "Todos", test: () => true }
];
let orders = [], filter = "ativos";

async function loadOrders() {
  const { data, error } = await sb.from("v_order_overview").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) { toast("Não foi possível carregar os pedidos: " + error.message, true); return; }
  orders = data || [];
  renderOrders();
}
function renderOrders() {
  const today = new Date().toDateString();
  const hoje = orders.filter(o => new Date(o.created_at).toDateString() === today && o.status !== "cancelado");
  const known = hoje.reduce((s, o) => s + (o.total_cents || 0), 0);
  const pend = hoje.filter(o => o.total_cents == null).length;
  const novos = orders.filter(o => o.status === "novo").length;
  $("stats").innerHTML = `
    <div class="stat"><b>${hoje.length}</b><span>pedidos hoje</span></div>
    <div class="stat"><b>${brl(known)}</b><span>vendido hoje${pend ? " (+" + pend + " a confirmar)" : ""}</span></div>
    <div class="stat"><b>${novos}</b><span>novos para confirmar</span></div>`;
  const nc = $("new-count"); nc.textContent = novos; nc.hidden = novos === 0;

  $("chips").innerHTML = FILTERS.map(f =>
    `<button type="button" class="chip" data-f="${f.id}" aria-pressed="${filter === f.id}">${f.label} (${orders.filter(f.test).length})</button>`).join("");
  const test = FILTERS.find(f => f.id === filter).test;
  const list = orders.filter(test);
  $("orders-list").innerHTML = list.length ? list.map(o => {
    const st = STATUS[o.status] || { label: o.status, cls: "" };
    return `<button type="button" class="ord${o.status === "novo" ? " is-new" : ""}" data-id="${o.id}">
      <div class="top1"><b>Nº ${o.order_number}</b><span class="badge-st ${st.cls}">${esc(st.label)}</span>
        <span class="note">${fmtDate(o.created_at)} · ${o.delivery_mode === "entrega" ? "Entrega" : "Retirada"}</span></div>
      <div class="tot">${o.total_cents != null ? brl(o.total_cents) : "a confirmar"}</div>
      <div class="items"><b>${esc(o.customer_name)}</b> · ${esc(o.items_text || "")}</div>
    </button>`;
  }).join("") : '<p class="empty">Nenhum pedido aqui.</p>';
}
$("chips").addEventListener("click", e => {
  const b = e.target.closest("[data-f]"); if (!b) return;
  filter = b.dataset.f; renderOrders();
});
$("orders-list").addEventListener("click", e => {
  const b = e.target.closest("[data-id]"); if (b) openOrder(b.dataset.id);
});

const NEXT = {
  novo: [["confirmado", "Confirmar pedido"], ["cancelado", "Cancelar"]],
  confirmado: [["em_preparo", "Iniciar preparo"], ["cancelado", "Cancelar"]],
  em_preparo: [["saiu_para_entrega", "Saiu para entrega"], ["entregue", "Marcar entregue"], ["cancelado", "Cancelar"]],
  saiu_para_entrega: [["entregue", "Marcar entregue"], ["cancelado", "Cancelar"]]
};
let openId = null;
async function openOrder(id) {
  openId = id;
  const body = $("order-body");
  if ($("m-order").hidden) openModal($("m-order"));
  body.innerHTML = '<p class="empty">Carregando…</p>';
  const { data: o, error } = await sb.from("orders")
    .select("*, order_items(id,product_name,quantity,unit_price_cents), order_status_history(from_status,to_status,changed_at)")
    .eq("id", id).single();
  if (error || !o) { body.innerHTML = '<p class="err">Não foi possível abrir o pedido.</p><button class="btn ghost" data-close type="button">Fechar</button>'; return; }
  renderOrder(o);
}
function renderOrder(o) {
  const st = STATUS[o.status] || { label: o.status, cls: "" };
  const items = o.order_items.slice().sort((a, b) => a.product_name.localeCompare(b.product_name, "pt-BR"));
  const hist = o.order_status_history.slice().sort((a, b) => a.changed_at.localeCompare(b.changed_at));
  const delivery = o.delivery_mode === "entrega";
  const addr = delivery
    ? esc(o.address_street) + " - " + esc(o.address_neighborhood) + ", " + esc(o.address_city) + (o.address_complement ? " (" + esc(o.address_complement) + ")" : "")
    : "";
  const acts = (NEXT[o.status] || []).filter(([s]) => delivery || s !== "saiu_para_entrega");
  const msg = "Olá, " + o.customer_name + "! Aqui é a Maurinha, dos Fermentados. Sobre o seu pedido nº " + o.order_number + ": " +
    (o.total_cents != null ? "o total ficou em " + brl(o.total_cents) + ". " : "") + "Status: " + st.label + ".";
  $("order-body").innerHTML = `
    <div class="modal-head"><h2>Pedido nº ${o.order_number}</h2><button class="x" data-close type="button" aria-label="Fechar">×</button></div>
    <div><span class="badge-st ${st.cls}">${esc(st.label)}</span> <span class="note">${fmtDate(o.created_at)}</span></div>
    <dl class="kv">
      <dt>Cliente</dt><dd>${esc(o.customer_name)}</dd>
      ${o.customer_phone ? `<dt>Telefone</dt><dd><a href="${waLink(o.customer_phone, msg)}" target="_blank" rel="noopener">${esc(o.customer_phone)}</a></dd>` : ""}
      <dt>Recebimento</dt><dd>${delivery ? "Entrega" : "Retirada"}</dd>
      ${delivery ? `<dt>Endereço</dt><dd>${addr}</dd>` : ""}
      <dt>Pagamento</dt><dd>${esc(o.payment_method)}</dd>
      ${o.notes ? `<dt>Observações</dt><dd>${esc(o.notes)}</dd>` : ""}
      <dt>Conta</dt><dd>${o.user_id ? "Cliente cadastrado" : "Convidado"}</dd>
    </dl>
    <h3>Itens e valores</h3>
    <table class="items-t"><tbody>${items.map(i => `<tr>
      <td>${i.quantity}× ${esc(i.product_name)}</td>
      <td><input data-item="${i.id}" data-orig="${i.unit_price_cents == null ? "" : i.unit_price_cents}" inputmode="decimal" placeholder="valor un." value="${moneyInput(i.unit_price_cents)}" aria-label="Valor unitário de ${esc(i.product_name)}"></td>
      <td>${i.unit_price_cents != null ? brl(i.unit_price_cents * i.quantity) : "—"}</td></tr>`).join("")}</tbody></table>
    ${delivery ? `<label class="f">Taxa de entrega (R$)<input id="fee-in" inputmode="decimal" data-orig="${o.delivery_fee_cents == null ? "" : o.delivery_fee_cents}" value="${moneyInput(o.delivery_fee_cents)}" placeholder="a combinar"></label>` : ""}
    <div class="totrow"><span>Subtotal</span><span>${o.subtotal_cents != null ? brl(o.subtotal_cents) : "a confirmar"}</span></div>
    <div class="totrow grand"><span>Total</span><span>${o.total_cents != null ? brl(o.total_cents) : "a confirmar"}</span></div>
    <button class="btn ghost" id="save-values" type="button">Salvar valores</button>
    ${acts.length ? `<h3>Andamento</h3><div class="status-row">${acts.map(([s, l]) =>
      `<button type="button" class="btn small${s === "cancelado" ? " ghost danger" : ""}" data-status="${s}">${l}</button>`).join("")}</div>` : ""}
    <h3>Histórico</h3>
    <ul class="hist">${hist.map(h => `<li>${fmtDate(h.changed_at)} · ${esc((STATUS[h.to_status] || {}).label || h.to_status)}</li>`).join("")}</ul>`;
}
$("order-body").addEventListener("click", async e => {
  const sbtn = e.target.closest("[data-status]");
  if (sbtn) {
    const s = sbtn.dataset.status;
    if (s === "cancelado" && !confirm("Cancelar este pedido?")) return;
    sbtn.disabled = true;
    const msg = await upd("orders", { status: s }, openId);
    if (msg) { toast(msg, true); sbtn.disabled = false; return; }
    toast("Status atualizado ✓");
    await openOrder(openId); loadOrders();
    return;
  }
  if (e.target.id === "save-values") {
    const inputs = [...$("order-body").querySelectorAll("[data-item]")];
    const ops = [];
    for (const inp of inputs) {
      const val = parseMoney(inp.value);
      if (Number.isNaN(val)) { toast("Valor inválido: " + inp.value, true); inp.focus(); return; }
      const orig = inp.dataset.orig === "" ? null : Number(inp.dataset.orig);
      if (val !== orig) ops.push(upd("order_items", { unit_price_cents: val }, inp.dataset.item));
    }
    const fee = $("fee-in");
    if (fee) {
      const v = parseMoney(fee.value);
      if (Number.isNaN(v)) { toast("Taxa inválida.", true); fee.focus(); return; }
      const orig = fee.dataset.orig === "" ? null : Number(fee.dataset.orig);
      if (v !== orig) ops.push(upd("orders", { delivery_fee_cents: v }, openId));
    }
    if (!ops.length) { toast("Nada para salvar."); return; }
    const res = (await Promise.all(ops)).filter(Boolean);
    if (res.length) { toast(res[0], true); return; }
    toast("Valores salvos ✓");
    await openOrder(openId); loadOrders();
  }
});

// ====== Produtos ======
let cats = [], prods = [];
async function loadProducts() {
  const [c, p] = await Promise.all([
    sb.from("categories").select("id,slug,title,sort_order").order("sort_order"),
    sb.from("products").select("*").order("sort_order")
  ]);
  if (c.error || p.error) { toast("Não foi possível carregar os produtos.", true); return; }
  cats = c.data; prods = p.data;
  renderProducts();
}
function renderProducts() {
  $("products-list").innerHTML = cats.map(c => {
    const list = prods.filter(p => p.category_id === c.id);
    return `<h2 class="cat-title">${esc(c.title)}</h2>` + (list.map(p => `
      <div class="pcard" data-id="${p.id}">
        <div class="pimg">${p.photo_path ? `<img src="${esc(p.photo_path)}" alt="">` : "sem foto"}</div>
        <div class="pfields">
          <input class="p-name" value="${esc(p.name)}" maxlength="120" aria-label="Nome">
          <div class="pgrid">
            <label>Preço (R$)<input class="p-price" inputmode="decimal" placeholder="a combinar" value="${moneyInput(p.price_cents)}"></label>
            <label>Tamanho (ml)<input class="p-size" type="number" min="1" value="${p.size_ml == null ? "" : p.size_ml}"></label>
          </div>
          <div class="pchecks">
            <label class="chk"><input type="checkbox" class="p-active" ${p.is_active ? "checked" : ""}> Visível no site</label>
            <label class="chk"><input type="checkbox" class="p-avail" ${p.is_available ? "checked" : ""}> Disponível (desmarque se esgotou)</label>
          </div>
          <div class="pacts">
            <label class="btn small ghost filebtn">Trocar foto<input type="file" accept="image/*" class="p-file" hidden></label>
            <button type="button" class="btn small p-save">Salvar</button>
            <span class="note p-msg" role="status"></span>
          </div>
        </div>
      </div>`).join("") || '<p class="note">Nenhum produto nesta categoria.</p>');
  }).join("");
}
function resizeImage(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(new Error("Não consegui converter a imagem.")), "image/jpeg", 0.82);
    };
    img.onerror = () => rej(new Error("Imagem inválida."));
    img.src = url;
  });
}
$("products-list").addEventListener("click", async e => {
  const btn = e.target.closest(".p-save"); if (!btn) return;
  const card = btn.closest(".pcard"), id = card.dataset.id, msg = card.querySelector(".p-msg");
  const name = card.querySelector(".p-name").value.trim();
  const price = parseMoney(card.querySelector(".p-price").value);
  const sizeRaw = card.querySelector(".p-size").value.trim();
  const size = sizeRaw === "" ? null : parseInt(sizeRaw, 10);
  if (!name) { msg.textContent = "Informe o nome."; return; }
  if (Number.isNaN(price)) { msg.textContent = "Preço inválido."; return; }
  if (size !== null && !(size > 0)) { msg.textContent = "Tamanho inválido."; return; }
  btn.disabled = true; msg.textContent = "Salvando…";
  const err = await upd("products", {
    name, price_cents: price, size_ml: size,
    is_active: card.querySelector(".p-active").checked,
    is_available: card.querySelector(".p-avail").checked
  }, id);
  btn.disabled = false;
  msg.textContent = err ? err : "Salvo ✓";
  if (err) toast(err, true);
});
$("products-list").addEventListener("change", async e => {
  if (!e.target.classList.contains("p-file")) return;
  const file = e.target.files[0]; if (!file) return;
  const card = e.target.closest(".pcard"), id = card.dataset.id, msg = card.querySelector(".p-msg");
  const p = prods.find(x => x.id === id);
  try {
    msg.textContent = "Enviando foto…";
    const blob = await resizeImage(file, 900);
    const path = p.slug + "-" + Date.now() + ".jpg";
    const up = await sb.storage.from("product-photos").upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) throw up.error;
    const url = sb.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
    const err = await upd("products", { photo_path: url }, id);
    if (err) throw new Error(err);
    p.photo_path = url;
    card.querySelector(".pimg").innerHTML = `<img src="${esc(url)}" alt="">`;
    msg.textContent = "Foto atualizada ✓";
  } catch (er) {
    msg.textContent = er.message || "Falha no envio da foto.";
    toast(msg.textContent, true);
  }
  e.target.value = "";
});
$("add-product").addEventListener("click", () => {
  $("pf-cat").innerHTML = cats.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join("");
  $("pf-err").textContent = "";
  openModal($("m-prod"));
  setTimeout(() => $("prod-form").elements.name.focus(), 30);
});
const slugify = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
$("prod-form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target.elements, err = $("pf-err");
  const name = f.name.value.trim(), price = parseMoney(f.price.value);
  const sizeRaw = f.size.value.trim(), size = sizeRaw === "" ? null : parseInt(sizeRaw, 10);
  if (!name) { err.textContent = "Informe o nome."; return; }
  if (Number.isNaN(price)) { err.textContent = "Preço inválido."; return; }
  if (size !== null && !(size > 0)) { err.textContent = "Tamanho inválido."; return; }
  if (!cats.length) { err.textContent = "Nenhuma categoria encontrada."; return; }
  const base = slugify(name) || "produto";
  let slug = base, n = 2;
  while (prods.some(p => p.slug === slug)) slug = base + "-" + n++;
  const same = prods.filter(p => p.category_id === f.cat.value);
  const order = same.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1;
  const { error } = await sb.from("products").insert({
    slug, category_id: f.cat.value, name, price_cents: price, size_ml: size, icon: f.icon.value, sort_order: order
  });
  if (error) { err.textContent = error.message; return; }
  closeModal($("m-prod")); e.target.reset();
  toast("Produto adicionado ✓");
  loadProducts();
});

// ====== Configurações ======
async function loadSettings() {
  const { data, error } = await sb.from("settings").select("key,value");
  const msg = $("settings-msg");
  if (error) { msg.textContent = "Não foi possível carregar."; return; }
  const s = {}; data.forEach(r => { s[r.key] = r.value; });
  const f = $("settings-form").elements;
  f.orders_enabled.checked = s.orders_enabled !== false;
  f.fee.value = typeof s.delivery_fee_cents === "number" ? moneyInput(s.delivery_fee_cents) : "";
  f.min.value = typeof s.min_order_cents === "number" ? moneyInput(s.min_order_cents) : "";
  f.payments.value = Array.isArray(s.payment_methods) ? s.payment_methods.join("\n") : "";
  f.whatsapp.value = typeof s.whatsapp_number === "string" ? s.whatsapp_number : "";
  msg.textContent = "";
}
$("settings-form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target.elements, msg = $("settings-msg");
  const fee = parseMoney(f.fee.value), min = parseMoney(f.min.value);
  const pays = f.payments.value.split("\n").map(x => x.trim()).filter(Boolean);
  const wa = digits(f.whatsapp.value);
  if (Number.isNaN(fee) || Number.isNaN(min)) { msg.textContent = "Confira os valores em reais."; return; }
  if (!pays.length) { msg.textContent = "Informe pelo menos uma forma de pagamento."; return; }
  if (!/^\d{10,15}$/.test(wa)) { msg.textContent = "WhatsApp inválido. Use só números, com 55 e DDD."; return; }
  msg.textContent = "Salvando…";
  const rows = [
    { key: "orders_enabled", value: f.orders_enabled.checked },
    { key: "payment_methods", value: pays },
    { key: "whatsapp_number", value: wa }
  ];
  const del = [];
  [["delivery_fee_cents", fee], ["min_order_cents", min]].forEach(([k, v]) => {
    if (v == null) del.push(k); else rows.push({ key: k, value: v });   // vazio = remove a regra
  });
  const r1 = await sb.from("settings").upsert(rows, { onConflict: "key" });
  if (r1.error) { msg.textContent = "Erro: " + r1.error.message; return; }
  if (del.length) {
    const r2 = await sb.from("settings").delete().in("key", del);
    if (r2.error) { msg.textContent = "Erro: " + r2.error.message; return; }
  }
  msg.textContent = "Configurações salvas ✓";
  toast("Configurações salvas ✓");
});
