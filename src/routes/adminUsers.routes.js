// server/src/routes/adminUsers.routes.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import AdminUser, {
  UNIDADES, TIPOS_ACESSO, SITUACOES, MENS_TIPOS, BASE_AUTO
} from "../models/AdminUser.js";

const router = Router();

// exige ADMIN em todas
router.use(requireAuth, requireRole("admin"));

function parseSort(sortStr){
  if(!sortStr) return { nome: 1 };
  const [f, d] = String(sortStr).split(":");
  return { [f || "nome"]: (d === "desc" ? -1 : 1) };
}

function scrub(doc){
  if (!doc) return doc;
  const d = doc.toObject ? doc.toObject() : { ...doc };
  ["senha","password","hash","salt","passwordHash","senhaHash"].forEach(k => { if (k in d) delete d[k]; });
  return d;
}

// GET /api/admin/users
router.get("/", async (req, res) => {
  try{
    const page = Math.max(1, parseInt(req.query.page||"1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize||"10", 10)));
    const search = String(req.query.search||"").trim();
    const status = String(req.query.status||"").trim();
    const tipoAcesso = String(req.query.tipoAcesso||"").trim();
    const unidade = String(req.query.unidade||"").trim();
    const sort = parseSort(req.query.sort);

    const filter = {};
    if (status)     filter.status = status;
    if (tipoAcesso) filter.tipoAcesso = tipoAcesso;
    if (unidade)    filter.unidade = unidade;
    if (search){
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "i");
      filter.$or = [{ nome: rx }, { matricula: rx }, { email: rx }];
    }

    const [items, total] = await Promise.all([
      AdminUser.find(filter).sort(sort).skip((page-1)*pageSize).limit(pageSize),
      AdminUser.countDocuments(filter)
    ]);

    res.json({
      items: items.map(scrub),
      total, page, pageSize,
      meta: { UNIDADES, TIPOS_ACESSO, SITUACOES, MENS_TIPOS, BASE_AUTO }
    });
  }catch(err){
    console.error("GET /admin/users error:", err);
    res.status(500).json({ error: "Falha ao listar usuários", details: err.message });
  }
});

// GET /api/admin/users/:id
router.get("/:id", async (req, res) => {
  const u = await AdminUser.findById(req.params.id);
  if (!u) return res.status(404).json({ error:"Usuário não encontrado" });
  res.json(scrub(u));
});

// POST /api/admin/users  (criar novo associado na coleção `users`)
router.post("/", async (req, res) => {
  try{
    const b = req.body || {};
    if (!b.nome || !b.matricula) return res.status(400).json({ error:"Informe nome e matrícula" });

    if (b.tipoAcesso && !TIPOS_ACESSO.includes(b.tipoAcesso)) return res.status(400).json({ error:"Tipo de acesso inválido" });
    if (b.status && !SITUACOES.includes(b.status)) return res.status(400).json({ error:"Situação inválida" });
    if (b.unidade && !UNIDADES.includes(b.unidade)) return res.status(400).json({ error:"Unidade inválida" });

    const exists = await AdminUser.findOne({ matricula: b.matricula });
    if (exists) return res.status(409).json({ error:"Já existe registro com esta matrícula" });

    const mTipo  = (b.mensalidadeTipo || b?.mensalidade?.tipo || "automatica").toLowerCase();
    if (!MENS_TIPOS.includes(mTipo)) return res.status(400).json({ error:"Tipo de mensalidade inválido" });

    const mValor = (mTipo === "manual") ? Number(b.mensalidadeValor || b?.mensalidade?.valor || 0) : BASE_AUTO;
    if (mTipo === "manual" && (!mValor || mValor <= 0)) return res.status(400).json({ error:"Informe o valor da mensalidade (Manual)" });

    const doc = await AdminUser.create({
      nome: String(b.nome).trim(),
      matricula: String(b.matricula).trim(),
      tipoAcesso: b.tipoAcesso || "Efetivado",
      status: b.status || "ativo",
      unidade: b.unidade || "OPS",
      email: b.email || "",
      telefone: b.telefone || "",
      role: b.role || "associado",           // útil pra diferenciar no painel
      mensalidade: { tipo: mTipo, valor: mValor },
    });

    res.status(201).json(scrub(doc));
  }catch(err){
    console.error("POST /admin/users error:", err);
    res.status(500).json({ error:"Falha ao criar registro", details: err.message });
  }
});

// PATCH /api/admin/users/:id  (editar)
router.patch("/:id", async (req, res) => {
  try{
    const b = req.body || {};
    if (b.status && !SITUACOES.includes(b.status)) return res.status(400).json({ error:"Situação inválida" });
    if (b.tipoAcesso && !TIPOS_ACESSO.includes(b.tipoAcesso)) return res.status(400).json({ error:"Tipo de acesso inválido" });
    if (b.unidade && !UNIDADES.includes(b.unidade)) return res.status(400).json({ error:"Unidade inválida" });

    const set = {};
    if (b.nome       != null) set.nome       = String(b.nome).trim();
    if (b.matricula  != null) set.matricula  = String(b.matricula).trim();
    if (b.email      != null) set.email      = String(b.email).trim();
    if (b.telefone   != null) set.telefone   = String(b.telefone).trim();
    if (b.tipoAcesso != null) set.tipoAcesso = b.tipoAcesso;
    if (b.status     != null) set.status     = b.status;
    if (b.unidade    != null) set.unidade    = b.unidade;
    if (b.role       != null) set.role       = b.role;

    const mTipo  = (b.mensalidadeTipo || b?.mensalidade?.tipo || "").toLowerCase();
    const mValor = (b.mensalidadeValor ?? b?.mensalidade?.valor);
    if (mTipo){
      if (!MENS_TIPOS.includes(mTipo)) return res.status(400).json({ error:"Tipo de mensalidade inválido" });
      set["mensalidade.tipo"]  = mTipo;
      set["mensalidade.valor"] = (mTipo === "manual") ? Number(mValor || 0) : BASE_AUTO;
      if (mTipo === "manual" && (!set["mensalidade.valor"] || set["mensalidade.valor"] <= 0)) {
        return res.status(400).json({ error:"Informe o valor da mensalidade (Manual)" });
      }
    }

    // atenção: se mudar matrícula, valide duplicidade
    if (set.matricula){
      const dup = await AdminUser.findOne({ _id: { $ne: req.params.id }, matricula: set.matricula });
      if (dup) return res.status(409).json({ error:"Já existe registro com esta matrícula" });
    }

    const up = await AdminUser.findByIdAndUpdate(req.params.id, { $set: set }, { new:true });
    if (!up) return res.status(404).json({ error:"Usuário não encontrado" });
    res.json(scrub(up));
  }catch(err){
    console.error("PATCH /admin/users/:id error:", err);
    res.status(500).json({ error:"Falha ao atualizar usuário", details: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete("/:id", async (req, res) => {
  const r = await AdminUser.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ error:"Usuário não encontrado" });
  res.json({ ok:true });
});

export default router;
