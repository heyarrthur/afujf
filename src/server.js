// server/src/server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { EventEmitter } from "events";

// Rotas
import authRoutes from "./routes/auth.js";
import adminDashboardRoutes from "./routes/adminDashboard.routes.js";
import associadosRoutes from "./routes/associados.routes.js";
import usersRoutes from "./routes/users.routes.js";              // (pode manter se já usa)
import adminUsersRoutes from "./routes/adminUsers.routes.js";    // <-- NOVA rota admin sobre a coleção `users`

dotenv.config();

// Aumenta limite de listeners do nodemon em dev (evita o warning do BUS)
if (process.env.NODE_ENV !== "production") {
  EventEmitter.defaultMaxListeners = 30;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, "../../front-end/public");

const app = express();
app.set("trust proxy", true);

// Segurança (CSP desativado pq usamos CDNs)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS (ajuste origin em produção)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// cookie-parser opcional
(async () => {
  try {
    const { default: cookieParser } = await import("cookie-parser");
    app.use(cookieParser());
  } catch {
    console.warn("cookie-parser não instalado — iniciando sem cookies");
  }
})();

// compression opcional
(async () => {
  try {
    const { default: compression } = await import("compression");
    app.use(compression());
  } catch {
    console.warn("compression não instalado — iniciando sem compressão");
  }
})();

// Front-end estático
app.use(express.static(PUBLIC_DIR));

// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ===== Rotas de API =====
app.use("/api/auth", authRoutes);                        // login / change-password / me
app.use("/api/admin", adminDashboardRoutes);             // /dashboard, /ping (admin)
app.use("/api/admin/associados", associadosRoutes);      // CRUD associados (admin)
app.use("/api/admin/users", adminUsersRoutes);           // <-- CRUD/edição sobre coleção afujf/users (admin)
app.use("/api/users", usersRoutes);                      // criar/listar users (seu fluxo anterior)

// 404 para rotas /api não mapeadas
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Handler de erro
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Erro interno", message: err.message });
});

// ===== Boot =====
const PORT = Number(process.env.PORT || 4001);
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "afujf";

async function start() {
  try {
    if (!MONGODB_URI) throw new Error("MONGODB_URI não definido no .env");

    mongoose.set("strictQuery", true);
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log("MongoDB conectado");

    app.listen(PORT, async () => {
      const url = `http://localhost:${PORT}/login.html`;
      console.log(`Servidor em ${url}`);

      // abre o login automaticamente (pule definindo AUTO_OPEN=0)
      if (process.env.AUTO_OPEN !== "0") {
        try {
          const mod = await import("open").catch(() => null);
          if (mod?.default) mod.default(url).catch(() => {});
        } catch {}
      }
    });
  } catch (err) {
    console.error("Falha ao iniciar:", err.message);
    process.exit(1);
  }
}

start();
