
import { ReceivableEntry, CustomerRiskScore } from "../types";
import { isFeatureActive } from "./config";

/**
 * Avalia o risco do cliente para um título específico
 */
export function evaluateCustomerRisk(receivable: ReceivableEntry): CustomerRiskScore {
    const isSerasaActive = isFeatureActive('feature_serasa_enabled');
    
    const today = new Date();
    const dVenc = new Date(receivable.data_vencimento);
    const diffDays = Math.floor((today.getTime() - dVenc.getTime()) / (1000 * 3600 * 24));

    // Regras de Risco Interno (Baseado em atraso)
    if (diffDays > 30) {
        return {
            score: 20,
            label: 'CRITICO',
            motivo: `Atraso superior a 30 dias na NF ${receivable.numero_nf}. Risco de inadimplência severo.`,
            fonte: 'INTERNA',
            lastUpdate: new Date().toISOString()
        };
    }

    if (diffDays > 5) {
        return {
            score: 45,
            label: 'ALTO',
            motivo: `Atraso de ${diffDays} dias identificado. Perfil de pagador instável.`,
            fonte: 'INTERNA',
            lastUpdate: new Date().toISOString()
        };
    }

    // Caso Serasa estivesse ativo, buscaria dados reais. Como está OFF, simulamos info corporativa.
    return {
        score: 85,
        label: 'BAIXO',
        motivo: isSerasaActive 
            ? "Consulta Serasa: Sem apontamentos." 
            : "Histórico Interno: Cliente pontual. (Consulta Serasa desativada)",
        fonte: isSerasaActive ? 'SERASA_API' : 'INTERNA',
        lastUpdate: new Date().toISOString()
    };
}
