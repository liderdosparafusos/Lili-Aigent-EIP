
import { db, ensureAuth } from "./firebase";
import { 
  collection, doc, getDocs, setDoc, query, orderBy, where, limit 
} from "firebase/firestore";
import { EventoFinanceiro, Pedido, EipEvent } from "../types";

const COLLECTION = "eip_events"; // Redirecionado para a coleção unificada

export async function registrarEventoFinanceiro(evento: Omit<EventoFinanceiro, 'id' | 'criadoEm'>): Promise<string> {
  await ensureAuth();
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Mapeia EventoFinanceiro para EipEvent para manter consistência no banco
    const payload: EipEvent = {
        id,
        type: evento.natureza === 'ENTRADA' ? 'VENDA' : 'AJUSTE',
        subtype: 'MANUAL',
        periodo: evento.dataEvento.slice(0, 7),
        origemId: evento.referencia.pedidoId || evento.referencia.nfeId || 'MANUAL',
        vendedor: evento.referencia.vendedorId || 'SISTEMA',
        valor: evento.valor,
        metadata: {
            descricao: evento.descricao,
            dataReal: evento.dataEvento
        },
        createdAt: now,
        createdBy: evento.criadoPor
    };
    
    await setDoc(doc(db, COLLECTION, id), JSON.parse(JSON.stringify(payload)));
    return id;
  } catch (error) {
    console.error("Erro ao registrar evento financeiro:", error);
    throw error;
  }
}

export async function listarEventosFinanceiros(limitCount: number = 200): Promise<EventoFinanceiro[]> {
  await ensureAuth();
  try {
    const q = query(
        collection(db, COLLECTION), 
        orderBy("createdAt", "desc"),
        limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    // Converte EipEvent de volta para o formato esperado pela UI de EventoFinanceiro
    return snapshot.docs.map(doc => {
        const data = doc.data() as EipEvent;
        const natureza: 'ENTRADA' | 'SAIDA' = data.valor >= 0 ? 'ENTRADA' : 'SAIDA';
        
        return {
            id: data.id,
            tipo: data.type === 'VENDA' ? 'VENDA' : 'SAIDA',
            origem: 'EIP',
            dataEvento: data.metadata?.dataReal || data.createdAt,
            valor: Math.abs(data.valor),
            natureza,
            categoria: data.subtype || 'OUTROS',
            descricao: data.metadata?.descricao || data.type,
            referencia: {
                vendedorId: data.vendedor
            },
            criadoPor: data.createdBy,
            criadoEm: data.createdAt
        } as EventoFinanceiro;
    });
  } catch (error) {
    console.error("Erro ao listar eventos financeiros:", error);
    return [];
  }
}

export async function gerarEventoDePedidoFaturado(pedido: Pedido, usuario: string): Promise<string> {
    return await registrarEventoFinanceiro({
        tipo: 'VENDA_FATURADA',
        origem: 'EIP',
        dataEvento: new Date().toISOString(),
        valor: pedido.totais.total,
        natureza: 'ENTRADA',
        categoria: 'VENDA',
        descricao: `Faturamento Pedido #${pedido.id.slice(0,8)} - ${pedido.clienteNomeSnapshot}`,
        referencia: {
            pedidoId: pedido.id,
            orcamentoId: pedido.orcamentoId,
            vendedorId: pedido.vendedor
        },
        criadoPor: usuario
    });
}
