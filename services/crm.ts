
import { Cliente, CRMProfile, CRMStatus, CRMMetrics, CRMTimelineEvent, CRMProductStats, HistoricalEvent } from "../types";
import { db, ensureAuth } from "./firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

// --- HELPERS ---

const calculateStatus = (metrics: CRMMetrics): CRMStatus => {
    if (metrics.purchaseCount === 0) return 'NOVO';
    if (metrics.daysSinceLastPurchase > 90) return 'INATIVO';
    if (metrics.daysSinceLastPurchase > 60) return 'EM_RISCO';
    if (metrics.purchaseCount > 2) return 'RECORRENTE';
    return 'ATIVO';
};

const generateSuggestions = (status: CRMStatus, metrics: CRMMetrics): string[] => {
    const suggestions: string[] = [];

    if (status === 'NOVO') {
        suggestions.push("Cliente sem histórico de compras. Oferecer condição de boas-vindas.");
    } else if (status === 'EM_RISCO') {
        suggestions.push(`Cliente ausente há ${metrics.daysSinceLastPurchase} dias. Entrar em contato para reativação.`);
    } else if (status === 'INATIVO') {
        suggestions.push("Cliente inativo. Verificar se ainda opera ou se mudou de fornecedor.");
    } else if (status === 'RECORRENTE') {
        if (metrics.avgTicket > 1000) {
            suggestions.push("Cliente VIP Recorrente. Considerar para lista de presentes/brindes.");
        }
    }

    if (metrics.returnCount > 0) {
        suggestions.push(`Atenção: Cliente possui ${metrics.returnCount} devoluções registradas.`);
    }

    return suggestions;
};

// --- MAIN FUNCTION: BUILD PROFILE ---

export async function buildCustomerProfile(cliente: Cliente): Promise<CRMProfile> {
    await ensureAuth();
    
    const events: CRMTimelineEvent[] = [];
    let totalValue = 0;
    let purchaseCount = 0;
    let returnCount = 0;
    const sellerCounts: Record<string, number> = {};
    const productStats: Record<string, CRMProductStats> = {};

    // 1. Fetch Sales Orders (Pedidos) - OPERATIONAL SOURCE
    try {
        const qPedidos = query(
            collection(db, "pedidos"),
            where("clienteId", "==", cliente.codigo),
            orderBy("dataCriacao", "desc"),
            limit(50) 
        );
        const snapPedidos = await getDocs(qPedidos);
        
        snapPedidos.forEach(doc => {
            const p = doc.data();
            if (p.status !== 'CANCELADO') {
                totalValue += p.totais.total;
                purchaseCount++;
                
                const vend = p.vendedor || 'INDEFINIDO';
                sellerCounts[vend] = (sellerCounts[vend] || 0) + 1;

                if (p.itens) {
                    p.itens.forEach((item: any) => {
                        const pid = item.produtoId;
                        if (!productStats[pid]) {
                            productStats[pid] = {
                                id: pid,
                                name: item.descricaoSnapshot,
                                totalValue: 0,
                                quantity: 0
                            };
                        }
                        productStats[pid].totalValue += item.totalItem;
                        productStats[pid].quantity += item.quantidade;
                    });
                }

                events.push({
                    id: doc.id,
                    date: p.dataCriacao,
                    type: 'PEDIDO',
                    value: p.totais.total,
                    description: `Pedido #${doc.id.slice(0,6)} (${p.status})`,
                    meta: { vendedor: p.vendedor }
                });
            }
        });
    } catch (e) {
        console.error("Erro ao buscar pedidos para CRM:", e);
    }

    // 2. Fetch Budgets (Orcamentos) - INTENT SIGNALS
    try {
        const qOrc = query(
            collection(db, "orcamentos"),
            where("clienteId", "==", cliente.codigo),
            orderBy("dataCriacao", "desc"),
            limit(20)
        );
        const snapOrc = await getDocs(qOrc);
        
        snapOrc.forEach(doc => {
            const o = doc.data();
            events.push({
                id: doc.id,
                date: o.dataCriacao,
                type: 'ORCAMENTO',
                value: o.totais.total,
                description: `Orçamento #${doc.id.slice(0,6)} (${o.status})`,
                meta: { vendedor: o.vendedor }
            });
        });
    } catch (e) {
        console.error("Erro ao buscar orçamentos para CRM:", e);
    }

    // 3. FETCH HISTORICAL EVENTS (INTELLIGENCE SOURCE)
    // Only if client has CPF/CNPJ
    const cleanDoc = cliente.cpfCnpj ? cliente.cpfCnpj.replace(/\D/g, '') : '';
    if (cleanDoc) {
        try {
            const qHist = query(
                collection(db, "historical_events"),
                where("clienteDoc", "==", cleanDoc),
                orderBy("data", "desc"),
                limit(100)
            );
            const snapHist = await getDocs(qHist);
            
            snapHist.forEach(doc => {
                const h = doc.data() as HistoricalEvent;
                
                // Aggregate Stats
                totalValue += h.valor;
                purchaseCount++;
                
                // Aggregate Product Stats from History
                h.itens.forEach((item: any) => {
                    const pid = `HIST_${item.produto.slice(0,10)}`; // Fake ID for unstructured products
                    if (!productStats[pid]) {
                        productStats[pid] = {
                            id: pid,
                            name: item.produto,
                            totalValue: 0,
                            quantity: 0
                        };
                    }
                    productStats[pid].totalValue += item.valorTotal;
                    productStats[pid].quantity += item.qtd;
                });

                events.push({
                    id: `HIST_${h.id}`,
                    date: h.data, // Format YYYY-MM-DD matches sortable string
                    type: 'HISTORICO_XML',
                    value: h.valor,
                    description: `NF Histórica ${h.id}`,
                    meta: { origem: 'Arquivo Morto (XML)' }
                });
            });

        } catch (e) {
            console.error("Erro ao buscar histórico XML:", e);
        }
    }

    // Sort combined timeline
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate Metrics
    const lastPurchase = events.find(e => e.type === 'PEDIDO' || e.type === 'HISTORICO_XML');
    const firstPurchase = [...events].reverse().find(e => e.type === 'PEDIDO' || e.type === 'HISTORICO_XML');
    const now = new Date();
    
    const daysSinceLast = lastPurchase 
        ? Math.floor((now.getTime() - new Date(lastPurchase.date).getTime()) / (1000 * 3600 * 24))
        : 0;

    // Find Top Seller (Only Operational)
    let topSeller = null;
    let maxCount = 0;
    for (const [seller, count] of Object.entries(sellerCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topSeller = seller;
        }
    }

    // Sort Top Products by Value
    const topProducts = Object.values(productStats)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

    const metrics: CRMMetrics = {
        ltv: totalValue,
        avgTicket: purchaseCount > 0 ? totalValue / purchaseCount : 0,
        purchaseCount,
        daysSinceLastPurchase: daysSinceLast,
        lastPurchaseDate: lastPurchase ? lastPurchase.date : null,
        firstPurchaseDate: firstPurchase ? firstPurchase.date : null,
        topSeller,
        returnCount
    };

    const status = calculateStatus(metrics);
    const suggestions = generateSuggestions(status, metrics);

    return {
        clienteId: cliente.codigo,
        status,
        metrics,
        timeline: events,
        topProducts,
        suggestions,
        lastUpdated: new Date().toISOString()
    };
}
