
import { db, ensureAuth } from "./firebase";
import { collection, doc, setDoc, getDocs, query, where, deleteDoc, orderBy } from "firebase/firestore";
import { Insight, InsightSeverity, InsightType, ReceivableEntry } from "../types";
import { listarRecebiveis } from "./receivables";

const COLLECTION = "agentInsights";

const generateInsightId = (rule: string, ref: string) => {
    const today = new Date().toISOString().split('T')[0];
    return `FIN_${rule}_${ref}_${today}`;
};

// Fixed createInsight to match updated Insight interface
const createInsight = async (
    tipo: InsightType, 
    severidade: InsightSeverity, 
    titulo: string, 
    mensagem: string, 
    contexto: any,
    recomendacao?: string
) => {
    const id = generateInsightId(tipo, contexto.refId || "GERAL");
    
    const insight: Insight = {
        id,
        tipo,
        prioridade: severidade, // Consistency with IntelligenceAlerts
        severidade, // Consistency with CommercialAgent/FinancialAgent
        dataGeracao: new Date().toISOString(),
        titulo,
        mensagem,
        descricao: mensagem, // Compliance with Insight type
        importancia: "Identificado pelo monitoramento automático",
        sugestao: recomendacao || "Verificar pendência",
        recomendacao,
        contexto,
        status: 'NOVO'
    };

    await setDoc(doc(db, COLLECTION, id), insight, { merge: true });
};

// --- NOVA INTELIGÊNCIA DE CENTRAL ---

export interface ReceivablesIntelligenceData {
    healthScore: number;
    riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
    liquidityForecast7d: number;
    topRiskClients: { cliente: string; saldo: number; percentual: number; risco: string }[];
    priorityQueue: Insight[];
}

export async function getReceivablesIntelligence(): Promise<ReceivablesIntelligenceData> {
    await ensureAuth();
    const entries = await listarRecebiveis();
    const insights = await listarInsightsFinanceiros();
    
    const totalAberto = entries.reduce((acc, e) => acc + (e.status !== 'PAGA' ? e.saldo_aberto : 0), 0);
    const totalVencido = entries.reduce((acc, e) => acc + (e.status === 'VENCIDA' ? e.saldo_aberto : 0), 0);
    
    // Health Score: Baseado em Inadimplência
    const defaultRate = totalAberto > 0 ? (totalVencido / totalAberto) : 0;
    let score = 100 - (defaultRate * 100 * 1.5); // Peso maior para inadimplência
    score = Math.max(0, Math.min(100, score));

    // Liquidez 7d: Vencendo em 7 dias - Atraso Histórico (Simulado 5%)
    const todayStr = new Date().toISOString().split('T')[0];
    const next7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const vencendo7d = entries.filter(e => e.data_vencimento >= todayStr && e.data_vencimento <= next7DaysStr).reduce((acc, e) => acc + e.saldo_aberto, 0);
    const liquidityForecast = vencendo7d * 0.95; // 5% de quebra esperada

    // Top Clientes por Concentração
    const porCliente: Record<string, number> = {};
    entries.forEach(e => { if(e.status !== 'PAGA') porCliente[e.cliente] = (porCliente[e.cliente] || 0) + e.saldo_aberto; });
    const topRiskClients = Object.entries(porCliente)
        .map(([cliente, saldo]) => ({
            cliente,
            saldo,
            percentual: (saldo / totalAberto) * 100,
            risco: (saldo / totalAberto) * 100 > 20 ? 'ALTO' : 'NORMAL'
        }))
        .sort((a,b) => b.saldo - a.saldo)
        .slice(0, 5);

    return {
        healthScore: Math.round(score),
        riskLevel: score > 80 ? 'BAIXO' : score > 60 ? 'MEDIO' : score > 40 ? 'ALTO' : 'CRITICO',
        liquidityForecast7d: liquidityForecast,
        topRiskClients,
        priorityQueue: insights.slice(0, 10)
    };
}

