// server/src/models/Fatura.js
import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;

const FaturaSchema = new Schema(
  {
    associado: { type: Types.ObjectId, ref: "Associado", required: true, index: true },
    valor: { type: Number, required: true },
    vencimento: { type: Date, required: true, index: true },
    status: { type: String, enum: ["gerada", "processando", "paga"], default: "gerada", index: true },
    mesRef: { type: String, required: true, index: true }, // YYYY-MM
  },
  { timestamps: true }
);

export default model("Fatura", FaturaSchema);
