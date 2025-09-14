// server/src/models/Evento.js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

const EventoSchema = new Schema(
  {
    titulo: { type: String, required: true },
    data: { type: Date, required: true, index: true },
    local: { type: String },
    descricao: { type: String },
  },
  { timestamps: true }
);

export default model("Evento", EventoSchema);
