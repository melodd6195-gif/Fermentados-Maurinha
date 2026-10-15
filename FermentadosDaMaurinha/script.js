// ====== EDITE AQUI ======
const WHATSAPP = "5543991442024";
const DELIVERY_FEE = null;   // taxa de entrega em reais (ex.: 8) ou null para "a combinar"
const MIN_ORDER = null;      // pedido mínimo em reais (ex.: 30) ou null para não ter mínimo
const PAYMENT_METHODS = ["Pix", "Cartão (na entrega)", "Dinheiro"]; // ajuste conforme a Maurinha aceita

// price: valor em reais (ex.: 12) ou null para "Consulte o valor"
const PRODUCTS = [
  { id: "k-jabuticaba", group: "kombucha", name: "Kombucha de jabuticaba", desc: "", color: "#2e0f2c", price: null },
  { id: "k-maracuja", group: "kombucha", name: "Kombucha de maracujá", desc: "", color: "#f0a500", price: null },
  { id: "k-uvas", group: "kombucha", name: "Kombucha de uvas", desc: "", color: "#5b2a86", price: null },
  { id: "k-morango", group: "kombucha", name: "Kombucha de morango", desc: "", color: "#d62839", price: null },
  { id: "k-goiaba", group: "kombucha", name: "Kombucha de goiaba", desc: "", color: "#ee6c7b", price: null },
  { id: "k-cidreira", group: "kombucha", name: "Kombucha de cidreira", desc: "", color: "#a9bf6a", price: null },
  { id: "k-abacaxi", group: "kombucha", name: "Kombucha de abacaxi", desc: "", color: "#f6d04d", price: null },
  { id: "k-limao", group: "kombucha", name: "Kombucha de limão", desc: "", color: "#c7d84a", price: null },
  { id: "k-pitaya", group: "kombucha", name: "Kombucha de pitaya", desc: "", color: "#d6336c", price: null },
  { id: "k-pitaya-morango", group: "kombucha", name: "Kombucha de pitaya com morango", desc: "", color: "#e8478a", price: null },
  { id: "f-natural", group: "kefir", name: "Iogurte natural", desc: "", color: "#f1ebe0", price: null },
  { id: "f-grego", group: "kefir", name: "Iogurte grego", desc: "", color: "#fbf5e6", price: null },
  { id: "f-geleia-vermelhas", group: "kefir", name: "Geleia de frutas vermelhas", desc: "", color: "#9b1b30", jar: true, price: null },
  { id: "f-geleia-maracuja", group: "kefir", name: "Geleia de maracujá", desc: "", color: "#e9a820", jar: true, price: null },
  { id: "f-sementes", group: "kefir", name: "Mix de sementes", desc: "", color: "#a67c52", jar: true, price: null }
];
const GROUPS = {
  kombucha: { title: "Kombucha", text: "Chá fermentado, naturalmente gaseificado." },
  kefir: { title: "Kefir e iogurtes", text: "Cremosos, com geleias e sementes para completar." }
};
// ========================

const $ = id => document.getElementById(id);
const brl = n => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const waBase = "https://wa.me/" + WHATSAPP;

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
const priceText = p => p.price == null ? "Consulte o valor" : brl(p.price);

// vitrine do topo
$("shelf").innerHTML = ["k-jabuticaba", "k-maracuja", "k-morango", "k-pitaya", "k-limao"]
  .map(id => bottle(PRODUCTS.find(p => p.id === id).color)).join("");

// cardápio
$("groups").innerHTML = Object.keys(GROUPS).map(g => `
  <div class="group">
    <h3>${GROUPS[g].title}</h3>
    <p>${GROUPS[g].text}</p>
    ${PRODUCTS.filter(p => p.group === g).map(p => `
      <div class="row">
        ${pic(p, "mini")}
        <div>
          <div class="name">${p.name}</div>
          ${p.desc ? `<div class="desc">${p.desc}</div>` : ""}
          <div class="price">${priceText(p)}</div>
        </div>
        <div class="stepper" role="group" aria-label="Quantidade de ${p.name}">
          <button type="button" data-id="${p.id}" data-d="-1" aria-label="Diminuir ${p.name}">−</button>
          <output id="q-${p.id}">0</output>
          <button type="button" class="plus" data-id="${p.id}" data-d="1" aria-label="Aumentar ${p.name}">+</button>
        </div>
      </div>`).join("")}
  </div>`).join("");

// carrinho (guardado no navegador; se falhar, funciona só durante a visita)
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("fdm-cart")) || {};
    const ok = {};
    PRODUCTS.forEach(p => { if (saved[p.id] > 0) ok[p.id] = saved[p.id]; });
    return ok;
  } catch (e) { return {}; }
}
function save() { try { localStorage.setItem("fdm-cart", JSON.stringify(qty)); } catch (e) {} }
const qty = load();

function summary() {
  const lines = PRODUCTS.filter(p => qty[p.id] > 0).map(p => ({ p, n: qty[p.id] }));
  const count = lines.reduce((s, l) => s + l.n, 0);
  const priced = lines.length > 0 && lines.every(l => l.p.price != null);
  const sub = priced ? lines.reduce((s, l) => s + l.p.price * l.n, 0) : null;
  return { lines, count, sub };
}
const mode = () => document.querySelector('input[name="mode"]:checked').value;
const plural = n => n + (n === 1 ? " item" : " itens");

