
import { db, ensureAuth } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { ClosingDecision } from "../types";

const COLLECTION = "closingDecisions";

export async function registrarDecisao(decisao: Omit<ClosingDecision, 'id' | 'timestamp'>): Promise<void> {
    await ensureAuth();
    
    const id = crypto.randomUUID();
    const payload: ClosingDecision = {
        ...decisao,
        id,
        timestamp: new Date().toISOString()
    };

    await setDoc(doc(db, COLLECTION, id), payload);
}
