
import { db, ensureAuth, auth, sanitizeData } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { FechamentoMensal, EtapasFechamento, StatusFechamento, ClosingEvent, ClosingEventType, FechamentoPreview, ChecklistItem } from "../types";
import { lockLedgerPeriod, getLedger } from "./ledger"; 
import { listarVendedores, inicializarVendedoresPadrao } from "./sellers";
import { loadReportFromStorage } from "./storage";
import { calcularResumoFechamento, calcularComissoesDoDia } from "./logic";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLLECTION = "fechamentos";

export async function getFechamento(periodo: string): Promise<FechamentoMensal> {
    await ensureAuth();
    const docRef = doc(db, COLLECTION, periodo);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        const data = snap.data() as FechamentoMensal;
        if (!data.timeline) data.timeline = [];
        return data;
    }

    const novo: FechamentoMensal = {
        id: periodo,
        periodo,
        status: 'EM_ANDAMENTO',
        etapas: {
            movimentoImportado: false,
            notasImportadas: false,
            conciliado: false,
            divergenciasResolvidas: false,
            comissaoCalculada: false,
            validado: false
        },
        timeline: [{
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'IMPORT',
            user: auth.currentUser?.email || 'SYSTEM',
            description: `Abertura do período ${periodo}`,
        }],
        metadata: {
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        }
    };

    await setDoc(docRef, sanitizeData(novo));
    return novo;
}

export async function atualizarEtapaFechamento(periodo: string, etapa: keyof EtapasFechamento, valor: boolean): Promise<void> {
    await ensureAuth();
    const docRef = doc(db, COLLECTION, periodo);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
        await getFechamento(periodo);
        return atualizarEtapaFechamento(periodo, etapa, valor);
    }
    
    const current = snap.data() as FechamentoMensal;
    
    if (current.etapas[etapa] === valor || current.status === 'FECHADO') return;

    const etapaStr = String(etapa);
    if (!current.etapas[etapa] && valor === true) {
        const stepLabels: Record<string, string> = { 
            movimentoImportado: "Importação do Movimento Diário", 
            notasImportadas: "Importação de Notas Fiscais", 
            conciliado: "Conciliação Automática Concluída", 
            divergenciasResolvidas: "Divergências Resolvidas", 
            comissaoCalculada: "Cálculo de Comissões Realizado", 
            validado: "Validação Gerencial" 
        };
        
        const event: ClosingEvent = { 
            id: crypto.randomUUID(), 
            timestamp: new Date().toISOString(), 
            type: etapa === 'comissaoCalculada' ? 'COMMISSION' : etapa === 'validado' ? 'VALIDATION' : 'CONCILIATION', 
            user: auth.currentUser?.email || 'SYSTEM', 
            description: `Etapa concluída: ${stepLabels[etapaStr] || etapaStr}` 
        };
        
        await updateDoc(docRef, { 
            [`etapas.${etapaStr}`]: valor, 
            timeline: arrayUnion(sanitizeData(event)), 
            "metadata.atualizadoEm": new Date().toISOString() 
        });
    } else {
        await updateDoc(docRef, { 
            [`etapas.${etapaStr}`]: valor, 
            "metadata.atualizadoEm": new Date().toISOString() 
        });
    }
}

export async function simularFechamento(periodo: string): Promise<FechamentoPreview> {
    await ensureAuth();
    const report = await loadReportFromStorage(periodo);
    if (!report) throw new Error("Nenhum relatório de vendas encontrado para simulação.");

    const resumo = calcularResumoFechamento(report);
    const comissoes = calcularComissoesDoDia(report);

    return {
        periodo,
        geradoEm: new Date().toISOString(),
        metadata: { 
            diasImportados: new Set(report.registros.map(r => r.data_emissao)).size, 
            ultimaDataImportacao: new Date().toISOString() 
        },
        totais: { 
            vendasBrutas: resumo.totalVendasGeral, 
            devolucoes: resumo.totalEstornos, 
            despesas: resumo.totalSaidas, 
            liquido: resumo.saldoEsperado, 
            comissaoTotal: comissoes.totalComissao 
        },
        detalheVendedores: comissoes.detalhe,
        alertasBloqueantes: resumo.totalVendasGeral === 0 ? ["Relatório sem vendas registradas."] : []
    };
}

export async function registrarEventoFechamento(periodo: string, type: ClosingEventType, description: string, metadata?: any): Promise<void> {
    await ensureAuth();
    const docRef = doc(db, COLLECTION, periodo);
    const snap = await getDoc(docRef);
    if (!snap.exists()) await getFechamento(periodo);
    const event: ClosingEvent = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), type, user: auth.currentUser?.email || 'SYSTEM', description, metadata };
    await updateDoc(docRef, { timeline: arrayUnion(sanitizeData(event)), "metadata.atualizadoEm": new Date().toISOString() });
}

export async function fecharPeriodo(periodo: string): Promise<boolean> {
    await ensureAuth();
    const docRef = doc(db, COLLECTION, periodo);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    
    const report = await loadReportFromStorage(periodo);
    const divergencias = report?.registros?.filter((r: any) => r.status_divergencia === 'DIVERGENCIA').length || 0;
    if (divergencias > 0) throw new Error(`Existem ${divergencias} divergências pendentes. O fechamento não pode ser concluído.`);

    const finalSnapshot = await simularFechamento(periodo);
    await lockLedgerPeriod(periodo);
    const event: ClosingEvent = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), type: 'CLOSE', user: auth.currentUser?.email || 'SYSTEM', description: 'Fechamento Mensal Concluído e Bloqueado' };
    await updateDoc(docRef, { 
        status: 'FECHADO', 
        resumoConsolidado: sanitizeData(finalSnapshot), 
        timeline: arrayUnion(sanitizeData(event)), 
        "metadata.fechadoEm": new Date().toISOString(), 
        "metadata.usuario": auth.currentUser?.email || 'SYSTEM' 
    });
    return true;
}

