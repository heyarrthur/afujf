// server/src/models/AdminUser.js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

// Modelo leve (strict:false) para editar documentos já existentes na coleção `users`,
// sem conflitar com o seu modelo User de autenticação.
const AdminUserSchema = new Schema(
  {}, // aceitamos os campos que já existem nos docs
  { strict: false, collection: "users", timestamps: true }
);

// Evita recompilar em hot-reload
export default mongoose.models.AdminUser || model("AdminUser", AdminUserSchema);

// enums/consts que usaremos no admin
export const UNIDADES = [
  "OPS","HUHB","NAU","EVB","SOS","Pleno","Oscar Vidal","Moinhos","Cidade Alta","Além Paraiba","Santos Dumont"
];
export const TIPOS_ACESSO = ["Efetivado","Estagiário","Aprendiz"];
export const SITUACOES    = ["ativo","inativo"];
export const MENS_TIPOS   = ["automatica","manual"];
export const BASE_AUTO    = Number(process.env.MENSALIDADE_BASE || 148.9);