async function listarInsightsFinanceiros(): Promise<Insight[]> {
    const q = query(collection(db, COLLECTION), orderBy("dataGeracao", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Insight).filter(i => i.tipo === 'Financeiro' || i.tipo === 'FECHAMENTO');
}

// --- ANALISE DE PRIORIDADES E RISCOS ---

async function analisarPrioridadesDoDia(entries: ReceivableEntry[]) {
    const today = new Date().toISOString().split('T')[0];
    const vencendoHoje = entries.filter(e => e.data_vencimento === today && e.status !== 'PAGA' && e.status !== 'CANCELADA');
    
    for (const nf of vencendoHoje) {
        // Fixed InsightSeverity mapping
        await createInsight(
            'Financeiro',
            nf.valor_original > 5000 ? 'CRITICO' : 'ATENCAO',
            `📌 Prioridade: Vencimento Hoje - NF ${nf.numero_nf}`,
            `O título do cliente ${nf.cliente} no valor de ${fmt(nf.saldo_aberto)} vence hoje.`,
            { refId: nf.id, valorEnvolvido: nf.saldo_aberto, tipoAlerta: 'VENCIMENTO_HOJE' },
            "Confirmar recebimento do boleto pelo cliente e monitorar fluxo de caixa."
        );
    }
}

async function analisarRiscosDebito(entries: ReceivableEntry[]) {
    const today = new Date();
    const atrasadas = entries.filter(e => e.status === 'VENCIDA' || (e.status === 'PARCIAL' && e.saldo_aberto > 0 && e.data_vencimento < today.toISOString().split('T')[0]));
    const porCliente: Record<string, { total: number, count: number, maxDays: number, nfs: string[] }> = {};

    atrasadas.forEach(nf => {
        const diff = Math.floor((today.getTime() - new Date(nf.data_vencimento).getTime()) / (1000 * 3600 * 24));
        if (!porCliente[nf.cliente]) porCliente[nf.cliente] = { total: 0, count: 0, maxDays: 0, nfs: [] };
        porCliente[nf.cliente].total += nf.saldo_aberto;
        porCliente[nf.cliente].count++;
        porCliente[nf.cliente].nfs.push(nf.numero_nf);
        if (diff > porCliente[nf.cliente].maxDays) porCliente[nf.cliente].maxDays = diff;
    });

    for (const [cliente, data] of Object.entries(porCliente)) {
        if (data.count >= 2) {
            // Fixed InsightSeverity mapping
            await createInsight(
                'Financeiro',
                'CRITICO',
                `⚠️ Risco: Múltiplas notas vencidas`,
                `${cliente} possui ${data.count} títulos vencidos, totalizando ${fmt(data.total)}.`,
                { refId: `MULT_${cliente}`, valorEnvolvido: data.total, count: data.count, nfs: data.nfs },
                "Suspender crédito temporariamente e iniciar renegociação."
            );
        }
    }
}

async function analisarConcentracaoEIP(entries: ReceivableEntry[]) {
    const abertas = entries.filter(e => e.status !== 'PAGA' && e.status !== 'CANCELADA');
    const totalCarteira = abertas.reduce((acc, e) => acc + e.saldo_aberto, 0);
    const porCliente: Record<string, number> = {};
    abertas.forEach(e => { porCliente[e.cliente] = (porCliente[e.cliente] || 0) + e.saldo_aberto; });

    for (const [cliente, saldo] of Object.entries(porCliente)) {
        const share = (saldo / totalCarteira) * 100;
        if (share > 20 && totalCarteira > 30000) {
            // Fixed InsightSeverity mapping
            await createInsight(
                'Financeiro',
                'ATENCAO',
                '🛡️ Concentração de Risco',
                `O cliente ${cliente} detém ${share.toFixed(1)}% do seu saldo a receber (${fmt(saldo)}).`,
                { refId: `CONC_${cliente}`, valorEnvolvido: saldo, percentual: share },
                "Monitorar periodicamente a saúde fiscal deste cliente."
            );
        }
    }
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export async function getReceivablesAgentContext() {
    const entries = await listarRecebiveis();
    const today = new Date().toISOString().split('T')[0];
    return {
        today,
        totalAberto: entries.filter(e => e.status !== 'PAGA').reduce((acc, e) => acc + e.saldo_aberto, 0),
        vencendoHoje: entries.filter(e => e.data_vencimento === today && e.status !== 'PAGA'),
        vencidos: entries.filter(e => e.status === 'VENCIDA').sort((a,b) => a.data_vencimento.localeCompare(b.data_vencimento)),
    };
}

export async function runFinancialAgentAnalysis(): Promise<void> {
    await ensureAuth();
    const entries = await listarRecebiveis();
    await Promise.all([
        analisarPrioridadesDoDia(entries),
        analisarRiscosDebito(entries),
        analisarConcentracaoEIP(entries)
    ]);
}
