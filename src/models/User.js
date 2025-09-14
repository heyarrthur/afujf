// server/src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema, model, Types } = mongoose;

const UserSchema = new Schema(
  {
    matricula: { type: String, required: true, unique: true, index: true },
    senhaHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "associado"], required: true, index: true },
    associado: { type: Types.ObjectId, ref: "Associado" },
    ativo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

UserSchema.methods.setPassword = async function (senha) {
  this.senhaHash = await bcrypt.hash(senha, 10);
};
UserSchema.methods.validPassword = async function (senha) {
  return bcrypt.compare(senha, this.senhaHash);
};
UserSchema.statics.createWithPassword = async function ({ matricula, senha, role, associado }) {
  const u = new this({ matricula, role, associado });
  await u.setPassword(senha);
  return u.save();
};

export default model("User", UserSchema);
