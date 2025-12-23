
import { db, ensureAuth, auth, sanitizeData } from "./firebase";
import { 
  collection, doc, getDocs, setDoc, query, where, writeBatch, orderBy, deleteDoc 
} from "firebase/firestore";
import { EipEvent, LedgerEntry, EipEventType, EipEventSubtype, RelatorioFinal } from "../types";
import { syncReceivableFromLedger } from "./receivables";

const EVENT_COLLECTION = "eip_events";
const LEDGER_COLLECTION = "eip_ledger";

export async function clearPeriodData(periodo: string): Promise<void> {
    await ensureAuth();
    const qEvents = query(collection(db, EVENT_COLLECTION), where("periodo", "==", periodo));
    const snapEvents = await getDocs(qEvents);
    const qLedger = query(collection(db, LEDGER_COLLECTION), where("periodo", "==", periodo));
    const snapLedger = await getDocs(qLedger);
    const batch = writeBatch(db);
    snapEvents.docs.forEach(d => batch.delete(d.ref));
    snapLedger.docs.forEach(d => batch.delete(d.ref));
    if (snapEvents.size > 0 || snapLedger.size > 0) {
        await batch.commit();
    }
}

/**
 * CORE: Transforma os dados do relatório processado em eventos de auditoria (Ledger)
 */
export async function ingestEventsFromReport(report: RelatorioFinal): Promise<void> {
    const periodo = report.id; // YYYY-MM
    const events: Omit<EipEvent, 'id' | 'createdAt' | 'createdBy'>[] = [];

    // 1. Mapear Notas Fiscais
    report.registros.forEach(nf => {
        events.push({
            type: nf.tipo === 'DEVOLUCAO' ? 'DEVOLUCAO' : 'VENDA',
            subtype: nf.tipo === 'FATURADA' ? 'FATURADA' : 'À VISTA',
            periodo,
            origemId: nf.numero,
            vendedor: nf.vendedor_final || 'INDEFINIDO',
            valor: nf.valor,
            metadata: {
                descricao: `NF ${nf.numero} (${nf.tipo})`,
                cliente: nf.cliente,
                dataReal: nf.tipo === 'PAGA_NO_DIA' ? (nf.data_pagamento_calculada || nf.data_emissao) : nf.data_emissao
            }
        });
    });

    // 2. Mapear Vendas Sem NF
    report.vendas_sem_nf_lista.forEach((v, idx) => {
        events.push({
            type: 'VENDA',
            subtype: 'À VISTA',
            periodo,
            origemId: `SNF-${idx}`,
            vendedor: v.vendedor || 'INDEFINIDO',
            valor: v.valor,
            metadata: {
                descricao: `NFC-e / Cupom: ${v.descricao}`,
                cliente: 'Consumidor Final',
                dataReal: v.data
            }
        });
    });

    // 3. Mapear Saídas
    report.saidas_lista.forEach((s, idx) => {
        events.push({
            type: 'AJUSTE',
            subtype: 'ESTORNO',
            periodo,
            origemId: `OUT-${idx}`,
            vendedor: 'LOJA',
            valor: -Math.abs(s.valor),
            metadata: {
                descricao: `Saída de Caixa: ${s.descricao}`,
                dataReal: s.data
            }
        });
    });

    if (events.length > 0) {
        await ingestBulkEvents(events);
    }
}

