// server/src/routes/associados.routes.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import Associado, { UNIDADES, TIPOS_ACESSO, SITUACOES } from "../models/Associado.js";

const router = Router();
const BASE_AUTO = Number(process.env.MENSALIDADE_BASE || 148.9);

// todas exigem ADMIN
router.use(requireAuth, requireRole("admin"));

function parseSort(sortStr) {
  if (!sortStr) return { nome: 1 };
  const [field, dir] = String(sortStr).split(":");
  return { [field || "nome"]: (dir === "desc" ? -1 : 1) };
}

// GET /api/admin/associados?search=&status=&tipoAcesso=&unidade=&page=1&pageSize=10&sort=nome:asc
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "10", 10)));
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const tipoAcesso = String(req.query.tipoAcesso || "").trim();
    const unidade = String(req.query.unidade || "").trim();
    const sort = parseSort(req.query.sort);

    const filter = {};
    if (status) filter.status = status;
    if (tipoAcesso) filter.tipoAcesso = tipoAcesso;
    if (unidade) filter.unidade = unidade;

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ nome: rx }, { matricula: rx }, { email: rx }];
    }

    const [items, total] = await Promise.all([
      Associado.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize),
      Associado.countDocuments(filter),
    ]);

    res.json({ items, total, page, pageSize, meta: { UNIDADES, TIPOS_ACESSO, SITUACOES, BASE_AUTO } });
  } catch (err) {
    console.error("GET /associados error:", err);
    res.status(500).json({ error: "Falha ao listar associados", details: err.message });
  }
});

// GET /api/admin/associados/:id
router.get("/:id", async (req, res) => {
  const a = await Associado.findById(req.params.id);
  if (!a) return res.status(404).json({ error: "Associado não encontrado" });
  res.json(a);
});

// POST /api/admin/associados
// body: { nome, matricula, tipoAcesso, status, mensalidadeTipo, mensalidadeValor (se manual), unidade, email, telefone }
router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.nome || !b.matricula) return res.status(400).json({ error: "Informe nome e matrícula" });
    if (b.tipoAcesso && !TIPOS_ACESSO.includes(b.tipoAcesso)) return res.status(400).json({ error: "Tipo de acesso inválido" });
    if (b.status && !SITUACOES.includes(b.status)) return res.status(400).json({ error: "Situação inválida" });
    if (b.unidade && !UNIDADES.includes(b.unidade)) return res.status(400).json({ error: "Unidade inválida" });

    const exists = await Associado.findOne({ matricula: b.matricula });
    if (exists) return res.status(409).json({ error: "Já existe associado com esta matrícula" });

    const tipo = (b.mensalidadeTipo || "automatica").toLowerCase();
    const valor = (tipo === "manual") ? Number(b.mensalidadeValor || 0) : BASE_AUTO;
    if (tipo === "manual" && (!valor || valor <= 0)) return res.status(400).json({ error: "Informe o valor da mensalidade (manual)" });

    const novo = await Associado.create({
      nome: b.nome, matricula: b.matricula,
      tipoAcesso: b.tipoAcesso || "Efetivado",
      status: b.status || "ativo",
      mensalidade: { tipo, valor },
      unidade: b.unidade || "OPS",
      email: b.email || "", telefone: b.telefone || ""
    });

    res.status(201).json(novo);
  } catch (err) {
    console.error("POST /associados error:", err);
    if (String(err?.message || "").includes("E11000")) {
      return res.status(409).json({ error: "Matrícula já cadastrada" });
    }
    res.status(500).json({ error: "Falha ao criar associado", details: err.message });
  }
});

// PUT /api/admin/associados/:id  (mesmo shape do POST)
router.put("/:id", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.nome || !b.matricula) return res.status(400).json({ error: "Informe nome e matrícula" });
    if (b.tipoAcesso && !TIPOS_ACESSO.includes(b.tipoAcesso)) return res.status(400).json({ error: "Tipo de acesso inválido" });
    if (b.status && !SITUACOES.includes(b.status)) return res.status(400).json({ error: "Situação inválida" });
    if (b.unidade && !UNIDADES.includes(b.unidade)) return res.status(400).json({ error: "Unidade inválida" });

    const tipo = (b.mensalidadeTipo || "automatica").toLowerCase();
    const valor = (tipo === "manual") ? Number(b.mensalidadeValor || 0) : BASE_AUTO;
    if (tipo === "manual" && (!valor || valor <= 0)) return res.status(400).json({ error: "Informe o valor da mensalidade (manual)" });

    const up = await Associado.findByIdAndUpdate(
      req.params.id,
      {
        nome: b.nome, matricula: b.matricula,
        tipoAcesso: b.tipoAcesso || "Efetivado",
        status: b.status || "ativo",
        mensalidade: { tipo, valor },
        unidade: b.unidade || "OPS",
        email: b.email || "", telefone: b.telefone || ""
      },
      { new: true, runValidators: true }
    );
    if (!up) return res.status(404).json({ error: "Associado não encontrado" });
    res.json(up);
  } catch (err) {
    console.error("PUT /associados/:id error:", err);
    if (String(err?.message || "").includes("E11000")) {
      return res.status(409).json({ error: "Matrícula já cadastrada" });
    }
    res.status(500).json({ error: "Falha ao atualizar associado", details: err.message });
  }
});

// PATCH /api/admin/associados/:id/status { status: "ativo"|"inativo" }
router.patch("/:id/status", async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim();
    if (!SITUACOES.includes(status)) return res.status(400).json({ error: "Situação inválida" });
    const a = await Associado.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!a) return res.status(404).json({ error: "Associado não encontrado" });
    res.json({ ok: true, status: a.status });
  } catch (err) {
    console.error("PATCH /associados/:id/status error:", err);
    res.status(500).json({ error: "Falha ao atualizar situação", details: err.message });
  }
});

// DELETE /api/admin/associados/:id
router.delete("/:id", async (req, res) => {
  const r = await Associado.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ error: "Associado não encontrado" });
  res.json({ ok: true });
});

export default router;
