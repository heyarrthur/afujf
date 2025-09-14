// server/src/models/Convenio.js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ConvenioSchema = new Schema(
  {
    nome: { type: String, required: true },
    categoria: { type: String },
    ativo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default model("Convenio", ConvenioSchema);
