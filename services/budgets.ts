
import { db, ensureAuth } from "./firebase";
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  query, orderBy, deleteDoc, limit 
} from "firebase/firestore";
import { Orcamento, OrcamentoStatus } from "../types";
import { getNextSequenceValue } from "./counters";

const COLLECTION = "orcamentos";

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

export async function listarOrcamentos(): Promise<Orcamento[]> {
  await ensureAuth();
  // Limite reduzido para 50 para economizar quota drasticamente
  const q = query(collection(db, COLLECTION), orderBy("dataCriacao", "desc"), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Orcamento);
}

export async function buscarOrcamentoPorId(id: string): Promise<Orcamento | null> {
  await ensureAuth();
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? snap.data() as Orcamento : null;
}

export async function salvarOrcamento(orcamento: Orcamento): Promise<{ success: boolean, id?: string }> {
  await ensureAuth();
  try {
    let finalId = orcamento.id;
    let payload = { ...orcamento };

    // Se o ID for um UUID temporário ou novo, gera o sequencial numérico 00001
    if (!finalId || finalId.length > 15) { 
        finalId = await getNextSequenceValue('orcamentos');
        payload.id = finalId;
    }
    
    await setDoc(doc(db, COLLECTION, finalId), safeSerialize(payload), { merge: true });
    return { success: true, id: finalId };
  } catch (error: any) { 
    console.error("Erro ao salvar orçamento:", error);
    if (error.code === 'resource-exhausted') {
        throw new Error("Quota do banco de dados excedida. Tente novamente em 24h ou faça upgrade do plano.");
    }
    return { success: false }; 
  }
}

export async function marcarOrcamentoComoEnviado(id: string, usuarioEmail: string): Promise<boolean> {
    await ensureAuth();
    try {
        await updateDoc(doc(db, COLLECTION, id), { 
            status: 'ENVIADO', 
            dataEnvio: new Date().toISOString(), 
            usuarioEnvio: usuarioEmail 
        });
        return true;
    } catch (error) { return false; }
}

export async function atualizarStatusOrcamento(id: string, status: OrcamentoStatus): Promise<boolean> {
  await ensureAuth();
  try {
    await updateDoc(doc(db, COLLECTION, id), { status });
    return true;
  } catch (error) { return false; }
}

export async function excluirOrcamento(id: string): Promise<boolean> {
  await ensureAuth();
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    return true;
  } catch (error) {
    console.error("Erro ao excluir orçamento:", error);
    return false;
  }
}
