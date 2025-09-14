// server/src/models/Associado.js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

export const UNIDADES = [
  "OPS","HUHB","NAU","EVB","SOS","Pleno","Oscar Vidal","Moinhos","Cidade Alta","Além Paraiba","Santos Dumont"
];
export const TIPOS_ACESSO = ["Efetivado","Estagiário","Aprendiz"];
export const SITUACOES = ["ativo","inativo"]; // Situação
export const MENS_TIPOS = ["automatica","manual"];

const BASE_AUTO = Number(process.env.MENSALIDADE_BASE || 148.9);

const AssociadoSchema = new Schema(
  {
    nome:       { type: String, required: true, trim: true },
    matricula:  { type: String, required: true, unique: true, index: true, trim: true },

    tipoAcesso: { type: String, enum: TIPOS_ACESSO, default: "Efetivado", index: true },
    status:     { type: String, enum: SITUACOES, default: "ativo", index: true }, // Situação

    mensalidade: {
      tipo:  { type: String, enum: MENS_TIPOS, default: "automatica" },
      valor: { type: Number, default: BASE_AUTO } // se "automatica", usamos BASE_AUTO nas rotas
    },

    unidade:    { type: String, enum: UNIDADES, default: "OPS", index: true },

    email:      { type: String, trim: true },
    telefone:   { type: String, trim: true },
  },
  { timestamps: true }
);

// Compatibilidade (se algo no front antigo ainda ler "mensalidade" número)
AssociadoSchema.virtual("mensalidadeValor").get(function () {
  return this.mensalidade?.valor ?? BASE_AUTO;
});

export default model("Associado", AssociadoSchema);
