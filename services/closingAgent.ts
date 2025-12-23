
import { getFechamento, registrarEventoFechamento } from "./closing";
import { loadReportFromStorage } from "./storage";
import { db } from "./firebase";
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Insight, NFData, DivergenceType, InsightSeverity } from "../types";

const INSIGHT_COLLECTION = "agentInsights";

// Helper: Generate deterministic ID based on Rule + Period
// This ensures we update the analysis instead of creating duplicate alerts for the same issue
const generateInsightId = (rule: string, period: string) => {
    return `INS_CLOSE_${rule}_${period}`;
};

const createClosingInsight = async (
    rule: string,
    severidade: 'INFO' | 'ATENCAO' | 'CRITICO', 
    titulo: string, 
    mensagem: string, 
    periodo: string,
    recomendacao?: string,
    contexto?: any
) => {
    const id = generateInsightId(rule, periodo);
    
    // Map internal severity to InsightSeverity
    const mappedPriority: InsightSeverity = severidade === 'INFO' ? 'Médio' : (severidade === 'ATENCAO' ? 'Alto' : 'Crítico');

    // Fixed mapping and added severidade to match updated Insight interface
    const insight: Insight = {
        id,
        tipo: 'FECHAMENTO',
        prioridade: mappedPriority,
        severidade:MappedMappedSeverity(severidade),
        dataGeracao: new Date().toISOString(),
        titulo,
        mensagem,
        descricao: mensagem,
        importancia: "Alerta gerado pelo Agente de Fechamento",
        sugestao: recomendacao || "Verificar pendências",
        recomendacao,
        contexto: { periodo, ...contexto },
        status: 'NOVO'
    };

    await setDoc(doc(db, INSIGHT_COLLECTION, id), insight, { merge: true });
};

// Helper to map severities
function MappedMappedSeverity(s: string): InsightSeverity {
    if (s === 'CRITICO') return 'CRITICO';
    if (s === 'ATENCAO') return 'ATENCAO';
    return 'INFO';
}

const clearClosingInsight = async (rule: string, period: string) => {
    const id = generateInsightId(rule, period);
    await deleteDoc(doc(db, INSIGHT_COLLECTION, id));
};

// --- ANALYSIS RULES ---

async function analyzeProcessState(periodo: string) {
    const fechamento = await getFechamento(periodo);
    const now = new Date();
    const lastUpdate = new Date(fechamento.metadata.atualizadoEm);
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));

    // Rule: Stalled Process
    if (fechamento.status === 'EM_ANDAMENTO' && daysSinceUpdate > 3) {
        await createClosingInsight(
            'PROCESS_STALL',
            'ATENCAO',
            'Fechamento Estagnado',
            `O processo não tem atualizações há ${daysSinceUpdate} dias.`,
            periodo,
            "Verificar pendências de importação ou divergências."
        );
    } else {
        await clearClosingInsight('PROCESS_STALL', periodo);
    }

    // Rule: Ready for Validation
    if (fechamento.etapas.comissaoCalculada && fechamento.etapas.divergenciasResolvidas && !fechamento.etapas.validado) {
        await createClosingInsight(
            'READY_VALIDATION',
            'INFO',
            'Aguardando Validação',
            `Cálculos concluídos. Aguardando validação gerencial.`,
            periodo,
            "Revisar números e clicar em 'Validar' no checklist."
        );
    } else {
        await clearClosingInsight('READY_VALIDATION', periodo);
    }
}

async function analyzeDivergences(periodo: string) {
    const report = await loadReportFromStorage(periodo);
    
    // If no report yet, skip data analysis
    if (!report || !report.registros) return;

    const divergences = report.registros.filter(r => r.status_divergencia === 'DIVERGENCIA');
    
    // Group by Type
    const counts: Record<DivergenceType | string, number> = {};
    let totalValue = 0;

    divergences.forEach(d => {
        const type = d.tipo_divergencia_padrao?.[0] || 'OUTROS';
        counts[type] = (counts[type] || 0) + 1;
        totalValue += d.valor;
    });

    // 1. Missing XML (Critical)
    if (counts['NF_PAGA_SEM_XML'] || counts['MOVIMENTO_COM_NF_SEM_XML']) {
        const count = (counts['NF_PAGA_SEM_XML'] || 0) + (counts['MOVIMENTO_COM_NF_SEM_XML'] || 0);
        await createClosingInsight(
            'MISSING_XML',
            'CRITICO',
            'Vendas Sem Nota Fiscal (XML)',
            `Existem ${count} registros de caixa sem XML correspondente. Risco fiscal e de quebra de caixa.`,
            periodo,
            "Solicitar XML ao setor fiscal ou verificar se foram canceladas.",
            { count }
        );
    } else {
        await clearClosingInsight('MISSING_XML', periodo);
    }

    // 2. Seller Divergence (Attention)
    if (counts['VENDEDOR_DIVERGENTE']) {
        await createClosingInsight(
            'SELLER_DIV',
            'ATENCAO',
            'Divergência de Vendedores',
            `${counts['VENDEDOR_DIVERGENTE']} notas possuem vendedores diferentes no Caixa e no XML. Afeta comissões.`,
            periodo,
            "Resolver divergências usando o painel lateral.",
            { count: counts['VENDEDOR_DIVERGENTE'] }
        );
    } else {
        await clearClosingInsight('SELLER_DIV', periodo);
    }

    // 3. Date Divergence (Info/Attention)
    if (counts['DATA_DIVERGENTE']) {
        await createClosingInsight(
            'DATE_DIV',
            'INFO',
            'Divergência de Datas',
            `${counts['DATA_DIVERGENTE']} registros com data de pagamento diferente da emissão. Pode afetar regime de caixa/competência.`,
            periodo,
            "Confirmar data correta para fechamento.",
            { count: counts['DATA_DIVERGENTE'] }
        );
    } else {
        await clearClosingInsight('DATE_DIV', periodo);
    }

    // 4. Returns without Reference (Critical for Commission)
    if (counts['DEVOLUCAO_SEM_REFERENCIA']) {
        await createClosingInsight(
            'RETURN_REF',
            'CRITICO',
            'Devoluções Órfãs',
            `${counts['DEVOLUCAO_SEM_REFERENCIA']} devoluções não foram vinculadas à venda original. O desconto de comissão pode estar incorreto.`,
            periodo,
            "Vincular manualmente ou aceitar como perda da loja.",
            { count: counts['DEVOLUCAO_SEM_REFERENCIA'] }
        );
    } else {
        await clearClosingInsight('RETURN_REF', periodo);
    }
}

// --- MAIN ENTRY POINT ---

export async function runClosingAgent(periodo: string): Promise<void> {
    console.log(`[Closing Agent] Analisando período ${periodo}...`);
    
    try {
        await Promise.all([
            analyzeProcessState(periodo),
            analyzeDivergences(periodo)
        ]);
        
    } catch (e) {
        console.error("Erro no Agente de Fechamento:", e);
    }
}
