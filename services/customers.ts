
import { db, ensureAuth, sanitizeData } from "./firebase";
import { doc, setDoc, writeBatch, collection, getDocs, updateDoc, getDoc, limit, query } from "firebase/firestore";
import { Cliente } from "../types";

export async function parseClientesFromXml(file: File): Promise<Cliente[]> {
    const text = await file.text();
    const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
    const participantes = xmlDoc.getElementsByTagName("participante");
    const clientes: Cliente[] = [];
    for (let i = 0; i < participantes.length; i++) {
        const p = participantes[i];
        const getVal = (tag: string) => p.getElementsByTagName(tag)[0]?.textContent || "";
        const codigo = getVal("codigo");
        if (!codigo) continue;
        clientes.push({
            cpfCnpj: getVal("cpfCnpj"), codigo, nome: getVal("nome"), fantasia: getVal("fantasia"),
            cliente: true, fornecedor: false, transportadora: false, bloqueado: false, motivoBloqueio: "", limite: 0,
            origem: 'ERP', endereco: { cep: "", logradouro: "", numero: "", bairro: "", codigoMunicipio: "", complemento: "" },
            contato: { telefone: "", celular: "", email: "" }, datas: { cadastro: "", alteracao: "", ultimaMovimentacao: "" }, observacao: ""
        });
    }
    return clientes;
}

export async function sincronizarClientes(clientes: Cliente[]): Promise<number> {
    await ensureAuth();
    let totalSynced = 0;
    const CHUNK_SIZE = 50; 
    for (let i = 0; i < clientes.length; i += CHUNK_SIZE) {
        const chunk = clientes.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const c of chunk) {
            batch.set(doc(db, "clientes", c.codigo), sanitizeData(c), { merge: true });
            totalSynced++;
        }
        await batch.commit();
    }
    return totalSynced;
}

export async function listarClientes(): Promise<Cliente[]> {
  await ensureAuth();
  const snapshot = await getDocs(query(collection(db, "clientes"), limit(200)));
  return snapshot.docs.map(doc => doc.data() as Cliente);
}

export async function getClientesMap(): Promise<Record<string, string>> {
    const clientes = await listarClientes();
    const map: Record<string, string> = {};
    clientes.forEach(c => {
        if (c.cpfCnpj) {
            const cleanId = c.cpfCnpj.replace(/\D/g, '');
            if (cleanId) map[cleanId] = c.nome;
        }
    });
    return map;
}

export async function buscarClientes(termo: string): Promise<Cliente[]> {
  await ensureAuth();
  const termoLower = termo.toLowerCase();
  const snapshot = await getDocs(query(collection(db, "clientes"), limit(100)));
  return snapshot.docs.map(doc => doc.data() as Cliente).filter(c => 
    (c.nome && c.nome.toLowerCase().includes(termoLower)) || (c.cpfCnpj && c.cpfCnpj.includes(termoLower))
  );
}

export async function atualizarCliente(cliente: Cliente): Promise<void> {
    await ensureAuth();
    await updateDoc(doc(db, "clientes", cliente.codigo), sanitizeData(cliente));
}

export async function criarClienteManual(cliente: Cliente): Promise<void> {
    await ensureAuth();
    await setDoc(doc(db, "clientes", cliente.codigo), sanitizeData(cliente));
}
