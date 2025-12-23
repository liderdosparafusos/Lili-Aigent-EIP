
import { db, ensureAuth, auth, sanitizeData } from "./firebase";
import { 
  doc, writeBatch, collection, getDocs, getDoc, setDoc, updateDoc, 
  query, orderBy, limit, where, startAfter, startAt, endAt, QueryDocumentSnapshot, DocumentData, increment, arrayUnion
} from "firebase/firestore";
import { Produto, PriceHistoryEntry, ProductBatch, ABCAnalysis, ABCItem, Pedido, HistoricalEvent, ProductCustomerStats, LedgerEntry } from "../types";

const PRODUCTS_COLLECTION = "products";
const PAGE_SIZE = 50;

export const normalizeText = (text: string): string => {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/\s+/g, " ");
};

export async function parseProdutosFromXml(file: File): Promise<Produto[]> {
    const text = await file.text();
    const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
    const items = xmlDoc.getElementsByTagName("produto");
    const produtos: Produto[] = [];
    for (let i = 0; i < items.length; i++) {
        const p = items[i];
        const getVal = (tag: string) => p.getElementsByTagName(tag)[0]?.textContent || "";
        const getNum = (tag: string) => parseFloat(getVal(tag)) || 0;
        const codigo = getVal("codigo");
        if (!codigo) continue;
        produtos.push({
            id: codigo, ean: getVal("codigoEan"), descricao: normalizeText(getVal("descricao")), grupo: { codigo: "", descricao: "" },
            unidade: { codigo: "UN", descricao: "UNIDADE" }, estoqueAtual: getNum("estoque"), ativo: true, usageCount: 0,
            precos: { custo: getNum("precoCusto"), medio: getNum("precoMedio"), venda: getNum("precoVenda"), vendaMinima: 0 },
            historicoPrecos: [], fiscal: { ncm: "", cest: "", cst: "", icms: { aliquota: 0, reducao: 0, modalidade: "", st: "" }, pis: { cst: "", aliquota: 0 }, cofins: { cst: "", aliquota: 0 } },
            dimensoes: { altura: 0, largura: 0, comprimento: 0 }, meta: { marca: "", modelo: "", aplicacao: "", observacao: "" },
            controle: { dataInclusao: new Date().toISOString(), ultimaAlteracao: new Date().toISOString(), origem: 'ERP' }
        });
    }
    return produtos;
}

export async function sincronizarProdutos(produtos: Produto[]): Promise<number> {
    await ensureAuth();
    const CHUNK_SIZE = 50;
    let totalSynced = 0;
    for (let i = 0; i < produtos.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = produtos.slice(i, i + CHUNK_SIZE);
        for (const p of chunk) {
            batch.set(doc(db, PRODUCTS_COLLECTION, p.id), sanitizeData(p), { merge: true });
            totalSynced++;
        }
        await batch.commit();
    }
    return totalSynced;
}

export async function listarProdutos(lastDoc?: any): Promise<{items: Produto[], lastDoc: any, hasMore: boolean}> {
  await ensureAuth();
  const ref = collection(db, PRODUCTS_COLLECTION);
  let q = query(ref, orderBy("descricao"), limit(PAGE_SIZE));
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => d.data() as Produto);
  return { items, lastDoc: snap.docs[snap.docs.length - 1], hasMore: items.length === PAGE_SIZE };
}

