
import { db, ensureAuth } from "./firebase";
import { writeBatch, doc } from "firebase/firestore";
import { HistoricalEvent } from "../types";
import JSZip from 'jszip';

const HISTORICAL_COLLECTION = "historical_events";

// Helper: Formata data do XML (DD/MM/AAAA) para ISO (YYYY-MM-DD)
const parseXmlDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('-')) return dateStr.split('T')[0]; // Já é ISO
    const parts = dateStr.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr;
};

// Helper: Extrai apenas números
const cleanDoc = (doc: string) => doc ? doc.replace(/\D/g, '') : '';

export async function processHistoricalZip(zipFile: File): Promise<{ count: number, errors: number }> {
    await ensureAuth();
    const zip = await JSZip.loadAsync(zipFile);
    const parser = new DOMParser();
    
    let processedCount = 0;
    let errorCount = 0;
    
    // Process in Batches of 400 (Firestore limit is 500)
    let batch = writeBatch(db);
    let batchSize = 0;

    const files = Object.keys(zip.files).filter(f => f.toLowerCase().endsWith('.xml') && !f.startsWith('__MACOSX'));

    for (const filename of files) {
        try {
            const xmlText = await zip.files[filename].async("text");
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            // Basic Validation: Is it an NFe?
            const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
            if (!infNFe) continue;

            // Extract Header Info
            const ide = infNFe.getElementsByTagName("ide")[0];
            const emit = infNFe.getElementsByTagName("emit")[0];
            const dest = infNFe.getElementsByTagName("dest")[0];
            const total = infNFe.getElementsByTagName("total")[0];

            const nNF = ide?.getElementsByTagName("nNF")[0]?.textContent;
            const dhEmi = ide?.getElementsByTagName("dhEmi")[0]?.textContent;
            const tpNF = ide?.getElementsByTagName("tpNF")[0]?.textContent; // 1 = Saída

            // Filter: Only Outbound (tpNF=1) and not Canceled (check cStat if available, simple check)
            // Note: Canceled NFs usually come in specific event XMLs, main XML is usually valid. 
            // We assume Import is valid historical data.
            if (tpNF !== '1' || !nNF) continue;

            const vNF = parseFloat(total?.getElementsByTagName("vNF")[0]?.textContent || "0");
            
            // Client Info
            const cnpj = dest?.getElementsByTagName("CNPJ")[0]?.textContent;
            const cpf = dest?.getElementsByTagName("CPF")[0]?.textContent;
            const xNome = dest?.getElementsByTagName("xNome")[0]?.textContent || "Consumidor Final";
            const clienteDoc = cleanDoc(cnpj || cpf || "00000000000");

            // Extract Items
            const itemsList: any[] = [];
            const dets = infNFe.getElementsByTagName("det");
            
            for (let i = 0; i < dets.length; i++) {
                const prod = dets[i].getElementsByTagName("prod")[0];
                if (prod) {
                    itemsList.push({
                        produto: prod.getElementsByTagName("xProd")[0]?.textContent || "Item Desconhecido",
                        qtd: parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0"),
                        valorUnit: parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0"),
                        valorTotal: parseFloat(prod.getElementsByTagName("vProd")[0]?.textContent || "0"),
                    });
                }
            }

            // Create Event Object
            const eventId = `HIST_${nNF}_${clienteDoc}`;
            const historicalEvent: HistoricalEvent = {
                id: nNF,
                type: 'VENDA_HISTORICA',
                data: parseXmlDate(dhEmi || ""),
                clienteDoc,
                clienteNome: xNome,
                valor: vNF,
                itens: itemsList,
                origemArquivo: filename,
                importedAt: new Date().toISOString()
            };

            // Add to Batch
            const ref = doc(db, HISTORICAL_COLLECTION, eventId);
            batch.set(ref, historicalEvent);
            batchSize++;
            processedCount++;

            // Commit if batch full
            if (batchSize >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchSize = 0;
            }

        } catch (e) {
            console.error(`Erro ao processar ${filename}`, e);
            errorCount++;
        }
    }

    // Commit remaining
    if (batchSize > 0) {
        await batch.commit();
    }

    return { count: processedCount, errors: errorCount };
}
