
import { db, ensureAuth } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { RelatorioFinal, NFData, VendaSemNF, SaidaData } from "../types";
import { getVendedorLabel } from "./logic";

export interface CommercialCompetencyData {
    periodo: {
        inicio: string;
        fim: string;
    };
    kpis: {
        totalVendasBrutas: number;
        vendasAVista: number;
        vendasFaturadas: number;
        vendasNfce: number;
        totalEstornos: number;
        resultadoComercial: number;
        ticketMedio: number;
        qtdVendas: number;
    };
    mixPagamento: {
        metodo: string;
        valor: number;
        percentual: number;
    }[];
    rankingVendedores: {
        nome: string;
        valor: number;
        vendasCount: number;
        percentual: number;
    }[];
    ritmoVendas: {
        data: string;
        valor: number;
    }[];
}

// Helper para converter DD/MM/AAAA para Date para comparação
const parseBRDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

/**
 * CORE LOGIC: Dashboard Comercial utilizando Reports consolidados
 */
export async function getDashboardComercial(startDateStr: string, endDateStr: string): Promise<CommercialCompetencyData> {
    await ensureAuth();

    const startLimit = new Date(startDateStr);
    const endLimit = new Date(endDateStr);
    endLimit.setHours(23, 59, 59, 999);

    // 1. Buscar todos os relatórios (reports)
    // Como os relatórios são mensais, buscamos todos e filtramos os itens internamente por data exata
    const snapshot = await getDocs(collection(db, "reports"));
    const allReports = snapshot.docs.map(d => d.data() as RelatorioFinal);

    // 2. Inicializar Acumuladores
    let brutas = 0;
    let avista = 0;
    let faturadas = 0;
    let nfce = 0;
    let estornos = 0;
    let totalDocs = 0;

    const vendorMap: Record<string, { val: number, count: number }> = {};
    const methodMap: Record<string, number> = {};
    const rhythmMap: Record<string, number> = {};

    // 3. Processar cada relatório
    allReports.forEach(report => {
        
        // A. Processar Notas Fiscais
        (report.registros || []).forEach((nf: NFData) => {
            const dataRef = nf.tipo === 'PAGA_NO_DIA' ? (nf.data_pagamento_calculada || nf.data_emissao) : nf.data_emissao;
            const dateObj = parseBRDate(dataRef);
            
            if (dateObj && dateObj >= startLimit && dateObj <= endLimit) {
                const isEstorno = nf.valor < 0 || nf.tipo === 'DEVOLUCAO' || nf.statusNFe === 'CANCELADA';
                const val = nf.valor;

                if (!isEstorno) {
                    brutas += val;
                    totalDocs++;
                    if (nf.tipo === 'FATURADA') faturadas += val;
                    else avista += val;

                    // Mix Pagamento
                    const metodo = nf.forma_pagamento_movimento || (nf.tipo === 'FATURADA' ? 'BOLETO' : 'DINHEIRO');
                    methodMap[metodo] = (methodMap[metodo] || 0) + val;

                    // Vendedor
                    const v = getVendedorLabel(nf.vendedor_final);
                    if (!vendorMap[v]) vendorMap[v] = { val: 0, count: 0 };
                    vendorMap[v].val += val;
                    vendorMap[v].count++;
                } else {
                    estornos += Math.abs(val);
                    // Abate do vendedor se identificado
                    const v = getVendedorLabel(nf.vendedor_final);
                    if (vendorMap[v]) vendorMap[v].val -= Math.abs(val);
                }

                // Ritmo Diário (ISO String para o gráfico)
                const isoDate = dateObj.toISOString().split('T')[0];
                rhythmMap[isoDate] = (rhythmMap[isoDate] || 0) + val;
            }
        });

        // B. Processar Vendas Sem NF (CUPOM / NFC-e)
        (report.vendas_sem_nf_lista || []).forEach((v: VendaSemNF) => {
            const dateObj = parseBRDate(v.data);
            if (dateObj && dateObj >= startLimit && dateObj <= endLimit) {
                const isEstorno = v.valor < 0;
                const val = v.valor;

                if (!isEstorno) {
                    brutas += val;
                    nfce += val;
                    totalDocs++;

                    const metodo = v.forma_pagamento || "DINHEIRO";
                    methodMap[metodo] = (methodMap[metodo] || 0) + val;

                    const vend = getVendedorLabel(v.vendedor);
                    if (!vendorMap[vend]) vendorMap[vend] = { val: 0, count: 0 };
                    vendorMap[vend].val += val;
                    vendorMap[vend].count++;
                } else {
                    estornos += Math.abs(val);
                }

                const isoDate = dateObj.toISOString().split('T')[0];
                rhythmMap[isoDate] = (rhythmMap[isoDate] || 0) + val;
            }
        });
    });

    const resultadoComercial = brutas - estornos;
    const ticketMedio = totalDocs > 0 ? resultadoComercial / totalDocs : 0;

    // 4. Formatar Saídas para a UI
    const rankingVendedores = Object.entries(vendorMap)
        .map(([nome, d]) => ({
            nome,
            valor: d.val,
            vendasCount: d.count,
            percentual: brutas > 0 ? (d.val / brutas) * 100 : 0
        }))
        .sort((a, b) => b.valor - a.valor);

    const mixPagamento = Object.entries(methodMap)
        .map(([metodo, valor]) => ({
            metodo,
            valor,
            percentual: brutas > 0 ? (valor / brutas) * 100 : 0
        }))
        .sort((a, b) => b.valor - a.valor);

    const ritmoVendas = Object.entries(rhythmMap)
        .map(([data, valor]) => ({ data, valor }))
        .sort((a, b) => a.data.localeCompare(b.data));

    return {
        periodo: { inicio: startDateStr, fim: endDateStr },
        kpis: {
            totalVendasBrutas: brutas,
            vendasAVista: avista,
            vendasFaturadas: faturadas,
            vendasNfce: nfce,
            totalEstornos: estornos,
            resultadoComercial,
            ticketMedio,
            qtdVendas: totalDocs
        },
        mixPagamento,
        rankingVendedores,
        ritmoVendas
    };
}
