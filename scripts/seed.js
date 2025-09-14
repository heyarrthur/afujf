// server/scripts/seed-users.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../src/models/User.js";
import Associado from "../src/models/Associado.js";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "afujf";

async function run() {
  if (!MONGODB_URI) throw new Error("Defina MONGODB_URI no .env");
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  console.log("MongoDB conectado");

  // ADMIN padrão (se não existir)
  const ADMIN_MAT = process.env.ADMIN_MATRICULA || "9999999-9999";
  const ADMIN_PASS = process.env.ADMIN_SENHA || "admin123";

  const adminExists = await User.findOne({ matricula: ADMIN_MAT });
  if (!adminExists) {
    await User.createWithPassword({ matricula: ADMIN_MAT, senha: ADMIN_PASS, role: "admin" });
    console.log(`Admin criado: ${ADMIN_MAT} / ${ADMIN_PASS}`);
  } else {
    console.log("Admin já existe");
  }

  // Criar users para associados que ainda não têm
  const associados = await Associado.find({ status: "ativo" });
  let created = 0;
  for (const a of associados) {
    const exists = await User.findOne({ matricula: a.matricula });
    if (exists) continue;
    await User.createWithPassword({
      matricula: a.matricula,
      senha: "123456",
      role: "associado",
      associado: a._id,
    });
    created++;
  }
  console.log(`Usuários criados para associados: ${created}`);

  await mongoose.disconnect();
  console.log("OK");
}

run().catch((e) => { console.error(e); process.exit(1); });
