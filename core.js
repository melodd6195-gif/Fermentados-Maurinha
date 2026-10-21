// Núcleo compartilhado entre o site (index.html) e o painel (admin.html)
(function () {
  "use strict";
  const cfg = window.APP_CONFIG || {};
  const libOk = !!(window.supabase && window.supabase.createClient);
  const sb = libOk && cfg.SUPABASE_URL && cfg.SUPABASE_KEY
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const brl = cents => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // "12,50" | "12.5" | "R$ 1.200,00" -> centavos. Vazio -> null. Inválido -> NaN.
  function parseMoney(v) {
    v = String(v == null ? "" : v).trim().replace(/^R\$\s*/i, "");
    if (!v) return null;
    if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
    else if (!/^\d+\.\d{1,2}$/.test(v)) v = v.replace(/\./g, "");
    if (!/^\d+(\.\d+)?$/.test(v)) return NaN;          // sem letras, sinais ou notação científica
    const n = Number(v);
    return n <= 100000 ? Math.round(n * 100) : NaN;       // teto de R$ 100.000 (o banco aceita bem mais, mas isso é erro de digitação)
  }
  const moneyInput = cents => cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");

  const STATUS = {
    novo:              { label: "Novo",              mine: "Recebido",          cls: "st-novo" },
    confirmado:        { label: "Confirmado",        mine: "Confirmado",        cls: "st-conf" },
    em_preparo:        { label: "Em preparo",        mine: "Em preparo",        cls: "st-prep" },
    saiu_para_entrega: { label: "Saiu para entrega", mine: "Saiu para entrega", cls: "st-saiu" },
    entregue:          { label: "Entregue",          mine: "Entregue",          cls: "st-ok" },
    cancelado:         { label: "Cancelado",         mine: "Cancelado",         cls: "st-cancel" }
  };

  const fmtDate = iso => new Date(iso).toLocaleString("pt-BR",
    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  function authError(e) {
    const c = (e && (e.code || "")) + "", m = (e && e.message) || "";
    if (c === "invalid_credentials" || /invalid login/i.test(m)) return "E-mail ou senha incorretos.";
    if (c === "email_not_confirmed" || /not confirmed/i.test(m)) return "Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).";
    if (c === "user_already_exists" || /already registered/i.test(m)) return "Este e-mail já tem cadastro. Use \"Entrar\" ou recupere a senha.";
    if (c === "weak_password" || /password should/i.test(m)) return "Senha fraca. Use pelo menos 8 caracteres.";
    if (/email.*invalid|invalid.*email|unable to validate email/i.test(m + c)) return "E-mail inválido.";
    if (/rate limit|too many/i.test(m + c)) return "Muitas tentativas. Espere alguns minutos e tente de novo.";
    if (/failed to fetch|network/i.test(m)) return "Sem conexão com o servidor. Verifique a internet.";
    return m || "Algo deu errado. Tente de novo.";
  }

  // Erro de rede = sem "code" vindo do banco (erros de regra de negócio sempre têm code)
  const isNetworkError = e => !!e && !e.code;

  window.App = { sb, esc, brl, parseMoney, moneyInput, STATUS, fmtDate, authError, isNetworkError };
})();