export async function resetFechamentoMensal(periodo: string): Promise<void> {
    await ensureAuth();
    const deleteByQuery = async (collName: string, field: string, value: string) => {
        const q = query(collection(db, collName), where(field, "==", value));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        const CHUNK_SIZE = 400;
        for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            snapshot.docs.slice(i, i + CHUNK_SIZE).forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
    };
    try {
        await Promise.all([
            deleteDoc(doc(db, "reports", periodo)).catch(e => {}),
            deleteByQuery("eip_ledger", "periodo", periodo),
            deleteByQuery("eip_events", "periodo", periodo),
            deleteByQuery("comissoes", "periodo", periodo),
            deleteByQuery("closingDecisions", "fechamentoId", periodo),
            deleteByQuery("agentInsights", "contexto.periodo", periodo)
        ]);
        await deleteDoc(doc(db, COLLECTION, periodo));
        await getFechamento(periodo);
    } catch (e) {}
}

// Fix: Add missing export 'reabrirPeriodo'
export async function reabrirPeriodo(periodo: string): Promise<void> {
    await ensureAuth();
    const docRef = doc(db, COLLECTION, periodo);
    const event: ClosingEvent = { 
        id: crypto.randomUUID(), 
        timestamp: new Date().toISOString(), 
        type: 'REOPEN', 
        user: auth.currentUser?.email || 'SYSTEM', 
        description: 'Período reaberto para correções' 
    };
    
    // Unlock Ledger entries for the period
    const qLedger = query(collection(db, "eip_ledger"), where("periodo", "==", periodo));
    const snapshot = await getDocs(qLedger);
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnapshot => { batch.update(docSnapshot.ref, { isLocked: false }); });
    await batch.commit();

    await updateDoc(docRef, { 
        status: 'EM_ANDAMENTO', 
        resumoConsolidado: null, 
        timeline: arrayUnion(sanitizeData(event)),
        "metadata.atualizadoEm": new Date().toISOString()
    });
}

// Fix: Add missing export 'executarChecklistPreFechamento'
export async function executarChecklistPreFechamento(periodo: string): Promise<ChecklistItem[]> {
    await ensureAuth();
    const report = await loadReportFromStorage(periodo);
    const fechamento = await getFechamento(periodo);
    
    const checklist: ChecklistItem[] = [];

    // Check 1: Files imported
    const importStatus = (fechamento.etapas?.movimentoImportado && fechamento.etapas?.notasImportadas);
    checklist.push({
        id: 'IMPORT',
        label: 'Importação de Arquivos',
        status: importStatus ? 'OK' : 'BLOCKED',
        message: importStatus ? 'Arquivos importados com sucesso.' : 'É necessário importar Movimento e XMLs.',
        block: 'IMPORTACAO'
    });

    // Check 2: Divergences
    const hasDivergences = report?.registros?.some((r: any) => r.status_divergencia === 'DIVERGENCIA');
    checklist.push({
        id: 'DIVERGENCE',
        label: 'Resolução de Divergências',
        status: hasDivergences ? 'BLOCKED' : 'OK',
        message: hasDivergences ? 'Existem divergências pendentes no relatório.' : 'Todas as divergências resolvidas.',
        block: 'CONSISTENCIA'
    });

    // Check 3: Commission
    checklist.push({
        id: 'COMMISSION',
        label: 'Cálculo de Comissões',
        status: fechamento.etapas?.comissaoCalculada ? 'OK' : 'WARNING',
        message: fechamento.etapas?.comissaoCalculada ? 'Comissões calculadas.' : 'Recomendado recalcular comissões.',
        block: 'REGRAS'
    });

    return checklist;
}

// Fix: Add missing export 'listarFechamentosConcluidos'
export async function listarFechamentosConcluidos(): Promise<FechamentoMensal[]> {
    await ensureAuth();
    const q = query(collection(db, COLLECTION), where("status", "==", "FECHADO"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as FechamentoMensal).sort((a,b) => b.periodo.localeCompare(a.periodo));
}

// Fix: Add missing export 'gerarRelatorioPDF'
export function gerarRelatorioPDF(fechamento: FechamentoMensal): void {
    if (!fechamento.resumoConsolidado) return;
    const { totais, detalheVendedores, periodo } = fechamento.resumoConsolidado;
    const doc = new jsPDF();
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    doc.setFontSize(20);
    doc.text("Resumo Mensal Consolidado", 14, 22);
    doc.setFontSize(12);
    doc.text(`Período: ${periodo}`, 14, 32);

    const mainRows = [
        ["Vendas Brutas (NF + NFC-e)", fmt(totais.vendasBrutas)],
        ["Estornos e Devoluções", `-${fmt(totais.devolucoes)}`],
        ["Despesas Operacionais", `-${fmt(totais.despesas)}`],
        ["Resultado Líquido", fmt(totais.liquido)]
    ];

    autoTable(doc, {
        startY: 40,
        head: [["Descrição", "Valor"]],
        body: mainRows,
        theme: 'grid'
    });

    doc.text("Rateio de Comissões", 14, (doc as any).lastAutoTable.finalY + 15);

    const commRows = detalheVendedores.map((v: any) => [
        v.vendedor,
        fmt(v.baseComissao || v.baseCalculo),
        `${v.percentual}%`,
        fmt(v.comissao || v.valorComissao)
    ]);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [["Vendedor", "Base", "%", "Comissão"]],
        body: commRows,
        theme: 'striped'
    });

    doc.save(`fechamento_${periodo}.pdf`);
}
