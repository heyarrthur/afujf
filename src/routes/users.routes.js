// server/src/routes/users.routes.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import User from "../models/User.js";
import Associado from "../models/Associado.js";

const router = Router();

// POST /api/users  (ADMIN) body: { matricula, senha, role, associadoId? }
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { matricula, senha, role, associadoId } = req.body || {};
    if (!matricula || !senha || !role) return res.status(400).json({ error: "Informe matricula, senha e role" });

    const exists = await User.findOne({ matricula });
    if (exists) return res.status(409).json({ error: "Usuário já existe para esta matrícula" });

    let associado = null;
    if (associadoId) {
      associado = await Associado.findById(associadoId);
      if (!associado) return res.status(404).json({ error: "Associado não encontrado" });
    }

    const user = await User.createWithPassword({ matricula, senha, role, associado: associado?._id });
    res.status(201).json({ id: user._id, matricula: user.matricula, role: user.role, associado: user.associado });
  } catch (err) {
    console.error("POST /users error:", err);
    res.status(500).json({ error: "Falha ao criar usuário" });
  }
});

// POST /api/users/from-associado/:id  (ADMIN) cria user para um associado
router.post("/from-associado/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const assoc = await Associado.findById(req.params.id);
    if (!assoc) return res.status(404).json({ error: "Associado não encontrado" });

    const exists = await User.findOne({ matricula: assoc.matricula });
    if (exists) return res.status(409).json({ error: "Usuário já existe para este associado" });

    const senha = req.body?.senha || "123456";
    const user = await User.createWithPassword({
      matricula: assoc.matricula,
      senha,
      role: "associado",
      associado: assoc._id,
    });

    res.status(201).json({ id: user._id, matricula: user.matricula, role: user.role, associado: user.associado });
  } catch (err) {
    console.error("POST /users/from-associado error:", err);
    res.status(500).json({ error: "Falha ao criar usuário para associado" });
  }
});

// GET /api/users  (ADMIN) — listagem básica
router.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  const list = await User.find({}).select("-senhaHash").populate("associado", "nome matricula");
  res.json(list);
});

export default router;
