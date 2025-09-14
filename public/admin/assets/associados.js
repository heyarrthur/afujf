// Admin • Associados (coleção afujf.users) — agora com CRIAR + EDITAR + REMOVER
(() => {
  "use strict";
  const API_BASE = "/api/admin/users";

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const BRL = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  const state = { page:1, pageSize:10, total:0, search:"", status:"", tipoAcesso:"", unidade:"", sort:"nome:asc", meta:null };
  let modal, toast;

  function token(){ const t = localStorage.getItem("token"); if(!t) location.replace("/login.html"); return t; }
  async function api(path, opt={}){
    const r = await fetch(path, { headers:{ "Accept":"application/json", "Content-Type":"application/json", "Authorization":"Bearer "+token() }, ...opt });
    const ct = r.headers.get("content-type")||""; let body=null; try{ body = ct.includes("application/json")? await r.json(): await r.text(); }catch{}
    if(!r.ok){ if(r.status===401||r.status===403) location.replace("/login.html"); throw new Error((body&&body.error)||"Erro"); }
    return body;
  }
  const qs = o => new URLSearchParams(o).toString();

  async function load(){
    const p = { page:state.page, pageSize:state.pageSize, search:state.search, status:state.status, tipoAcesso:state.tipoAcesso, unidade:state.unidade, sort:state.sort };
    const data = await api(`${API_BASE}?${qs(p)}`);
    state.total = data.total; if(!state.meta) state.meta = data.meta;
    ensureFilters();
    renderTable(data.items);
    renderPagination();
  }

  function ensureFilters(){
    const fTipo = $("#fTipo"), fUnid = $("#fUnidade");
    if (fTipo && !fTipo.dataset.ready && state.meta?.TIPOS_ACESSO) {
      fTipo.innerHTML = `<option value="">Todos tipos</option>` + state.meta.TIPOS_ACESSO.map(v=>`<option>${v}</option>`).join("");
      fTipo.dataset.ready = "1";
    }
    if (fUnid && !fUnid.dataset.ready && state.meta?.UNIDADES) {
      fUnid.innerHTML = `<option value="">Todas unidades</option>` + state.meta.UNIDADES.map(v=>`<option>${v}</option>`).join("");
      fUnid.dataset.ready = "1";
    }
  }

  function renderTable(items){
    const tbody = $("#rows"); if(!tbody) return;
    tbody.innerHTML = items.map(a=>{
      const st = a.status==="ativo" ? `<span class="status-badge status-ativo">Ativo</span>` : `<span class="status-badge status-inativo">Inativo</span>`;
      const mTipo  = a?.mensalidade?.tipo || "automatica";
      const mValor = mTipo==="manual" ? a?.mensalidade?.valor : (state.meta?.BASE_AUTO||0);
      const mStr = `${BRL(mValor)} ${mTipo==="manual"?"(Manual)":"(Auto)"}`;
      return `<tr>
        <td>${a.matricula||"—"}</td>
        <td>${a.nome||"—"}</td>
        <td>${a.tipoAcesso||"—"}</td>
        <td>${mStr}</td>
        <td>${a.unidade||"—"}</td>
        <td>${st}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-edit="${a._id}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger" data-del="${a._id}"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  function renderPagination(){
    const totalPages = Math.max(1, Math.ceil(state.total/state.pageSize));
    $("#total").textContent = state.total;
    $("#pageInfo").textContent = `${state.page} / ${totalPages}`;
    $("#prev").disabled = state.page<=1;
    $("#next").disabled = state.page>=totalPages;
  }

  function debounce(fn,ms=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
  function bindUI(){
    // menu + logout
    const launcher=$("#af-launcher"), offEl=$("#menuAFUJF");
    if (launcher && offEl && window.bootstrap) {
      const off = bootstrap.Offcanvas.getOrCreateInstance(offEl,{backdrop:true,scroll:true});
      launcher.addEventListener("click",(e)=>{e.preventDefault();off.toggle();});
      offEl.addEventListener("show.bs.offcanvas", ()=>launcher.classList.add("hidden"));
      offEl.addEventListener("hidden.bs.offcanvas",()=>launcher.classList.remove("hidden"));
      $$(".menu-link",offEl).forEach(a=>a.addEventListener("click",()=>off.hide()));
    }
    $("#btnLogout")?.addEventListener("click",()=>{ localStorage.removeItem("token"); localStorage.removeItem("session"); location.replace("/login.html"); });

    // filtros/busca/paginação
    $("#q")?.addEventListener("input", debounce(e=>{ state.search=e.target.value.trim(); state.page=1; load().catch(alertErr); }, 350));
    $("#fStatus")?.addEventListener("change", e=>{ state.status=e.target.value; state.page=1; load().catch(alertErr); });
    $("#fTipo")?.addEventListener("change", e=>{ state.tipoAcesso=e.target.value; state.page=1; load().catch(alertErr); });
    $("#fUnidade")?.addEventListener("change", e=>{ state.unidade=e.target.value; state.page=1; load().catch(alertErr); });
    $("#pageSize")?.addEventListener("change", e=>{ state.pageSize=Number(e.target.value||10); state.page=1; load().catch(alertErr); });
    $("#prev")?.addEventListener("click", ()=>{ if(state.page>1){ state.page--; load().catch(alertErr);} });
    $("#next")?.addEventListener("click", ()=>{ state.page++; load().catch(alertErr); });

    $$(".table thead th").forEach(th=>{
      th.addEventListener("click", ()=>{
        const f = th.getAttribute("data-sort"); if(!f) return;
        const [cf,cd] = state.sort.split(":");
        state.sort = `${f}:${(cf===f && cd==="asc")?"desc":"asc"}`;
        state.page=1; load().catch(alertErr);
      });
    });

    // linhas
    $("#rows")?.addEventListener("click", onRowClick);

    // modal
    modal = new bootstrap.Modal($("#modalAssoc"));
    $("#mensTipo")?.addEventListener("change", onMensTipoChange);
    $("#btnNovo")?.addEventListener("click", ()=> openModal());
    $("#formAssoc")?.addEventListener("submit", saveAssoc);

    toast = new bootstrap.Toast($("#toastOK"), { delay: 1600 });
  }

  function onMensTipoChange(){
    const sel=$("#mensTipo"), v=$("#mensValor");
    if (sel.value==="manual"){ v.disabled=false; v.required=true; v.focus(); }
    else { v.disabled=true; v.required=false; v.value=""; }
  }

  function onRowClick(e){
    const bE = e.target.closest("[data-edit]");
    const bD = e.target.closest("[data-del]");
    if (bE) return editAssoc(bE.getAttribute("data-edit"));
    if (bD) return delAssoc(bD.getAttribute("data-del"));
  }

  async function editAssoc(id){
    try{ const u = await api(`${API_BASE}/${id}`); openModal(u); }
    catch(err){ alertErr(err); }
  }
  async function delAssoc(id){
    if(!confirm("Remover este registro?")) return;
    try{ await api(`${API_BASE}/${id}`, { method:"DELETE" }); showToast("Removido."); load().catch(alertErr); }
    catch(err){ alertErr(err); }
  }

  function openModal(u=null){
    $("#formErr")?.classList.add("d-none");
    if (state.meta){
      if ($("#tipoAcesso").children.length===0) $("#tipoAcesso").innerHTML = state.meta.TIPOS_ACESSO.map(v=>`<option>${v}</option>`).join("");
      if ($("#unidade").children.length===0)    $("#unidade").innerHTML    = state.meta.UNIDADES.map(v=>`<option>${v}</option>`).join("");
    }
    $(".modal-title").textContent = u ? "Editar associado" : "Novo associado";
    $("#assocId").value      = u?._id || "";
    $("#nome").value         = u?.nome || "";
    $("#matricula").value    = u?.matricula || "";
    $("#tipoAcesso").value   = u?.tipoAcesso || "Efetivado";
    $("#status").value       = u?.status || "ativo";
    $("#mensTipo").value     = u?.mensalidade?.tipo || "automatica";
    $("#mensValor").value    = (u?.mensalidade?.tipo==="manual") ? (u?.mensalidade?.valor ?? "") : "";
    $("#unidade").value      = u?.unidade || (state.meta?.UNIDADES?.[0] || "OPS");
    $("#email").value        = u?.email || "";
    $("#telefone").value     = u?.telefone || "";
    onMensTipoChange();
    modal.show();
  }

  async function saveAssoc(e){
    e.preventDefault();
    const id = $("#assocId").value || null;
    const body = {
      nome: $("#nome").value.trim(),
      matricula: $("#matricula").value.trim(),
      tipoAcesso: $("#tipoAcesso").value,
      status: $("#status").value,
      mensalidadeTipo: $("#mensTipo").value,
      mensalidadeValor: Number($("#mensValor").value || 0),
      unidade: $("#unidade").value,
      email: $("#email").value.trim(),
      telefone: $("#telefone").value.trim(),
    };
    try{
      if (!body.nome || !body.matricula) throw new Error("Informe nome e matrícula");
      if(body.mensalidadeTipo==="manual" && (!body.mensalidadeValor || body.mensalidadeValor<=0)){
        throw new Error("Informe o valor da mensalidade (Manual).");
      }

      if(id){
        await api(`${API_BASE}/${id}`, { method:"PATCH", body: JSON.stringify(body) });
        showToast("Atualizado.");
      }else{
        await api(`${API_BASE}`, { method:"POST", body: JSON.stringify(body) });
        showToast("Criado.");
      }
      modal.hide();
      load().catch(alertErr);
    }catch(err){
      const box = $("#formErr"); if(box){ box.textContent = err.message || "Erro"; box.classList.remove("d-none"); } else alertErr(err);
    }
  }

  function showToast(msg){ $("#toastOK .toast-body").textContent = msg; toast?.show(); }
  function alertErr(err){ if(err?.message!=="AUTH") alert(err?.message || "Erro"); }

  async function init(){ if(!token()) return; bindUI(); load().catch(alertErr); }
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
