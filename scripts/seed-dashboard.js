// server/scripts/seed-dashboard.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Associado from "../src/models/Associado.js";
import Convenio from "../src/models/Convenio.js";
import Evento from "../src/models/Evento.js";
import Fatura from "../src/models/Fatura.js";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "afujf";

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function sampleName(i){
  const nomes = ["Ana","Bruno","Carla","Diego","Elaine","Fábio","Gabriela","Henrique","Inês","João","Karla","Luís","Marina","Nina","Otávio","Paula","Quico","Rafael","Sara","Tiago","Ursula","Victor","Wagner","Xuxa","Yasmin","Zeca"];
  const sobren = ["Silva","Souza","Oliveira","Pereira","Almeida","Santos","Rocha","Lima","Gomes","Moura"];
  return `${rand(nomes)} ${rand(sobren)} ${i}`;
}
function ymStr(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function addMonths(d, m){ const n = new Date(d); n.setMonth(n.getMonth()+m); return n; }

async function run(){
  if (!MONGODB_URI) throw new Error("Defina MONGODB_URI no .env");
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  console.log("MongoDB conectado");

  console.log("Limpando coleções…");
  await Promise.all([
    Associado.deleteMany({}),
    Convenio.deleteMany({}),
    Evento.deleteMany({}),
    Fatura.deleteMany({}),
  ]);

  console.log("Criando associados…");
  const associados = [];
  for (let i=1; i<=80; i++){
    associados.push({
      nome: sampleName(i),
      matricula: `10${String(2000+i).slice(-4)}-${String(7000+i).slice(-4)}`,
      email: `user${i}@afujf.org`,
      telefone: `32 9${Math.floor(9000+Math.random()*9999)}-${Math.floor(1000+Math.random()*8999)}`,
      plano: { nome: "Único" },
      status: "ativo",
      mensalidade: 148.9
    });
  }
  const associadosDocs = await Associado.insertMany(associados);

  console.log("Criando convênios…");
  await Convenio.insertMany([
    { nome: "Ótica Visão+", categoria: "Saúde", ativo: true },
    { nome: "Academia BoaForma", categoria: "Fitness", ativo: true },
    { nome: "Clínica Sorriso", categoria: "Odonto", ativo: true },
    { nome: "Supermercado MaisBarato", categoria: "Varejo", ativo: true },
    { nome: "Laboratório Vida", categoria: "Saúde", ativo: true },
    { nome: "Drogaria Popular", categoria: "Farmácia", ativo: true },
    { nome: "Livraria Saber", categoria: "Educação", ativo: false },
    { nome: "Restaurante Família", categoria: "Alimentação", ativo: true },
    { nome: "Posto Econômico", categoria: "Combustível", ativo: true },
    { nome: "Clínica OrtoMais", categoria: "Saúde", ativo: true },
  ]);

  console.log("Criando eventos…");
  const today = new Date();
  await Evento.insertMany([
    { titulo: "Corrida Solidária",  data: addMonths(today, 0),  local: "Parque Municipal" },
    { titulo: "Campanha de Doação", data: addMonths(today, 1),  local: "Sede AFUJF" },
    { titulo: "Palestra Saúde",     data: addMonths(today, 2),  local: "Auditório Central" },
    { titulo: "Feira de Benefícios", data: addMonths(today, -1), local: "Ginásio" },
    { titulo: "Oficina de Finanças", data: addMonths(today, -2), local: "Sala 3" },
  ]);

  console.log("Gerando faturas 6 meses…");
  const faturas = [];
  const inicio = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), -5);
  for (let m = 0; m < 6; m++){
    const mes = addMonths(inicio, m);
    const mesRef = ymStr(mes);
    for (const a of associadosDocs){
      const vencto = new Date(mes.getFullYear(), mes.getMonth(), 10);
      const status = Math.random() < 0.78 ? "paga" : (Math.random() < 0.5 ? "gerada" : "processando");
      faturas.push({
        associado: a._id,
        valor: a.mensalidade,
        vencimento: vencto,
        status,
        mesRef
      });
    }
  }
  await Fatura.insertMany(faturas);

  console.log("Seed concluída.");
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
