
import { db, ensureAuth } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { AuditLog } from "../types";

const COLLECTION = "audit_logs";

export async function registrarLogAuditoria(
    usuario: string,
    modulo: string,
    acao: string,
    entidadeId: string,
    detalhes: string
): Promise<void> {
    await ensureAuth();
    const id = `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const log: AuditLog = {
        id,
        timestamp: new Date().toISOString(),
        usuario,
        modulo,
        acao,
        entidadeId,
        detalhes
    };
    await setDoc(doc(db, COLLECTION, id), log);
}
