// server/src/routes/auth.js
import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_TTL = process.env.JWT_TTL || "8h";

// Normaliza leitura do body para aceitar JSON e x-www-form-urlencoded
function getCreds(req) {
  const b = req.body || {};
  // aceita fallback de nomes
  const matricula = String(b.matricula ?? b.user ?? "").trim();
  const senha     = String(b.senha ?? b.password ?? "").trim();
  return { matricula, senha };
}

// POST /api/auth/login { matricula, senha }
router.post("/login", async (req, res) => {
  try {
    const { matricula, senha } = getCreds(req);
    if (!matricula || !senha) {
      return res.status(400).json({ error: "Matrícula e senha são obrigatórias" });
    }

    // precisa do +senhaHash porque o schema oculta por padrão
    const user = await User.findOne({ matricula, ativo: true }).select("+senhaHash");
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const ok = await user.validPassword(senha);
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

    const payload = {
      id: user._id.toString(),
      role: user.role,
      matricula: user.matricula,
      associadoId: user.associado || null,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TTL });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    // Em desenvolvimento, mande o detalhe para facilitar debug
    const details = process.env.NODE_ENV === "production" ? undefined : err.message;
    return res.status(500).json({ error: "Falha no login", details });
  }
});

// (opcional) Quem sou eu
router.get("/me", (req, res) => {
  res.status(501).json({ error: "Não implementado aqui. Use o middleware requireAuth na sua rota protegida." });
});

export default router;
