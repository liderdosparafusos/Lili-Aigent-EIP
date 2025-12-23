
import { db, ensureAuth, auth } from "./firebase";
import { 
  collection, doc, getDocs, setDoc, query, where, updateDoc, arrayUnion, getDoc 
} from "firebase/firestore";
import { ItemCalendario, EventoFinanceiro, NfeEntrada } from "../types";
import { listarEventosFinanceiros } from "./finance";

const COLLECTION = "calendarioFinanceiro";

const safeSerialize = (obj: any) => {
  const seen = new WeakSet();
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (value === undefined) return null;
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return undefined;
      if (value.constructor && value.constructor.name !== 'Object' && !Array.isArray(value)) return undefined;
      seen.add(value);
    }
    return value;
  }));
};

export async function gerarCalendarioDeEventos(): Promise<number> {
    await ensureAuth();
    const eventos = await listarEventosFinanceiros(500);
    const vendasFaturadas = eventos.filter(e => e.tipo === 'VENDA_FATURADA');
    let count = 0;
    for (const ev of vendasFaturadas) {
        const q = query(collection(db, COLLECTION), where("referencia.eventoFinanceiroId", "==", ev.id));
        const snap = await getDocs(q);
        if (snap.empty) {
            const novoItem: ItemCalendario = { id: crypto.randomUUID(), tipo: 'RECEBER', origem: 'EIP', status: 'PENDENTE', dataPrevista: ev.dataEvento.split('T')[0], valor: ev.valor, entidade: { tipo: 'CLIENTE', nome: ev.descricao.split('-')[1]?.trim() || "Cliente" }, referencia: { eventoFinanceiroId: ev.id, pedidoId: ev.referencia.pedidoId }, observacao: "", historico: [{ data: new Date().toISOString(), usuario: 'SISTEMA', acao: 'CRIOU' }] };
            await setDoc(doc(db, COLLECTION, novoItem.id), safeSerialize(novoItem));
            count++;
        }
    }
    return count;
}

export async function criarItemManual(item: Omit<ItemCalendario, 'id' | 'historico' | 'origem'>): Promise<void> {
    await ensureAuth();
    const newItem: ItemCalendario = { ...item, id: crypto.randomUUID(), origem: 'EIP', historico: [{ data: new Date().toISOString(), usuario: auth.currentUser?.email || 'N/A', acao: 'MANUAL' }] };
    await setDoc(doc(db, COLLECTION, newItem.id), safeSerialize(newItem));
}

export async function listarCalendario(startMonth: string, endMonth: string): Promise<ItemCalendario[]> {
    await ensureAuth();
    const q = query(collection(db, COLLECTION), where("dataPrevista", ">=", `${startMonth}-01`), where("dataPrevista", "<=", `${endMonth}-31`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ItemCalendario);
}

export async function atualizarStatusItem(id: string, novoStatus: any, dataPagamento?: string): Promise<void> {
    await ensureAuth();
    const payload: any = { status: novoStatus, historico: arrayUnion({ data: new Date().toISOString(), usuario: auth.currentUser?.email || 'N/A', acao: `STATUS_${novoStatus}` }) };
    if (dataPagamento) payload.dataPagamento = dataPagamento;
    await updateDoc(doc(db, COLLECTION, id), payload);
}
