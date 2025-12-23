
import { db, ensureAuth } from "./firebase";
import { 
  collection, doc, getDocs, setDoc, query, where, writeBatch, deleteDoc
} from "firebase/firestore";
import { Comissao, RelatorioFinal } from "../types";
import { loadReportFromStorage } from "./storage";
import { calcularComissoesDoDia } from "./logic";

const COLLECTION = "comissoes";

/**
 * CORE LOGIC: Recalcula as comissões de um período (YYYY-MM).
 * Agora utiliza o Relatório Consolidado como fonte primária.
 */
export async function recalcularComissoesPorPeriodo(periodo: string): Promise<Comissao[]> {
    await ensureAuth();
    
    // 1. Tenta carregar o Relatório Consolidado (Fonte Única)
    // O ID do relatório é o próprio período (ex: 2024-05)
    const report = await loadReportFromStorage(periodo);
    
    if (!report) {
        console.warn(`Nenhum relatório encontrado para o período ${periodo}.`);
        return [];
    }

    // 2. Utiliza a lógica de cálculo já definida em logic.ts
    const resultado = calcularComissoesDoDia(report);
    
    // 3. Preparar Gravação no Firestore (Coleção 'comissoes')
    // Limpar registros anteriores do período para evitar duplicidade ou lixo
    const qOld = query(collection(db, COLLECTION), where("periodo", "==", periodo));
    const snapOld = await getDocs(qOld);
    const batch = writeBatch(db);
    
    snapOld.docs.forEach(d => batch.delete(d.ref));
    
    const finalComissoes: Comissao[] = [];
    const now = new Date().toISOString();

    // 4. Mapear do resultado do cálculo para o modelo Comissao
    resultado.detalhe.forEach(d => {
        const id = `${d.vendedor}_${periodo}`;
        const comissao: Comissao = {
            id,
            vendedor: d.vendedor,
            periodo,
            baseCalculo: d.baseCalculo,
            percentual: d.percentual,
            valorCalculado: d.valorComissao,
            status: 'PREVISTA',
            detalhes: {
                vendasBrutas: d.vendasBrutas,
                estornos: d.devolucoes
            },
            eventosRelacionados: [], // Vinculado ao relatório id
            createdAt: now,
            updatedAt: now
        };

        batch.set(doc(db, COLLECTION, id), comissao);
        finalComissoes.push(comissao);
    });

    await batch.commit();
    return finalComissoes;
}

export async function listarComissoes(periodo?: string): Promise<Comissao[]> {
    await ensureAuth();
    try {
        let q;
        if (periodo) {
            q = query(collection(db, COLLECTION), where("periodo", "==", periodo));
        } else {
            q = query(collection(db, COLLECTION));
        }
        
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(d => d.data() as Comissao);
        
        // Ordenar por valor da comissão decrescente
        return list.sort((a, b) => b.valorCalculado - a.valorCalculado);
    } catch (e) {
        console.error("Erro ao listar comissões", e);
        return [];
    }
}
