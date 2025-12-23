
import { db, ensureAuth, auth } from "./firebase";
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  query, orderBy, where, writeBatch, limit, deleteDoc
} from "firebase/firestore";
import { Pedido, PedidoStatus, Orcamento } from "../types";
import { gerarEventoDePedidoFaturado } from "./finance";
import { recordEvent } from "./ledger"; 
import { registrarUsoProduto } from "./products";
import { getNextSequenceValue } from "./counters";

const COLLECTION = "pedidos";

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

export async function listarPedidos(): Promise<Pedido[]> {
  await ensureAuth();
  const q = query(collection(db, COLLECTION), orderBy("dataCriacao", "desc"), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Pedido);
}

export async function buscarPedidoPorId(id: string): Promise<Pedido | null> {
  await ensureAuth();
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? snap.data() as Pedido : null;
}

export async function atualizarStatusPedido(id: string, status: PedidoStatus): Promise<boolean> {
  await ensureAuth();
  try {
    const docRef = doc(db, COLLECTION, id);
    if (status === 'FATURADO') {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const pedido = snap.data() as Pedido;
            const userEmail = auth.currentUser?.email || 'Sistema';
            await gerarEventoDePedidoFaturado(pedido, userEmail);
            await recordEvent({
                type: 'VENDA', subtype: 'FATURADA', periodo: new Date().toISOString().slice(0, 7),
                origemId: id, vendedor: pedido.vendedor, valor: pedido.totais.total,
                metadata: { descricao: `Pedido #${id}`, cliente: pedido.clienteNomeSnapshot, dataReal: new Date().toISOString().split('T')[0] }
            });
        }
    }
    await updateDoc(docRef, { status });
    return true;
  } catch (error) { return false; }
}

export async function gerarPedidoDoOrcamento(orcamento: Orcamento): Promise<string | null> {
  await ensureAuth();
  if (orcamento.status !== 'ENVIADO' && orcamento.status !== 'APROVADO') return null;
  try {
    // Novo Sequencial Numérico para o Pedido
    const pedidoId = await getNextSequenceValue('pedidos');
    const batch = writeBatch(db);
    
    const itensPedido = orcamento.itens.map(item => ({ ...item, id: crypto.randomUUID() }));
    const novoPedido: Pedido = { 
        id: pedidoId, 
        orcamentoId: orcamento.id, 
        clienteId: orcamento.clienteId, 
        clienteNomeSnapshot: orcamento.clienteNomeSnapshot, 
        vendedor: orcamento.vendedor, 
        dataCriacao: new Date().toISOString(), 
        status: 'ABERTO', 
        origem: 'ORCAMENTO', 
        itens: itensPedido, 
        totais: { ...orcamento.totais }, 
        observacao: orcamento.observacao 
    };

    batch.set(doc(db, COLLECTION, pedidoId), safeSerialize(novoPedido));
    batch.update(doc(db, "orcamentos", orcamento.id), { status: 'CONVERTIDO', pedidoGeradoId: pedidoId });
    
    await batch.commit();
    registrarUsoProduto(itensPedido.map(i => i.produtoId)).catch(() => {});
    return pedidoId;
  } catch (error) { 
      console.error("Erro ao gerar pedido:", error);
      return null; 
  }
}

export async function excluirPedido(id: string): Promise<boolean> {
  await ensureAuth();
  try {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
        const pedido = snap.data() as Pedido;
        const batch = writeBatch(db);
        
        // Deleta o pedido
        batch.delete(docRef);
        
        // Se veio de um orçamento, volta o orçamento para 'APROVADO' e limpa o ID do pedido vinculado
        if (pedido.orcamentoId) {
            const orcRef = doc(db, "orcamentos", pedido.orcamentoId);
            batch.update(orcRef, { 
                status: 'APROVADO', 
                pedidoGeradoId: null 
            });
        }
        
        await batch.commit();
        return true;
    }
    return false;
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    return false;
  }
}
