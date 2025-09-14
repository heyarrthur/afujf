// server/src/routes/adminDashboard.routes.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import Associado from "../models/Associado.js";
import Convenio from "../models/Convenio.js";
import Evento from "../models/Evento.js";
import Fatura from "../models/Fatura.js";

const router = Router();
const META_ASSOCIADOS = Number(process.env.META_ASSOCIADOS || 6000);

// helpers de data
function ymStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function addMonths(d, delta) {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + delta);
  return nd;
}
function monthLabelsPTShort(dateList) {
  const PT = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  return dateList.map(d => PT[d.getMonth()]);
}

router.get("/dashboard", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const start6m = addMonths(startOfMonth, -5); // inclui mês atual

    // KPIs
    const [associadosAtivos, conveniosAtivos, eventosFuturos, faturadoMes] = await Promise.all([
      Associado.countDocuments({ status: "ativo" }),
      Convenio.countDocuments({ ativo: true }),
      Evento.countDocuments({ data: { $gte: startOfToday } }),
      Fatura.aggregate([
        { $match: { status: "paga", vencimento: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$valor" } } },
        { $project: { _id: 0, total: 1 } },
      ]).then(r => r[0]?.total || 0),
    ]);

    // Receita últimos 6 meses (pagas por vencimento)
    const receitaAgg = await Fatura.aggregate([
      { $match: { status: "paga", vencimento: { $gte: start6m } } },
      {
        $group: {
          _id: { y: { $year: "$vencimento" }, m: { $month: "$vencimento" } },
          total: { $sum: "$valor" }
        }
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } }
    ]);

    const months = Array.from({ length: 6 }, (_, i) => addMonths(startOfMonth, i - 5));
    const receitaMap = new Map(
      receitaAgg.map(it => [`${it._id.y}-${String(it._id.m).padStart(2,"0")}`, it.total])
    );
    const receitaVals   = months.map(d => receitaMap.get(ymStr(d)) || 0);
    const receitaLabels = monthLabelsPTShort(months);

    // Próximos vencimentos (não pagos)
    const vencimentos = await Fatura.find({
      vencimento: { $gte: startOfToday },
      status: { $ne: "paga" }
    })
      .sort({ vencimento: 1 })
      .limit(7)
      .populate("associado", "nome plano.nome");

    // Atividades recentes
    const [recFats, recAss, recEvt, recConv] = await Promise.all([
      Fatura.find({}).sort({ updatedAt: -1 }).limit(4).populate("associado", "nome"),
      Associado.find({}).sort({ createdAt: -1 }).limit(3),
      Evento.find({}).sort({ createdAt: -1 }).limit(3),
      Convenio.find({}).sort({ createdAt: -1 }).limit(3),
    ]);

    const atividades = [
      ...recFats.map(f => ({
        when: f.updatedAt,
        kind: "fatura",
        msg: `Fatura ${f.mesRef} de ${f.associado?.nome || "associado"} ${f.status}.`
      })),
      ...recAss.map(a => ({ when: a.createdAt, kind: "associado", msg: `Associado ${a.nome} cadastrado.` })),
      ...recEvt.map(e => ({ when: e.createdAt, kind: "evento", msg: `Evento "${e.titulo}" criado.` })),
      ...recConv.map(c => ({ when: c.createdAt, kind: "convenio", msg: `Convênio "${c.nome}" ${c.ativo ? "ativo" : "inativo"}.` })),
    ]
      .sort((a,b) => new Date(b.when) - new Date(a.when))
      .slice(0, 10);

    res.json({
      kpis: {
        associados: associadosAtivos,
        convenios: conveniosAtivos,
        eventosFuturos,
        receitaMes: faturadoMes
      },
      receita6m: { labels: receitaLabels, values: receitaVals },
      associados: { total: associadosAtivos, meta: META_ASSOCIADOS },
      vencimentos: vencimentos.map(v => ({
        nome: v.associado?.nome || "Associado",
        plano: v.associado?.plano?.nome || "—",
        vencimento: v.vencimento,
        valor: v.valor,
        status: v.status
      })),
      atividades
    });
  } catch (err) {
    console.error("GET /api/admin/dashboard error:", err);
    res.status(500).json({ error: "Erro ao montar dashboard", details: err.message });
  }
});

export default router;
