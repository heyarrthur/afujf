(() => {
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);

  // Se já estiver logado, pula o login
  const tk = localStorage.getItem("token");
  if (tk) {
    try {
      const s = JSON.parse(localStorage.getItem("session") || "{}");
      const role = String(s.role || "").toLowerCase();
      if (role === "admin") window.location.replace("/admin/home.html");
      else window.location.replace("/public/dashboard.html");
    } catch { /* segue para login */ }
  }

  const form = $("#loginForm");
  const inpMat = $("#matricula");
  const inpPass = $("#senha");
  const btn = $("#btnEntrar");
  const errBox = $("#loginError");
  const status = $("#loginStatus");

  function showError(msg){
    if (errBox) { errBox.textContent = msg; errBox.classList.remove("d-none"); }
    else alert(msg);
  }
  function clearError(){ errBox?.classList.add("d-none"); }
  function setStatus(msg){ if(status) status.textContent = msg || ""; }

  async function doLogin(e){
    e.preventDefault();
    clearError(); setStatus("");

    const matricula = (inpMat?.value || "").trim();
    const senha     = (inpPass?.value || "").trim();
    if (!matricula || !senha) return showError("Informe matrícula e senha.");

    btn && (btn.disabled = true); setStatus("Entrando…");
    try{
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ matricula, senha })
      });

      const ct = r.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await r.json() : {};
      if (!r.ok) {
        showError(data?.error || "Credenciais inválidas");
        return;
      }

      // Guarda token + sessão
      localStorage.setItem("token", data.token);
      localStorage.setItem("session", JSON.stringify({ matricula: data.user?.matricula, role: data.user?.role }));

      // Redireciona pelo role
      const role = String(data.user?.role || "").toLowerCase();
      if (role === "admin") window.location.replace("/admin/home.html");
      else window.location.replace("/public/dashboard.html");
    } catch (err) {
      showError("Erro de rede ao logar.");
    } finally {
      btn && (btn.disabled = false);
      setStatus("");
    }
  }

  // Garante que o listener exista
  if (form) form.addEventListener("submit", doLogin);
  else console.error("[login] #loginForm não encontrado. Confirme o HTML.");
})();
