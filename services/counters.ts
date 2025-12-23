
import { db, ensureAuth } from "./firebase";
import { doc, runTransaction } from "firebase/firestore";

/**
 * Obtém o próximo valor sequencial para um contador específico e o incrementa.
 * @param counterName Nome do contador (ex: 'orcamentos', 'pedidos')
 * @param padding Quantidade de zeros à esquerda (padrão 5)
 */
export async function getNextSequenceValue(counterName: string, padding: number = 5): Promise<string> {
    await ensureAuth();
    const counterRef = doc(db, "counters", counterName);
    
    return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextValue = 1;
        
        if (counterDoc.exists()) {
            nextValue = (counterDoc.data().value || 0) + 1;
        }
        
        transaction.set(counterRef, { value: nextValue }, { merge: true });
        
        return String(nextValue).padStart(padding, '0');
    });
}
