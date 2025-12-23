
import { RelatorioFinal, PaymentReport, SavedReportMetadata, EipEvent } from "../types";
import { db, ensureAuth, logout, sanitizeData } from "./firebase";
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, orderBy } from "firebase/firestore";
import { clearPeriodData, ingestEventsFromReport } from "./ledger";

const COLLECTION_REPORTS = "reports";
const COLLECTION_PAYMENTS = "payments";

// CACHE EM MEMÓRIA PARA ECONOMIZAR COTA FIRESTORE
const reportCache: Record<string, { data: RelatorioFinal, timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutos

export const saveReportToStorage = async (report: RelatorioFinal, skipIngestion: boolean = false): Promise<boolean> => {
  const attemptSave = async (retry: boolean): Promise<boolean> => {
      try {
        await ensureAuth();

        let id = report.id;
        let monthYear = report.monthYear || "Desconhecido";
        let sortKey = "";

        if (!id) {
            sortKey = new Date().toISOString().slice(0, 7);
            const firstDate = report.registros[0]?.data_emissao || report.vendas_sem_nf_lista[0]?.data;
            if (firstDate) {
               const parts = firstDate.includes('/') ? firstDate.split('/') : firstDate.split('-');
               if (parts.length === 3) {
                  let year, month;
                  if (firstDate.includes('/')) {
                     month = parseInt(parts[1], 10);
                     year = parseInt(parts[2], 10);
                  } else {
                     year = parseInt(parts[0], 10);
                     month = parseInt(parts[1], 10);
                  }
                  const d = new Date(year, month - 1, 1);
                  monthYear = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                  sortKey = `${year}-${String(month).padStart(2, '0')}`;
               }
            }
            monthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
            id = `${sortKey}`;
        } else {
            sortKey = id; 
        }

        const payload: RelatorioFinal = {
            ...report,
            id,
            monthYear,
            createdAt: report.createdAt || new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString()
        };

        // Se skipIngestion for false, precisamos limpar e re-ingerir (escrita pesada)
        if (!skipIngestion) {
            await clearPeriodData(sortKey);
            await ingestEventsFromReport(payload);
        }
        
        await setDoc(doc(db, COLLECTION_REPORTS, id), sanitizeData(payload));

        // Atualiza cache
        reportCache[id] = { data: payload, timestamp: Date.now() };

        return true;
      } catch (error: any) {
        if (error.code === 'permission-denied' && retry) {
            await logout();
            return attemptSave(false);
        }
        console.error("Failed to save report to Firestore", error);
        return false;
      }
  };

  return attemptSave(true);
};

export const loadReportFromStorage = async (id: string): Promise<RelatorioFinal | null> => {
  // TENTA CACHE PRIMEIRO
  if (reportCache[id] && (Date.now() - reportCache[id].timestamp < CACHE_TTL)) {
      return reportCache[id].data;
  }

  try {
    await ensureAuth();
    const docRef = doc(db, COLLECTION_REPORTS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data() as RelatorioFinal;
        reportCache[id] = { data, timestamp: Date.now() };
        return data;
    }
    return null;
  } catch (e: any) {
    console.error("Failed to load report from Firestore", e);
    return null;
  }
};

export const savePaymentReportToStorage = async (report: PaymentReport): Promise<boolean> => {
  const attemptSave = async (retry: boolean): Promise<boolean> => {
      try {
        await ensureAuth();
        let sortKey = new Date().toISOString().slice(0, 7);
        let monthYear = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const firstDate = report.items[0]?.data_emissao;
        if (firstDate) {
          sortKey = firstDate.slice(0, 7);
          const d = new Date(firstDate);
          monthYear = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        }
        monthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
        const id = sortKey;
        const payload: PaymentReport = { ...report, id, monthYear, createdAt: new Date().toISOString() };
        await setDoc(doc(db, COLLECTION_PAYMENTS, id), sanitizeData(payload));
        return true;
      } catch (e: any) {
        if (e.code === 'permission-denied' && retry) {
            await logout();
            return attemptSave(false);
        }
        return false;
      }
  };
  return attemptSave(true);
};

export const loadPaymentReportFromStorage = async (id: string): Promise<PaymentReport | null> => {
  try {
    await ensureAuth();
    const docRef = doc(db, COLLECTION_PAYMENTS, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as PaymentReport : null;
  } catch (e: any) {
    return null;
  }
};

export const listSavedReports = async (): Promise<SavedReportMetadata[]> => {
  const list: SavedReportMetadata[] = [];
  try {
    await ensureAuth();
    const salesSnapshot = await getDocs(collection(db, COLLECTION_REPORTS));
    salesSnapshot.forEach((doc) => {
        const data = doc.data() as RelatorioFinal;
        const totalVal = (data.registros || []).reduce((acc, r) => acc + (r.valor || 0), 0) + 
                         (data.vendas_sem_nf_lista || []).reduce((acc, v) => acc + (v.valor || 0), 0);
        list.push({ id: doc.id, monthYear: data.monthYear || 'Sem Data', createdAt: data.createdAt || new Date().toISOString(), totalValue: totalVal, type: 'SALES' });
    });
    const paymentsSnapshot = await getDocs(collection(db, COLLECTION_PAYMENTS));
    paymentsSnapshot.forEach((doc) => {
        const data = doc.data() as PaymentReport;
        const totalVal = (data.items || []).reduce((acc, i) => acc + (i.valor_total || 0), 0);
        list.push({ id: doc.id, monthYear: (data.monthYear || 'Sem Data') + ' (Pagamentos)', createdAt: data.createdAt || new Date().toISOString(), totalValue: totalVal, type: 'PAYMENT' });
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') await logout();
    throw e;
  }
  return list.sort((a, b) => b.id.localeCompare(a.id));
};

export const deleteReportFromStorage = async (id: string, type: 'SALES' | 'PAYMENT'): Promise<boolean> => {
  try {
    await ensureAuth();
    const collectionName = type === 'SALES' ? COLLECTION_REPORTS : COLLECTION_PAYMENTS;
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    delete reportCache[id];
    return true;
  } catch (e: any) {
    return false;
  }
};