export async function recordEvent(event: Omit<EipEvent, 'id' | 'createdAt' | 'createdBy'>): Promise<string> {
    await ensureAuth();
    const eventId = crypto.randomUUID();
    const now = new Date().toISOString();
    const userEmail = auth.currentUser?.email || 'SYSTEM';

    const fullEvent: EipEvent = { ...event, id: eventId, createdAt: now, createdBy: userEmail };
    const ledgerId = `LEDGER_${eventId}`;
    const ledgerEntry: LedgerEntry = {
        id: ledgerId,
        periodo: event.periodo,
        data: event.metadata?.dataReal || now.split('T')[0],
        type: event.type,
        subtype: event.subtype || "MANUAL",
        origemEventId: eventId,
        origemId: event.origemId,
        vendedor: event.vendedor,
        valor: event.valor,
        descricao: generateLedgerDescription(fullEvent),
        createdAt: now,
        isLocked: false
    };

    const batch = writeBatch(db);
    batch.set(doc(db, EVENT_COLLECTION, eventId), sanitizeData(fullEvent));
    batch.set(doc(db, LEDGER_COLLECTION, ledgerId), sanitizeData(ledgerEntry));
    await batch.commit();

    await syncReceivableFromLedger(ledgerEntry);
    return eventId;
}

export async function ingestBulkEvents(events: Omit<EipEvent, 'id' | 'createdAt' | 'createdBy'>[]): Promise<void> {
    await ensureAuth();
    if (events.length === 0) return;

    const CHUNK_SIZE = 400;
    for (let i = 0; i < events.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const now = new Date().toISOString();
        const userEmail = auth.currentUser?.email || 'SYSTEM';
        const chunk = events.slice(i, i + CHUNK_SIZE);
        
        const ledgerEntriesToSync: LedgerEntry[] = [];

        chunk.forEach(evt => {
            const eventId = crypto.randomUUID();
            const fullEvent: EipEvent = { ...evt, id: eventId, createdAt: now, createdBy: userEmail };
            const ledgerEntry: LedgerEntry = {
                id: `LEDGER_${eventId}`,
                periodo: evt.periodo,
                data: evt.metadata?.dataReal || now.split('T')[0],
                type: evt.type,
                subtype: evt.subtype || "OUTROS",
                origemEventId: eventId,
                origemId: evt.origemId,
                vendedor: evt.vendedor,
                valor: evt.valor,
                descricao: generateLedgerDescription(fullEvent),
                createdAt: now,
                isLocked: false
            };
            batch.set(doc(db, EVENT_COLLECTION, eventId), sanitizeData(fullEvent));
            batch.set(doc(db, LEDGER_COLLECTION, ledgerEntry.id), sanitizeData(ledgerEntry));
            ledgerEntriesToSync.push(ledgerEntry);
        });

        await batch.commit();

        for (const entry of ledgerEntriesToSync) {
            await syncReceivableFromLedger(entry);
        }
    }
}

function generateLedgerDescription(event: EipEvent): string {
    const base = event.metadata?.descricao || event.type;
    const sub = event.subtype ? `(${event.subtype})` : '';
    const cli = event.metadata?.cliente ? ` - ${event.metadata.cliente}` : '';
    return `${base} ${sub}${cli}`.trim();
}

export async function getLedger(periodo: string): Promise<LedgerEntry[]> {
    await ensureAuth();
    const q = query(collection(db, LEDGER_COLLECTION), where("periodo", "==", periodo));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as LedgerEntry);
}

export async function registrarAjusteFechamento(periodo: string, tipo: 'ESTORNO' | 'VENDA' | 'AJUSTE', valor: number, descricao: string, vendedor: string, referenciaId: string): Promise<string> {
    let eventType: EipEventType = tipo === 'VENDA' ? 'VENDA' : (tipo === 'ESTORNO' ? 'AJUSTE' : 'AJUSTE');
    let eventSubtype: EipEventSubtype = tipo === 'ESTORNO' ? 'ESTORNO' : 'MANUAL';
    return await recordEvent({
        type: eventType, subtype: eventSubtype, periodo, origemId: referenciaId, vendedor, valor,
        metadata: { descricao: `Ajuste Divergência: ${descricao}`, dataReal: new Date().toISOString().split('T')[0] }
    });
}

export async function lockLedgerPeriod(periodo: string): Promise<void> {
    await ensureAuth();
    const q = query(collection(db, LEDGER_COLLECTION), where("periodo", "==", periodo));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnapshot => { batch.update(docSnapshot.ref, { isLocked: true }); });
    await batch.commit();
}
