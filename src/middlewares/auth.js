// server/src/middlewares/auth.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Lê token do Authorization: Bearer <token>, x-access-token ou cookie "token"
export function requireAuth(req, res, next) {
  try {
    let token = null;
    const hdr = req.headers.authorization || "";
    if (hdr.startsWith("Bearer ")) token = hdr.slice(7);
    if (!token && req.headers["x-access-token"]) token = req.headers["x-access-token"];
    if (!token && req.cookies?.token) token = req.cookies.token;

    if (!token) return res.status(401).json({ error: "Token ausente" });

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, matricula, ... }
    next();
  } catch {
    return res.status(401).json({ error: "Não autorizado" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    const userRole = String(req.user?.role || "").toLowerCase();
    if (userRole !== String(role).toLowerCase()) {
      return res.status(403).json({ error: "Permissão insuficiente" });
    }
    next();
  };
}
