
import { db, ensureAuth } from "./firebase";
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Vendedor } from "../types";

const COLLECTION = "vendedores";

export async function listarVendedores(): Promise<Vendedor[]> {
    await ensureAuth();
    try {
        const snapshot = await getDocs(collection(db, COLLECTION));
        return snapshot.docs.map(d => d.data() as Vendedor);
    } catch (error) {
        console.error("Erro ao listar vendedores:", error);
        return [];
    }
}

export async function salvarVendedor(vendedor: Vendedor): Promise<void> {
    await ensureAuth();
    await setDoc(doc(db, COLLECTION, vendedor.id), vendedor);
}

export async function excluirVendedor(id: string): Promise<void> {
    await ensureAuth();
    await deleteDoc(doc(db, COLLECTION, id));
}

// Inicializa os vendedores padrões se não existirem
export async function inicializarVendedoresPadrao(): Promise<void> {
    await ensureAuth();
    
    const defaults = [
        { nome: 'ENEIAS', codigo: 'E', percentual: 4.5 },
        { nome: 'CARLOS', codigo: 'C', percentual: 4.5 },
        { nome: 'TARCISIO', codigo: 'T', percentual: 3.0 },
        { nome: 'BRAGA', codigo: 'B', percentual: 3.0 },
    ];

    for (const def of defaults) {
        // ID simples baseada no código para evitar duplicidade na recriação
        const id = `VEND_${def.codigo}`;
        const vendedor: Vendedor = {
            id,
            nome: def.nome,
            codigo: def.codigo,
            percentualComissao: def.percentual,
            ativo: true,
            criadoEm: new Date().toISOString()
        };
        await setDoc(doc(db, COLLECTION, id), vendedor, { merge: true });
    }
}
