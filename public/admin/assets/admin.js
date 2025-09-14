/* AFUJF – Admin Dashboard (JS) */
(() => {
  "use strict";

  /* ========== Helpers rápidos ========== */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const moneyBR = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function getSession() {
    try { return JSON.parse(localStorage.getItem("session") || "{}"); }
    catch { return {}; }
  }

  // >>> ALTERADO: só exige token. A verificação de role fica no back-end.
  function requireAdmin() {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.replace("/login.html");
      return null;
    }
    // session é opcional; usamos apenas para saudação
    return { token, session: getSession() };
  }

  /* ========== Menu lateral (Bootstrap offcanvas + fallback) ========== */
  function initMenu() {
    const launcher = $("#af-launcher");
    const offEl    = $("#menuAFUJF");
    if (!launcher || !offEl) return;

    let off = null;
    const hasBootstrap = !!(window.bootstrap && bootstrap.Offcanvas);

    const show = () => {
      if (hasBootstrap) {
        off = bootstrap.Offcanvas.getOrCreateInstance(offEl, { backdrop: true, scroll: true, keyboard: true });
        off.show();
      } else {
        offEl.classList.add("show");
        offEl.style.transform = "translateX(0)";
        createOverlay();
      }
      launcher.classList.add("hidden");
    };

    const hide = () => {
      if (hasBootstrap && off) off.hide();
      else removeOverlay(() => { offEl.style.transform = ""; offEl.classList.remove("show"); });
      launcher.classList.remove("hidden");
    };

    launcher.addEventListener("click", (e) => { e.preventDefault(); show(); });
    offEl.querySelector(".btn-close")?.addEventListener("click", hide);
    $$(".menu-link", offEl).forEach(a => a.addEventListener("click", hide));
    offEl.addEventListener("hidden.bs.offcanvas", () => launcher.classList.remove("hidden"));

    function createOverlay() {
      let ov = $("#af-overlay");
      if (!ov) {
        ov = document.createElement("div");
        ov.id = "af-overlay";
        ov.style.cssText = "position:fixed;inset:0;background:rgba(7,12,22,.35);backdrop-filter:blur(1.5px);z-index:1061;opacity:0;transition:opacity .2s";
        document.body.appendChild(ov);
        requestAnimationFrame(() => (ov.style.opacity = "1"));
        ov.onclick = hide;
        document.addEventListener("keydown", escToClose);
      }
    }
    function removeOverlay(cb) {
      const ov = $("#af-overlay");
      if (!ov) return cb && cb();
      ov.style.opacity = "0";
      setTimeout(() => { ov.remove(); cb && cb(); }, 200);
      document.removeEventListener("keydown", escToClose);
    }
    function escToClose(e){ if (e.key === "Escape") hide(); }
  }

  /* ========== Logout + Ping (opcionais) ========== */
  function initPing(){
    const btn = $("#btnPing"), out = $("#pingResult");
    if (!btn || !out) return;
    btn.addEventListener("click", async () => {
      out.className = "small text-secondary"; out.textContent = "testando…";
      btn.disabled = true;
      try{
        const r = await fetch("/health", { cache:"no-store" });
        const ok = r.ok ? await r.json() : { ok:false, status:r.status };
        out.className = r.ok ? "small text-success" : "small text-danger";
        out.textContent = r.ok ? `OK (${JSON.stringify(ok)})` : `Falha (${r.status})`;
      }catch(e){
        out.className = "small text-danger"; out.textContent = `Erro (${e.message || "desconhecido"})`;
      }finally{ btn.disabled = false; }
    });
  }

  function initLogout(){
    const tryBtns = ["#btnLogout","[data-logout]",".admin-block button",".offcanvas-afujf .admin-block button"];
    let btn = null;
    for (const sel of tryBtns) { btn = $(sel); if (btn) break; }
    if (!btn) return;
    btn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("session");
      window.location.replace("/login.html");
    });
  }

  /* ========== Fetch do dashboard (com logs e redireciono silencioso) ========== */
  async function loadDashboard(token){
    const r = await fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });

    console.log("[dashboard] status:", r.status, r.statusText);
    const ct = r.headers.get("content-type") || "";
    let body = null;
    try { body = ct.includes("application/json") ? await r.json() : await r.text(); } catch {}

    if (!r.ok) {
      if (r.status === 401 || r.status === 403) {
        console.warn("[dashboard] auth error:", body);
        window.location.replace("/login.html");
        throw new Error("AUTH_REDIRECT");
      }
      const msg =
        (body && typeof body === "object" && (body.error || body.message || body.details)) ||
        (typeof body === "string" && body.slice(0,200)) ||
        "Falha ao obter dashboard";
      console.error("[dashboard] erro:", msg, body);
      throw new Error(msg);
    }

    return (typeof body === "object") ? body : JSON.parse(body);
  }

  /* ========== Renderização de UI ========== */
  function setText(sel, text){ const el = $(sel); if (el) el.textContent = String(text); }

  function renderKpis(kpis){
    setText("#kpiAssociados", kpis.associados.toLocaleString("pt-BR"));

    const setByIdOrOrder = (id, value, money=false) => {
      const el = $(id);
      if (el) {
        el.setAttribute("data-counter", value);
        if (money) el.setAttribute("data-money", "true");
        return;
      }
      const all = $$(".kpi-val[data-counter]");
      const others = all.filter(e => e.id !== "kpiAssociados");
      const target = money ? others.at(-1) : others.shift();
      if (target) {
        target.setAttribute("data-counter", value);
        if (money) target.setAttribute("data-money", "true");
      }
    };

    setByIdOrOrder("#kpiConvenios", kpis.convenios);
    setByIdOrOrder("#kpiEventos",   kpis.eventosFuturos);
    setByIdOrOrder("#kpiReceita",   kpis.receitaMes, true);
  }

  function animateCounters(){
    const counters = $$(".kpi-val, [data-counter]");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((ent) => {
        if (!ent.isIntersecting) return;
        const el = ent.target; obs.unobserve(el);
        const target = Number(el.dataset.counter || 0);
        const isMoney = el.dataset.money === "true";
        const steps = 40; let cur = 0, t = 0, inc = Math.max(1, target/steps);
        const tick = () => {
          t++; cur = Math.min(target, cur + inc);
          el.textContent = isMoney ? moneyBR(cur) : Math.round(cur).toLocaleString("pt-BR");
          if (t < steps) requestAnimationFrame(tick);
          else el.textContent = isMoney ? moneyBR(target) : target.toLocaleString("pt-BR");
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: .4 });
    counters.forEach(c => obs.observe(c));
  }

  function renderChart(el, series, labels){
    const w = el.clientWidth || 600, h = el.clientHeight || 240, pad = 28;
    const max = Math.max(...series, 1) * 1.15, min = Math.min(...series, 0) * 0.9;
    const xStep = (w - pad*2) / Math.max(1, series.length - 1);
    const x = i => pad + i*xStep, y = v => h - pad - ((v - min)/(max - min))*(h - pad*2);
    let d = ""; series.forEach((v,i)=> d += (i?` L ${x(i)} ${y(v)}`:`M ${x(i)} ${y(v)}`));
    const dArea = `${d} L ${x(series.length-1)} ${h-pad} L ${x(0)} ${h-pad} Z`;
    el.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#12c26d"/><stop offset="100%" stop-color="#1366d6"/></linearGradient>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#12c26d" stop-opacity=".30"/><stop offset="100%" stop-color="#1366d6" stop-opacity=".05"/></linearGradient>
          <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#f4f8ff"/></linearGradient>
        </defs>
        <rect x="0" y="0" width="${w}" height="${h}" class="chart-bg"></rect>
        ${[0,1,2,3,4].map(i=>`<line x1="${pad}" y1="${pad+i*((h-pad*2)/4)}" x2="${w-pad}" y2="${pad+i*((h-pad*2)/4)}" stroke="#e6efff"/>`).join('')}
        ${labels.map((lb,i)=>`<text x="${x(i)}" y="${h-8}" text-anchor="middle" font-size="10" fill="#6b82a3">${lb}</text>`).join('')}
        <path d="${dArea}" fill="url(#fillGrad)"></path>
        <path d="${d}" fill="none" stroke="url(#lineGrad)" stroke-width="3" stroke-linecap="round"></path>
        ${series.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#0ea5a7" />`).join('')}
      </svg>`;
  }

  function renderChartFrom(data){
    const el = $("#chartReceita");
    if (!el) return;
    const doRender = () => renderChart(el, data.receita6m.values, data.receita6m.labels);
    window.addEventListener("resize", doRender);
    doRender();
  }

  function renderAssociadosCard(assoc){
    setText("#assocTotal", assoc.total.toLocaleString("pt-BR"));
    setText("#assocMetaLabel", assoc.meta.toLocaleString("pt-BR"));
    const pct = Math.min(100, Math.round((assoc.total/assoc.meta)*100));
    const bar = $("#assocBar"); if (bar){ bar.style.width = pct + "%"; bar.title = `Progresso: ${pct}%`; }
  }

  function findCardByTitle(title){
    const cards = $$(".cardx");
    for (const c of cards) {
      const label = $(".cardx-title span", c)?.textContent?.trim().toLowerCase() || "";
      if (label.includes(title.toLowerCase())) return c;
    }
    return null;
  }

  function renderVencimentos(list){
    const card = findCardByTitle("próximos vencimentos");
    const tbody = card ? $("table tbody", card) : $(".table tbody");
    if (!tbody) return;
    tbody.innerHTML = list.map(item => {
      const dt = new Date(item.vencimento);
      const d = dt.toLocaleDateString("pt-BR");
      const val = moneyBR(item.valor);
      const pillClass = { gerada: "warn", processando: "info", paga: "ok" }[item.status] || "info";
      const stCap = item.status.charAt(0).toUpperCase() + item.status.slice(1);
      return `<tr>
        <td>${item.nome}</td>
        <td>${item.plano}</td>
        <td>${d}</td>
        <td>${val}</td>
        <td><span class="pill ${pillClass}">${stCap}</span></td>
        <td class="text-end"><button class="btn btn-outline-primary btn-sm" data-view><i class="bi bi-eye"></i> Ver</button></td>
      </tr>`;
    }).join("");
  }

  function renderAtividades(list){
    const card = findCardByTitle("atividades recentes");
    const ul = card ? $(".list-clean", card) : null;
    if (!ul) return;
    ul.innerHTML = list.slice(0,4).map(a => {
      const when = new Date(a.when).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
      const badge = a.kind === "fatura" ? "info" : (a.kind === "evento" ? "ok" : "warn");
      return `<li><span>${a.msg}</span><span class="pill ${badge}">${when}</span></li>`;
    }).join("");
  }

  /* ========== Toast demo (Import/Backup) ========== */
  function initToasts(){
    const toastEl = $("#toastOK");
    if (!toastEl) return;
    const toast = window.bootstrap ? new bootstrap.Toast(toastEl, { delay: 2000 }) : null;
    const show = (msg) => {
      $("#toastOK .toast-body").textContent = msg;
      toast ? toast.show() : alert(msg);
    };
    $("#btnImport")?.addEventListener("click", (e)=>{ e.preventDefault(); show("Importação de CSV iniciada (demo)."); });
    $("#btnBackup")?.addEventListener("click", (e)=>{ e.preventDefault(); show("Backup agendado (demo)."); });
  }

  /* ========== Boot ========== */
  async function init(){
    const auth = requireAdmin(); if (!auth) return;

    initMenu(); initPing(); initLogout(); initToasts();

    try{
      const data = await loadDashboard(auth.token);

      const h1 = $(".hero-title") || $(".hero h1");
      if (h1) h1.insertAdjacentHTML("beforeend", ` <span class="text-muted small">• Olá, ${auth.session?.matricula || "admin"}</span>`);

      renderKpis(data.kpis);
      animateCounters();
      renderChartFrom(data);
      renderAssociadosCard(data.associados);
      renderVencimentos(data.vencimentos);
      renderAtividades(data.atividades);
    }catch(e){
      if (e.message !== "AUTH_REDIRECT") {
        alert("Falha ao carregar dashboard: " + (e.message || "erro"));
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
