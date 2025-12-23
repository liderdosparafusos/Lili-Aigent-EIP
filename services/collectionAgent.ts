
import { ReceivableEntry, CollectionSuggestion } from "../types";

/**
 * Gera sugestão de mensagem baseada no perfil de atraso
 */
export function generateCollectionSuggestion(receivable: ReceivableEntry): CollectionSuggestion[] {
    const today = new Date();
    const dVenc = new Date(receivable.data_vencimento);
    const diffDays = Math.floor((today.getTime() - dVenc.getTime()) / (1000 * 3600 * 24));

    const suggestions: CollectionSuggestion[] = [];

    // --- WHATSAPP SUGGESTIONS ---
    let waMsg = "";
    if (diffDays === 0) {
        waMsg = `Olá! Lembramos que o título da NF ${receivable.numero_nf} vence hoje. Se já pagou, favor desconsiderar.`;
    } else if (diffDays <= 3) {
        waMsg = `Olá! Notamos um pequeno atraso no pagamento da NF ${receivable.numero_nf}. Podemos ajudar com a 2ª via do boleto?`;
    } else if (diffDays <= 15) {
        waMsg = `Prezado cliente, a NF ${receivable.numero_nf} está em atraso há ${diffDays} dias. Solicitamos a regularização para evitar bloqueios no cadastro.`;
    } else {
        waMsg = `URGENTE: NF ${receivable.numero_nf} vencida há mais de 15 dias. Por favor, entre em contato imediatamente com nosso financeiro para evitar protesto.`;
    }

    suggestions.push({
        canal: 'WHATSAPP',
        mensagem: waMsg,
        destinatario: receivable.cliente,
        contexto: `${diffDays} dias de atraso`
    });

    return suggestions;
}
