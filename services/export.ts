
import { loadReportFromStorage } from "./storage";
import { registrarLogAuditoria } from "./audit";
import { auth } from "./firebase";

declare const XLSX: any;

/**
 * Mapeia as formas de pagamento permitidas pela regra de negócio
 */
const CARD_PAYMENT_METHODS = [
    'CARTÃO DE CRÉDITO',
    'CARTÃO DE DÉBITO',
    'TEF',
    'CARTAO'
];

/**
 * Gera e baixa o arquivo Excel (.xlsx) de vendas em cartão de um período específico.
 * @param periodo String no formato YYYY-MM
 */
export async function exportarVendasCartaoMensal(periodo: string): Promise<{ success: boolean, message: string }> {
    try {
        // 1. Carrega o relatório da fonte da verdade
        const report = await loadReportFromStorage(periodo);
        if (!report) {
            return { success: false, message: "Relatório deste período não encontrado. Processe o fechamento primeiro." };
        }

        const exportData: any[] = [];

        // 2. Processa Notas Fiscais
        report.registros.forEach(nf => {
            const isCard = CARD_PAYMENT_METHODS.some(m => 
                (nf.forma_pagamento_movimento || '').toUpperCase().includes(m) ||
                (nf.detalhe_pagamento_original || '').toUpperCase().includes(m)
            );

            const isAuthorized = !nf.statusNFe || nf.statusNFe === 'NORMAL';
            const value = nf.valor || 0;

            if (isCard && isAuthorized && value > 0) {
                const dataFormatada = nf.tipo === 'PAGA_NO_DIA' 
                    ? (nf.data_pagamento_calculada || nf.data_emissao) 
                    : nf.data_emissao;

                exportData.push({
                    "Data": dataFormatada,
                    "Valor": value
                });
            }
        });

        // 3. Processa Vendas Sem NF (NFC-e / Cupom)
        report.vendas_sem_nf_lista.forEach(v => {
            const isCard = CARD_PAYMENT_METHODS.some(m => 
                (v.forma_pagamento || '').toUpperCase().includes(m) ||
                (v.detalhe_pagamento || '').toUpperCase().includes(m)
            );

            const value = v.valor || 0;

            if (isCard && value > 0) {
                exportData.push({
                    "Data": v.data,
                    "Valor": value
                });
            }
        });

        if (exportData.length === 0) {
            return { success: false, message: "Nenhuma venda em cartão autorizada encontrada para este período." };
        }

        // 4. Cria a planilha usando a biblioteca XLSX (via importmap)
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Define largura das colunas
        ws['!cols'] = [{ wch: 15 }, { wch: 12 }];

        XLSX.utils.book_append_sheet(wb, ws, "Vendas Cartão");

        // 5. Aciona o download
        const [year, month] = periodo.split('-');
        const filename = `vendas_cartao_${month}_${year}.xlsx`;
        XLSX.writeFile(wb, filename);

        // 6. Registra log para governança
        const userEmail = auth.currentUser?.email || 'Sistema';
        await registrarLogAuditoria(
            userEmail,
            'FINANCEIRO',
            'EXPORT_CARD_SALES',
            periodo,
            `Exportado arquivo ${filename} com ${exportData.length} registros.`
        );

        return { success: true, message: `Arquivo gerado com sucesso: ${exportData.length} registros.` };

    } catch (error: any) {
        console.error("Erro na exportação:", error);
        return { success: false, message: `Falha técnica: ${error.message}` };
    }
}
