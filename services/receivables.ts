
import { db, ensureAuth, auth } from "./firebase";
import { 
  collection, doc, getDocs, setDoc, updateDoc, 
  query, where, orderBy, increment, arrayUnion, getDoc 
} from "firebase/firestore";
import { ReceivableEntry, ReceivableStatus, ReceivablesSummary, LedgerEntry, BaixaRecibivel } from "../types";
import { recordEvent } from "./ledger";

const COLLECTION = "contas_a_receber";

/**
 * TRIGGER: Sincronização entre Venda Faturada e Contas a Receber.
 * Chamada sempre que o Ledger registra uma venda faturada.
 */
export async function syncReceivableFromLedger(entry: LedgerEntry): Promise<void> {
    await ensureAuth();

    // Regra: Apenas vendas FATURADAS ou DEVOLUÇÕES afetam o Contas a Receber
    const isFaturada = entry.subtype === 'FATURADA';
    const isReducao = entry.type === 'DEVOLUCAO' || entry.type === 'CANCELAMENTO' || (entry.type === 'AJUSTE' && entry.valor < 0);

    if (!isFaturada && !isReducao) return;

    const docId = entry.origemId;
    if (!docId || docId === 'S/N') return;

    const docRef = doc(db, COLLECTION, docId);
    const snap = await getDoc(docRef);

    // CASO 1: Nova Venda Faturada
    if (entry.type === 'VENDA' && entry.subtype === 'FATURADA') {
        if (snap.exists()) return; // Idempotência: Se já existe, não recria

        // Cálculo de Vencimento Padrão (28 dias se não informado)
        const dEmi = new Date(entry.data);
        const dVenc = new Date(dEmi);
        dVenc.setDate(dEmi.getDate() + 28);

        const newEntry: ReceivableEntry = {
            id: docId,
            numero_nf: docId,
            cliente: entry.descricao.split(' - ')[1] || 'Cliente Diverso',
            vendedor: entry.vendedor,
            valor_original: entry.valor,
            valor_pago: 0,
            saldo_aberto: entry.valor,
            data_emissao: entry.data,
            data_vencimento: dVenc.toISOString().split('T')[0],
            status: 'ABERTA',
            historico_baixas: []
        };

        await setDoc(docRef, newEntry);
    } 
    // CASO 2: Devolução ou Cancelamento que abate do título
    else if (isReducao && snap.exists()) {
        const current = snap.data() as ReceivableEntry;
        
        // Se o valor do estorno for igual ou maior que o saldo, cancela o título
        if (Math.abs(entry.valor) >= current.saldo_aberto) {
            await updateDoc(docRef, {
                status: 'CANCELADA',
                saldo_aberto: 0,
                observacao: `Cancelado via Ledger em ${new Date().toLocaleDateString()}`
            });
        } else {
            await updateDoc(docRef, {
                status: 'PARCIAL',
                saldo_aberto: increment(entry.valor) // entry.valor aqui é negativo
            });
        }
    }
}

export async function registrarBaixaTitulo(
    receivableId: string, 
    baixa: Omit<BaixaRecibivel, 'id' | 'usuario'>
): Promise<void> {
    await ensureAuth();
    const userEmail = auth.currentUser?.email || 'SYSTEM';
    const docRef = doc(db, COLLECTION, receivableId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) throw new Error("Título não encontrado.");
    const current = snap.data() as ReceivableEntry;

    if (baixa.valor_pago > current.saldo_aberto) {
        throw new Error(`Valor informado é maior que o saldo em aberto.`);
    }

    const novoSaldo = current.saldo_aberto - baixa.valor_pago;
    const novoStatus: ReceivableStatus = novoSaldo <= 0 ? 'PAGA' : 'PARCIAL';
    
    const idBaixa = crypto.randomUUID().slice(0, 8).toUpperCase();
    const registroBaixa: BaixaRecibivel = {
        ...baixa,
        id: idBaixa,
        usuario: userEmail
    };

    await updateDoc(docRef, {
        valor_pago: increment(baixa.valor_pago),
        saldo_aberto: novoSaldo,
        status: novoStatus,
        historico_baixas: arrayUnion(registroBaixa)
    });

    // Registrar Entrada no Fluxo de Caixa (Ledger)
    await recordEvent({
        type: 'PAGAMENTO',
        subtype: 'À VISTA',
        periodo: baixa.data_pagamento.slice(0, 7),
        origemId: current.numero_nf,
        vendedor: current.vendedor,
        valor: baixa.valor_pago,
        metadata: {
            descricao: `Recebimento NF ${current.numero_nf} (${idBaixa})`,
            cliente: current.cliente,
            dataReal: baixa.data_pagamento
        }
    });
}

export async function listarRecebiveis(filtros?: { status?: ReceivableStatus, cliente?: string }): Promise<ReceivableEntry[]> {
    await ensureAuth();
    let q = query(collection(db, COLLECTION), orderBy("data_vencimento", "asc"));
    
    if (filtros?.status) q = query(q, where("status", "==", filtros.status));
    
    const snap = await getDocs(q);
    const data = snap.docs.map(d => d.data() as ReceivableEntry);

    if (filtros?.cliente) {
        const term = filtros.cliente.toLowerCase();
        return data.filter(r => r.cliente.toLowerCase().includes(term));
    }

    return data;
}

export async function getReceivablesSummary(startDate: string, endDate: string): Promise<ReceivablesSummary> {
    await ensureAuth();
    const snap = await getDocs(collection(db, COLLECTION));
    const entries = snap.docs.map(d => d.data() as ReceivableEntry);
    
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysStr = new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0];
    const thirtyDaysStr = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];

    const summary: ReceivablesSummary = {
        totalAberto: 0,
        receberHoje: 0,
        receber7Dias: 0,
        receber30Dias: 0,
        totalVencido: 0,
        recebidoPeriodo: 0,
        aging: { ate30: 0, ate60: 0, ate90: 0, mais90: 0 }
    };

    entries.forEach(e => {
        if (e.status !== 'PAGA' && e.status !== 'CANCELADA') {
            summary.totalAberto += e.saldo_aberto;
            
            if (e.data_vencimento === today) summary.receberHoje += e.saldo_aberto;
            if (e.data_vencimento >= today && e.data_vencimento <= sevenDaysStr) summary.receber7Dias += e.saldo_aberto;
            if (e.data_vencimento >= today && e.data_vencimento <= thirtyDaysStr) summary.receber30Dias += e.saldo_aberto;
            
            if (e.data_vencimento < today) {
                summary.totalVencido += e.saldo_aberto;
                const diff = Math.floor((new Date(today).getTime() - new Date(e.data_vencimento).getTime()) / (1000 * 3600 * 24));
                if (diff <= 30) summary.aging.ate30 += e.saldo_aberto;
                else if (diff <= 60) summary.aging.ate60 += e.saldo_aberto;
                else if (diff <= 90) summary.aging.ate90 += e.saldo_aberto;
                else summary.aging.mais90 += e.saldo_aberto;
            }
        }

        // Soma recebidos no período
        (e.historico_baixas || []).forEach(b => {
            if (b.data_pagamento >= startDate && b.data_pagamento <= endDate) {
                summary.recebidoPeriodo += b.valor_pago;
            }
        });
    });

    return summary;
}