function render() {
  const { lines, count, sub } = summary();
  PRODUCTS.forEach(p => { $("q-" + p.id).textContent = qty[p.id] || 0; });

  // barra, selo e botão
  $("count").textContent = plural(count);
  $("bar-total").textContent = sub != null ? "· " + brl(sub) : "";
  $("bar").classList.toggle("on", count > 0);
  $("badge").textContent = count;
  $("badge").hidden = count === 0;

  // itens
  $("cart-items").innerHTML = lines.length ? lines.map(({ p, n }) => `
    <div class="citem">
      <div><div class="name">${p.name}</div>
        <div class="price">${p.price == null ? "Consulte o valor" : n + " × " + brl(p.price) + " = " + brl(p.price * n)}</div></div>
      <div class="stepper" role="group" aria-label="Quantidade de ${p.name}">
        <button type="button" data-id="${p.id}" data-d="-1" aria-label="Diminuir ${p.name}">−</button>
        <output>${n}</output>
        <button type="button" class="plus" data-id="${p.id}" data-d="1" aria-label="Aumentar ${p.name}">+</button>
      </div>
    </div>`).join("") : '<p class="empty">Seu carrinho está vazio. Escolha seus sabores no cardápio.</p>';
  $("clear").hidden = lines.length === 0;
  $("submit").disabled = lines.length === 0;

  // totais
  const delivery = mode() === "Entrega";
  const fee = delivery ? DELIVERY_FEE : 0;
  const total = sub != null && fee != null ? sub + fee : null;
  $("totals").innerHTML = `
    <div><span>Subtotal</span><span>${sub != null ? brl(sub) : "a confirmar"}</span></div>
    <div><span>${delivery ? "Entrega" : "Retirada"}</span><span>${!delivery ? "sem taxa" : fee == null ? "a combinar" : brl(fee)}</span></div>
    <div class="grand"><span>Total</span><span>${total != null ? brl(total) : "a confirmar"}</span></div>`;
}

function change(id, d) {
  const n = Math.max(0, (qty[id] || 0) + d);
  if (n) qty[id] = n; else delete qty[id];
  save(); render();
}
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-id]");
  if (b) change(b.dataset.id, Number(b.dataset.d));
});
$("clear").addEventListener("click", () => { Object.keys(qty).forEach(k => delete qty[k]); save(); render(); });

// gaveta
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
  if (lastFocus) lastFocus.focus();
}
$("open-cart").addEventListener("click", openCart);
$("cart-top").addEventListener("click", openCart);
$("close-cart").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.addEventListener("keydown", e => {
  if (!drawer.classList.contains("on")) return;
  if (e.key === "Escape") return closeCart();
  if (e.key === "Tab") { // mantém o foco dentro da gaveta
    const f = [...drawer.querySelectorAll("button, input, select, textarea")].filter(x => !x.disabled && !x.hidden && x.offsetParent);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// formulário
const form = $("checkout");
$("pag").innerHTML = PAYMENT_METHODS.map(m => `<option>${m}</option>`).join("");
form.addEventListener("change", e => {
  if (e.target.name === "mode") { $("addr").hidden = mode() === "Retirada"; render(); }
});
form.addEventListener("submit", e => {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(form));
  const delivery = v.mode === "Entrega";
  const { lines, sub } = summary();
  form.querySelectorAll(".bad").forEach(x => x.classList.remove("bad"));

  const need = ["nome"].concat(delivery ? ["rua", "bairro", "cidade"] : []);
  const missing = need.filter(k => !String(v[k] || "").trim());
  if (missing.length) {
    missing.forEach(k => form.elements[k].classList.add("bad"));
    form.elements[missing[0]].focus();
    $("err").textContent = "Preencha os campos marcados.";
    return;
  }
  if (MIN_ORDER != null && sub != null && sub < MIN_ORDER) {
    $("err").textContent = "O pedido mínimo é " + brl(MIN_ORDER) + ".";
    return;
  }
  $("err").textContent = "";

  const itemLines = lines.map(({ p, n }) =>
    `- ${n}x ${p.name}` + (p.price != null ? ` (${brl(p.price * n)})` : ""));
  const fee = delivery ? DELIVERY_FEE : 0;
  const parts = [
    "Olá, Maurinha! Gostaria de fazer um pedido:",
    "",
    "*Itens*",
    ...itemLines,
    "",
    sub != null ? "*Subtotal:* " + brl(sub) : "*Subtotal:* a confirmar",
    delivery ? "*Entrega:* " + (fee == null ? "taxa a combinar" : brl(fee)) : "*Retirada:* sem taxa",
    "",
    "*Nome:* " + v.nome.trim(),
    "*Recebimento:* " + v.mode
  ];
  if (delivery) {
    parts.push("*Endereço:* " + v.rua.trim() + " - " + v.bairro.trim() + ", " + v.cidade.trim() +
      (v.comp.trim() ? " (" + v.comp.trim() + ")" : ""));
  }
  parts.push("*Pagamento:* " + v.pag);
  if (v.obs.trim()) parts.push("*Observações:* " + v.obs.trim());

  const url = waBase + "?text=" + encodeURIComponent(parts.join("\n"));
  if (!window.open(url, "_blank", "noopener")) location.href = url;
});

// links gerais de WhatsApp
document.querySelectorAll("a[data-wa]").forEach(a => {
  a.href = waBase + "?text=" + encodeURIComponent("Olá, Maurinha! Vim pelo site e gostaria de saber mais sobre os fermentados.");
  a.target = "_blank"; a.rel = "noopener";
});
render();