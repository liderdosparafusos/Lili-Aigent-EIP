
import { db, ensureAuth } from "./firebase";
import { collection, doc, setDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { AgentAction, AgentActionStatus, Insight } from "../types";
import { listarInsights } from "./agent";
import { registrarLogAuditoria } from "./audit";

const ACTION_COLLECTION = "agentActions";

/**
 * MOTOR DE DETECÇÃO DE AÇÕES (TRANSFORMA INSIGHTS EM AÇÕES ASSISTIDAS)
 */
export async function generateAssistedActions(): Promise<void> {
    await ensureAuth();
    
    // 1. Obtém alertas recentes do módulo Intelligence
    const insights = await listarInsights();
    const activeInsights = insights.filter(i => i.status === 'NOVO');

    for (const insight of activeInsights) {
        // Verifica se já existe uma ação para este alerta
        const q = query(collection(db, ACTION_COLLECTION), where("alertaOrigemId", "==", insight.id));
        const snap = await getDocs(q);
        if (!snap.empty) continue;

        // 2. Lógica de Transformação (Mapping Intelligence -> Execution)
        const action = mapInsightToAction(insight);
        if (action) {
            await setDoc(doc(db, ACTION_COLLECTION, action.id), action);
        }
    }
}

function mapInsightToAction(insight: Insight): AgentAction | null {
    const id = `ACT_${insight.id}`;
    const base = {
        id,
        alertaOrigemId: insight.id,
        status: 'SUGGESTED' as AgentActionStatus,
        prioridade: (insight.prioridade === 'Crítico' || insight.prioridade === 'CRITICO') ? 'HIGH' : 'MEDIUM' as any,
        audit: { suggestedAt: new Date().toISOString() }
    };

    // EXEMPLOS DE REGRAS DE TRANSFORMAÇÃO ASSISTIDA
    if (insight.titulo.includes("Estornos")) {
        return {
            ...base,
            tipo: 'COMERCIAL',
            titulo: "Auditoria de Estornos por Vendedor",
            acaoSugerida: "Gerar relatório analítico de devoluções com justificativas enviadas pelos vendedores.",
            impacto: "Identificação de falhas operacionais (produtos errados) ou erros de digitação, reduzindo quebra de caixa.",
            payload: { type: 'REPORT_ESTORNO', vendor: insight.titulo.split(':')[1]?.trim() }
        };
    }

    if (insight.tipo === 'Financeiro') {
        return {
            ...base,
            tipo: 'FINANCEIRO',
            titulo: "Intensificar Cobrança Preventiva",
            acaoSugerida: "Marcar clientes com títulos vencendo hoje como 'Críticos' na fila de prioridade do financeiro.",
            impacto: "Aumento da previsibilidade de caixa e redução da inadimplência no D+1.",
            payload: { type: 'SET_PRIORITY_COLLECTION' }
        };
    }

    if (insight.tipo === 'Operacional') {
        return {
            ...base,
            tipo: 'OPERACIONAL',
            titulo: "Revisão de Cadastros Incompletos",
            acaoSugerida: "Abrir tarefa interna para o setor administrativo revisar dados fiscais (NCM/CEST) dos itens citados.",
            impacto: "Prevenção de rejeições em futuras notas fiscais e conformidade com a SEFAZ.",
            payload: { type: 'FIX_MASTER_CATALOG' }
        };
    }

    return null;
}

/**
 * EXECUÇÃO ASSISTIDA (CONFIRMAÇÃO HUMANA)
 */
export async function confirmarAcaoAssistida(actionId: string, usuario: string): Promise<void> {
    await ensureAuth();
    const docRef = doc(db, ACTION_COLLECTION, actionId);
    
    await updateDoc(docRef, {
        status: 'EXECUTED',
        "audit.decidedBy": usuario,
        "audit.decidedAt": new Date().toISOString(),
        "audit.statusFinal": 'Confirmada'
    });

    await registrarLogAuditoria(
        usuario,
        'EXECUTION',
        'CONFIRM_ACTION',
        actionId,
        `Ação "${actionId}" confirmada e enviada para processamento.`
    );
}

export async function cancelarAcaoAssistida(actionId: string, usuario: string): Promise<void> {
    await ensureAuth();
    const docRef = doc(db, ACTION_COLLECTION, actionId);
    
    await updateDoc(docRef, {
        status: 'CANCELLED',
        "audit.decidedBy": usuario,
        "audit.decidedAt": new Date().toISOString(),
        "audit.statusFinal": 'Cancelada'
    });

    await registrarLogAuditoria(
        usuario,
        'EXECUTION',
        'REJECT_ACTION',
        actionId,
        `Ação "${actionId}" rejeitada pelo usuário.`
    );
}

export async function listarAcoesPendentes(): Promise<AgentAction[]> {
    await ensureAuth();
    const q = query(collection(db, ACTION_COLLECTION), where("status", "==", "SUGGESTED"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AgentAction);
}

// Fixed missing exports for CommercialAgentStep.tsx and AgentActionPanel.tsx
export const listarAgentActions = listarAcoesPendentes;

export async function executeAgentAction(action: AgentAction, user: string): Promise<void> {
    // In a real system, this would interact with external EIP services.
    // For this prototype, we simulate certain failures if not yet implemented.
    if (action.payload?.type === 'FIX_MASTER_CATALOG' || action.payload?.type === 'SET_PRIORITY_COLLECTION') {
        throw new Error('EIP_NOT_IMPLEMENTED');
    }
    
    await confirmarAcaoAssistida(action.id, user);
}
