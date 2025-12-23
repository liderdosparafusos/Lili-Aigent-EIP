
import { db, ensureAuth } from "./firebase";
import { collection, doc, setDoc, getDocs, query, orderBy, updateDoc, limit, deleteDoc } from "firebase/firestore";
import { Insight, InsightSeverity, InsightType, RelatorioFinal } from "../types";
import { listarOrcamentos } from "./budgets";
import { listarClientes } from "./customers";
import { listSavedReports, loadReportFromStorage } from "./storage";
import { listarRecebiveis } from "./receivables";
import { listarComissoes } from "./commissions";
import { GoogleGenAI, Type } from "@google/genai";

const COLLECTION = "agentInsights";

/**
 * GERAÇÃO DE ALERTAS INTELIGENTES (PERSONA INTELLIGENCE)
 */
export async function generateAIIntelligenceAlerts(): Promise<void> {
    await ensureAuth();
    
    // 1. Coleta Contexto Rico de Múltiplas Fontes
    const [reportsMeta, budgets, clients, receivables, commissions] = await Promise.all([
        listSavedReports(),
        listarOrcamentos(),
        listarClientes(),
        listarRecebiveis(),
        listarComissoes()
    ]);
    
    const lastSalesReport = reportsMeta.find(r => r.type === 'SALES');
    const reportData = lastSalesReport ? await loadReportFromStorage(lastSalesReport.id) : null;

    // 2. Constrói o Snapshot de Dados para a IA
    const systemSnapshot = {
        vendas: reportData ? {
            periodo: lastSalesReport?.monthYear,
            totalFaturado: reportData.registros.filter(r => r.tipo === 'FATURADA').reduce((a, b) => a + b.valor, 0),
            totalAvista: reportData.registros.filter(r => r.tipo === 'PAGA_NO_DIA').reduce((a, b) => a + b.valor, 0),
            totalSemNota: reportData.vendas_sem_nf_lista.reduce((a, b) => a + b.valor, 0),
            devolucoes: reportData.registros.filter(r => r.valor < 0).length,
            vendedores: commissions.map(c => ({ nome: c.vendedor, total: c.baseCalculo }))
        } : "Sem dados",
        financeiro: {
            recebiveisVencidos: receivables.filter(r => r.status === 'VENCIDA').reduce((a, b) => a + b.saldo_aberto, 0),
            clientesComMultiplosAtrasos: 0 // Lógica simplificada para o prompt
        },
        operacional: {
            orcamentosPendentesAcima7Dias: budgets.filter(b => {
                const diff = (Date.now() - new Date(b.dataCriacao).getTime()) / (1000 * 60 * 60 * 24);
                return b.status === 'ENVIADO' && diff > 7;
            }).length,
            clientesBloqueados: clients.filter(c => c.bloqueado).length
        }
    };

    const systemInstruction = `
        Você é o módulo INTELLIGENCE – ALERTAS INTELIGENTES do sistema EIP.
        Sua função é analisar dados reais e identificar padrões, riscos e oportunidades.
        
        REGRAS:
        - Todo alerta deve ter: Título, Tipo (Financeiro, Fiscal, Comercial, Operacional), Prioridade (Baixo, Médio, Alto, Crítico), Descrição, Por que isso importa e Sugestão.
        - Seja preciso e objetivo.
        - Se os dados estiverem normais, retorne um array vazio [].

        FORMATO DE RESPOSTA (JSON ARRAY):
        [{
          "titulo": "string",
          "tipo": "Financeiro | Fiscal | Comercial | Operacional",
          "prioridade": "Baixo | Médio | Alto | Crítico",
          "descricao": "string",
          "importancia": "string",
          "sugestao": "string"
        }]
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analise o seguinte snapshot do sistema EIP e gere alertas se necessário: ${JSON.stringify(systemSnapshot)}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json"
            }
        });

        const rawAlerts = JSON.parse(response.text || "[]");
        
        // Limpa alertas "NOVO" antigos para não acumular lixo
        // (Opcional: dependendo da política de retenção)

        for (const alert of rawAlerts) {
            const id = `INTEL_${alert.tipo.toUpperCase()}_${alert.titulo.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`;
            // Fixed: severidade and prioridade mapping to match updated Insight interface
            const insight: Insight = {
                id,
                ...alert,
                severidade: alert.prioridade, // Keep consistency
                dataGeracao: new Date().toISOString(),
                status: 'NOVO'
            };
            await setDoc(doc(db, COLLECTION, id), insight, { merge: true });
        }
    } catch (e) {
        console.error("[Intelligence Agent] Erro neural:", e);
    }
}

export async function listarInsights(): Promise<Insight[]> {
    await ensureAuth();
    const q = query(collection(db, COLLECTION), orderBy("dataGeracao", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Insight);
}

export async function marcarInsightLido(id: string, novoStatus: 'LIDO' | 'ARQUIVADO'): Promise<void> {
    await ensureAuth();
    await updateDoc(doc(db, COLLECTION, id), { status: novoStatus });
}

export async function limparInsightsAntigos(): Promise<void> {
    await ensureAuth();
    const snap = await getDocs(collection(db, COLLECTION));
    for (const d of snap.docs) {
        await deleteDoc(d.ref);
    }
}

// Added for component compatibility
export async function runCommercialAgentAnalysis(): Promise<void> {
    await generateAIIntelligenceAlerts();
}