export async function buscarProdutos(termo: string): Promise<Produto[]> {
    await ensureAuth();
    const ref = collection(db, PRODUCTS_COLLECTION);
    const termoNorm = normalizeText(termo);
    const q = query(ref, orderBy("descricao"), startAt(termoNorm), endAt(termoNorm + '\uf8ff'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Produto);
}

export async function atualizarProduto(produto: Produto): Promise<void> {
    await ensureAuth();
    await updateDoc(doc(db, PRODUCTS_COLLECTION, produto.id), sanitizeData(produto));
}

export async function criarProdutoManual(produto: Produto): Promise<void> {
    await ensureAuth();
    await setDoc(doc(db, PRODUCTS_COLLECTION, produto.id), sanitizeData(produto));
}

export async function listarProdutosMaisUsados(): Promise<Produto[]> {
    await ensureAuth();
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy("usageCount", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Produto);
}

export async function registrarUsoProduto(ids: string[]): Promise<void> {
    await ensureAuth();
    const batch = writeBatch(db);
    ids.forEach(id => {
        const ref = doc(db, PRODUCTS_COLLECTION, id);
        batch.update(ref, { usageCount: increment(1) });
    });
    await batch.commit();
}

export async function aplicarReajusteEmMassa(percentage: number, productIds: string[]): Promise<{ affected: number }> {
    await ensureAuth();
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const user = auth.currentUser?.email || 'SYSTEM';
    const batchId = crypto.randomUUID();

    for (const id of productIds) {
        const ref = doc(db, PRODUCTS_COLLECTION, id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const p = snap.data() as Produto;
            const oldPrice = p.precos.venda;
            const newPrice = parseFloat((oldPrice * (1 + percentage / 100)).toFixed(2));
            
            const historyEntry: PriceHistoryEntry = {
                date: now,
                price: newPrice,
                source: 'BATCH_PERCENTAGE',
                user,
                oldPrice,
                reason: `Reajuste em massa de ${percentage}%`,
                batchId
            };

            batch.update(ref, {
                "precos.venda": newPrice,
                "controle.ultimaAlteracao": now,
                historicoPrecos: arrayUnion(sanitizeData(historyEntry))
            });
        }
    }

    const batchRecord: ProductBatch = {
        id: batchId,
        date: now,
        user,
        percentage,
        affectedCount: productIds.length,
        productIds,
        reverted: false
    };

    batch.set(doc(db, "product_batches", batchId), sanitizeData(batchRecord));
    await batch.commit();
    return { affected: productIds.length };
}

export async function listarUltimosLotes(): Promise<ProductBatch[]> {
    await ensureAuth();
    const q = query(collection(db, "product_batches"), orderBy("date", "desc"), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ProductBatch);
}

export async function reverterLote(batchId: string): Promise<{ restored: number }> {
    await ensureAuth();
    const batchRef = doc(db, "product_batches", batchId);
    const batchSnap = await getDoc(batchRef);
    if (!batchSnap.exists()) throw new Error("Lote não encontrado");
    
    const batchData = batchSnap.data() as ProductBatch;
    if (batchData.reverted) throw new Error("Lote já revertido");

    const firestoreBatch = writeBatch(db);
    const now = new Date().toISOString();
    const user = auth.currentUser?.email || 'SYSTEM';

    for (const id of batchData.productIds) {
        const ref = doc(db, PRODUCTS_COLLECTION, id);
        const pSnap = await getDoc(ref);
        if (pSnap.exists()) {
            const p = pSnap.data() as Produto;
            const entry = p.historicoPrecos?.find(h => h.batchId === batchId);
            if (entry && entry.oldPrice !== undefined) {
                const historyEntry: PriceHistoryEntry = {
                    date: now,
                    price: entry.oldPrice,
                    source: 'ROLLBACK',
                    user,
                    oldPrice: p.precos.venda,
                    reason: `Reversão do lote ${batchId}`
                };
                firestoreBatch.update(ref, {
                    "precos.venda": entry.oldPrice,
                    "controle.ultimaAlteracao": now,
                    historicoPrecos: arrayUnion(sanitizeData(historyEntry))
                });
            }
        }
    }

    firestoreBatch.update(batchRef, { reverted: true, revertedAt: now });
    await firestoreBatch.commit();
    return { restored: batchData.productIds.length };
}

export async function gerarCurvaABC(startDate: string, endDate: string): Promise<ABCAnalysis> {
    await ensureAuth();
    const qOrders = query(
        collection(db, "pedidos"),
        where("dataCriacao", ">=", startDate),
        where("dataCriacao", "<=", endDate + "T23:59:59")
    );
    const snapOrders = await getDocs(qOrders);
    const productTotals: Record<string, { id: string, name: string, total: number, qty: number }> = {};
    
    snapOrders.forEach(docSnap => {
        const order = docSnap.data() as Pedido;
        if (order.status === 'CANCELADO') return;
        order.itens.forEach(item => {
            if (!productTotals[item.produtoId]) {
                productTotals[item.produtoId] = { id: item.produtoId, name: item.descricaoSnapshot, total: 0, qty: 0 };
            }
            productTotals[item.produtoId].total += item.totalItem;
            productTotals[item.produtoId].qty += item.quantidade;
        });
    });

    const items: ABCItem[] = Object.values(productTotals)
        .sort((a, b) => b.total - a.total)
        .map(i => ({
            id: i.id,
            nome: i.name,
            totalVendido: i.total,
            quantidade: i.qty,
            percentualAcumulado: 0,
            classe: 'C'
        }));

    const totalGeral = items.reduce((sum, i) => sum + i.totalVendido, 0);
    let runningSum = 0;
    items.forEach(item => {
        runningSum += item.totalVendido;
        item.percentualAcumulado = totalGeral > 0 ? (runningSum / totalGeral) * 100 : 0;
        if (item.percentualAcumulado <= 70) item.classe = 'A';
        else if (item.percentualAcumulado <= 90) item.classe = 'B';
        else item.classe = 'C';
    });

    const getSummary = (cls: 'A' | 'B' | 'C') => {
        const filtered = items.filter(i => i.classe === cls);
        const val = filtered.reduce((sum, i) => sum + i.totalVendido, 0);
        return { count: filtered.length, value: val, share: totalGeral > 0 ? (val / totalGeral) * 100 : 0 };
    };

    return {
        periodoInicio: startDate,
        periodoFim: endDate,
        totalGeral,
        itens: items,
        resumo: { A: getSummary('A'), B: getSummary('B'), C: getSummary('C') }
    };
}

export async function analisarCompradores(produto: Produto): Promise<ProductCustomerStats[]> {
    await ensureAuth();
    const snap = await getDocs(collection(db, "pedidos"));
    const clientStats: Record<string, ProductCustomerStats> = {};
    snap.forEach(docSnap => {
        const order = docSnap.data() as Pedido;
        const item = order.itens.find(i => i.produtoId === produto.id);
        if (item) {
            if (!clientStats[order.clienteId]) {
                clientStats[order.clienteId] = {
                    clienteId: order.clienteId,
                    clienteNome: order.clienteNomeSnapshot,
                    totalGasto: 0,
                    quantidadeComprada: 0,
                    frequencia: 0,
                    ultimaCompra: order.dataCriacao,
                    ticketMedio: 0
                };
            }
            const s = clientStats[order.clienteId];
            s.totalGasto += item.totalItem;
            s.quantidadeComprada += item.quantidade;
            s.frequencia++;
            if (order.dataCriacao > s.ultimaCompra) s.ultimaCompra = order.dataCriacao;
        }
    });
    return Object.values(clientStats).map(s => ({
        ...s,
        ticketMedio: s.totalGasto / s.frequencia
    })).sort((a, b) => b.totalGasto - a.totalGasto);
}
