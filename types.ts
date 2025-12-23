
export enum UserRole {
  OPERADOR = 'OPERADOR',
  CONSULTA = 'CONSULTA'
}

export interface User {
  email: string;
  role: UserRole;
}

export enum AppState {
  LOGIN,
  MAIN_MENU,
  UPLOAD,
  PROCESSING,
  RESOLUTION,
  REPORT,
  REPORT_LIST,
  ORCAMENTOS_LIST,
  ORCAMENTOS_EDIT,
  PEDIDOS_LIST,
  PEDIDOS_DETAIL,
  FINANCEIRO_EVENTOS,
  COMISSOES_DASHBOARD,
  FINANCEIRO_CALENDARIO,
  FINANCEIRO_RESUMO,
  AGENTE_COMERCIAL,
  INTELLIGENCE_ALERTS,
  EXECUTION_HUB,
  FINANCIAL_AGENT,
  CONSULTA_CLIENTES,
  CONSULTA_PRODUTOS,
  IMPORT_CLIENTES,
  IMPORT_PRODUCTS,
  IMPORT_HISTORICO,
  VENDEDORES_LIST,
  CONTAS_A_RECEBER,
  EXPORT_VENDAS_CARTAO
}

// --- SALES / REPORT TYPES ---
export interface NFData {
    numero: string;
    valor: number;
    cliente: string;
    data_emissao: string;
    vendedor_xml: string;
    vendedor_movimento?: string | null;
    forma_pagamento_movimento?: string;
    detalhe_pagamento_original?: string;
    inf_cpl_xml?: string;
    tipo: 'PAGA_NO_DIA' | 'FATURADA' | 'DEVOLUCAO';
    status_divergencia: 'OK' | 'DIVERGENCIA';
    tipo_divergencia_padrao?: string[];
    // Added for logic support
    tipo_divergencia?: string[];
    motivo_divergencia?: string;
    vendedor_final?: string;
    vendedor_correto?: string;
    data_pagamento_calculada?: string;
    statusNFe?: 'NORMAL' | 'CANCELADA' | 'DENEGADA';
    isDevolucao?: boolean;
    nfOriginalReferencia?: string;
}

export interface VendaSemNF {
    data: string;
    valor: number;
    vendedor: string;
    forma_pagamento: string;
    detalhe_pagamento?: string;
    descricao: string;
}

export interface SaidaData {
    data: string;
    descricao: string;
    valor: number;
    categoria?: string;
}

export interface RelatorioFinal {
    id: string;
    monthYear?: string;
    registros: NFData[];
    vendas_sem_nf_lista: VendaSemNF[];
    saidas_lista: SaidaData[];
    totais_forma: { dinheiro: number; pix: number; cartao: number; };
    createdAt: string;
    lastUpdatedAt?: string;
    divergencias_resolvidas?: number;
}

export interface DivergenceItem {
    nfData: NFData;
    index: number;
}

export interface ResumoFechamento {
    totalVendasGeral: number;
    totalVendasComNF: number;
    totalVendasSemNF: number;
    totalSaidas: number;
    totalEstornos: number;
    saldoEsperado: number;
    totaisPorForma: Record<string, number>;
    totaisPorVendedor: Record<string, number>;
    textoExplicativo?: string;
}

export interface ResumoComissaoDiaria {
    detalhe: ComissaoDiaria[];
    totalComissao: number;
    textoExplicativo: string;
}

export interface ComissaoDiaria {
    vendedor: string;
    vendasBrutas: number;
    devolucoes: number;
    baseCalculo: number;
    percentual: number;
    valorComissao: number;
}

export interface PaymentReport {
    id?: string;
    items: NfeEntrada[];
    monthYear?: string;
    createdAt: string;
}

export interface NfeEntrada {
    id?: string;
    numero_nf: string;
    fornecedor: string;
    data_emissao: string;
    valor_total?: number;
    parcelas: NfeParcela[];
}

export interface NfeParcela {
    nDup: string;
    dVenc: string;
    vDup: number;
    status: 'pendente' | 'pago';
}

export interface SavedReportMetadata {
    id: string;
    monthYear: string;
    createdAt: string;
    totalValue: number;
    type: 'SALES' | 'PAYMENT';
}

// --- AGENT / INSIGHT / EXECUTION TYPES ---
export type InsightType = 'Financeiro' | 'Fiscal' | 'Comercial' | 'Operacional' | 'FECHAMENTO';
export type InsightSeverity = 'Baixo' | 'Médio' | 'Alto' | 'Crítico' | 'CRITICO' | 'ATENCAO' | 'INFO';

export interface Insight {
    id: string;
    tipo: InsightType;
    prioridade: InsightSeverity;
    severidade: InsightSeverity;
    dataGeracao: string;
    titulo: string;
    descricao: string;
    mensagem?: string;
    importancia: string;
    sugestao: string;
    recomendacao?: string;
    status: 'NOVO' | 'LIDO' | 'ARQUIVADO';
    contexto?: any;
}

export type AgentActionStatus = 'SUGGESTED' | 'EXECUTED' | 'CANCELLED';

export interface AgentAction {
    id: string;
    alertaOrigemId: string;
    tipo: 'FINANCEIRO' | 'FISCAL' | 'COMERCIAL' | 'OPERACIONAL';
    status: AgentActionStatus;
    prioridade: 'HIGH' | 'MEDIUM' | 'LOW';
    titulo: string;
    acaoSugerida: string;
    impacto: string;
    payload: any;
    // Fields for execution panel
    explanation?: string;
    taxContext?: {
        ufOrigem: string;
        ufDestino: string;
        rulesApplied: { ruleId: string; impact: string; description: string; }[];
    };
    audit?: {
        suggestedAt: string;
        decidedBy?: string;
        decidedAt?: string;
        statusFinal?: 'Confirmada' | 'Cancelada';
        approvedBy?: string;
        executedAt?: string;
    };
}

// --- FINANCIAL / LEDGER TYPES ---
export type EipEventType = 'VENDA' | 'DEVOLUCAO' | 'CANCELAMENTO' | 'AJUSTE' | 'PAGAMENTO';
export type EipEventSubtype = 'FATURADA' | 'À VISTA' | 'ESTORNO' | 'MANUAL' | 'OUTROS';

export interface EipEvent {
    id: string;
    type: EipEventType;
    subtype?: EipEventSubtype;
    periodo: string;
    origemId: string;
    vendedor: string;
    valor: number;
    metadata?: {
        descricao?: string;
        cliente?: string;
        dataReal?: string;
    };
    createdAt: string;
    createdBy: string;
}

export interface LedgerEntry {
    id: string;
    periodo: string;
    data: string;
    type: EipEventType;
    subtype: EipEventSubtype;
    origemEventId: string;
    origemId: string;
    vendedor: string;
    valor: number;
    descricao: string;
    createdAt: string;
    isLocked: boolean;
}

export interface EventoFinanceiro {
    id: string;
    tipo: string;
    origem: 'EIP' | 'ERP';
    dataEvento: string;
    valor: number;
    natureza: 'ENTRADA' | 'SAIDA';
    categoria: string;
    descricao: string;
    referencia: {
        pedidoId?: string;
        orcamentoId?: string;
        vendedorId?: string;
        nfeId?: string;
        eventoFinanceiroId?: string;
    };
    criadoPor: string;
    criadoEm: string;
}

export interface Comissao {
    id: string;
    vendedor: string;
    periodo: string;
    baseCalculo: number;
    percentual: number;
    valorCalculado: number;
    status: 'PREVISTA' | 'PAGA';
    detalhes: {
        vendasBrutas: number;
        estornos: number;
    };
    eventosRelacionados: string[];
    createdAt: string;
    updatedAt: string;
}

export interface ItemCalendario {
    id: string;
    tipo: 'PAGAR' | 'RECEBER';
    origem: 'EIP' | 'ERP';
    status: 'PENDENTE' | 'PAGO' | 'CANCELADO';
    dataPrevista: string;
    dataPagamento?: string;
    valor: number;
    entidade: {
        tipo: 'CLIENTE' | 'FORNECEDOR' | 'INTERNO';
        nome: string;
    };
    referencia: {
        eventoFinanceiroId?: string;
        pedidoId?: string;
        nfeId?: string;
    };
    observacao?: string;
    historico: {
        data: string;
        usuario: string;
        acao: string;
    }[];
}

// --- CUSTOMER / CRM TYPES ---
export interface Cliente {
    codigo: string;
    nome: string;
    fantasia: string;
    cpfCnpj: string;
    cliente: boolean;
    fornecedor: boolean;
    transportadora: boolean;
    bloqueado: boolean;
    motivoBloqueio: string;
    limite: number;
    origem: 'ERP' | 'EIP';
    endereco: {
        cep: string;
        logradouro: string;
        numero: string;
        bairro: string;
        codigoMunicipio: string;
        complemento: string;
    };
    contato: {
        telefone: string;
        celular: string;
        email: string;
    };
    datas: {
        cadastro: string;
        alteracao: string;
        ultimaMovimentacao: string;
    };
    observacao: string;
}

export interface CRMProfile {
    clienteId: string;
    status: CRMStatus;
    metrics: CRMMetrics;
    timeline: CRMTimelineEvent[];
    topProducts: CRMProductStats[];
    suggestions: string[];
    lastUpdated: string;
}

export type CRMStatus = 'NOVO' | 'ATIVO' | 'RECORRENTE' | 'EM_RISCO' | 'INATIVO';

export interface CRMMetrics {
    ltv: number;
    avgTicket: number;
    purchaseCount: number;
    daysSinceLastPurchase: number;
    lastPurchaseDate: string | null;
    firstPurchaseDate: string | null;
    topSeller: string | null;
    returnCount: number;
}

export interface CRMTimelineEvent {
    id: string;
    date: string;
    type: 'PEDIDO' | 'ORCAMENTO' | 'HISTORICO_XML';
    value: number;
    description: string;
    meta?: any;
}

export interface CRMProductStats {
    id: string;
    name: string;
    totalValue: number;
    quantity: number;
}

// --- PRODUCT TYPES ---
export interface Produto {
    id: string;
    ean: string;
    descricao: string;
    descricaoReduzida?: string;
    grupo: { codigo: string; descricao: string; };
    unidade: { codigo: string; descricao: string; vendaFracionada?: boolean; };
    estoqueAtual: number;
    ativo: boolean;
    usageCount: number;
    precos: { custo: number; medio: number; venda: number; vendaMinima: number; };
    fiscal: { ncm: string; cest: string; cst: string; icms: any; pis: any; cofins: any; };
    dimensoes: { altura: number; largura: number; comprimento: number; };
    meta: { marca: string; modelo: string; aplicacao: string; observacao: string; };
    controle: { dataInclusao: string; ultimaAlteracao: string; origem: 'ERP' | 'EIP'; };
    historicoPrecos: PriceHistoryEntry[];
}

export interface PriceHistoryEntry {
    date: string;
    price: number;
    source: string;
    user: string;
    oldPrice?: number;
    reason?: string;
    batchId?: string;
}

export interface ProductBatch {
    id: string;
    date: string;
    user: string;
    percentage: number;
    affectedCount: number;
    productIds: string[];
    reverted: boolean;
    revertedAt?: string;
}

export interface ABCAnalysis {
    periodoInicio: string;
    periodoFim: string;
    totalGeral: number;
    itens: ABCItem[];
    resumo: {
        A: ABCSummary;
        B: ABCSummary;
        C: ABCSummary;
    };
}

export interface ABCItem {
    id: string;
    nome: string;
    totalVendido: number;
    quantidade: number;
    percentualAcumulado: number;
    classe: 'A' | 'B' | 'C';
}

export interface ABCSummary {
    count: number;
    value: number;
    share: number;
}

export interface ProductCustomerStats {
    clienteId: string;
    clienteNome: string;
    totalGasto: number;
    quantidadeComprada: number;
    frequencia: number;
    ultimaCompra: string;
    ticketMedio: number;
}

// --- SALES ORDER TYPES ---
export interface Orcamento {
    id: string;
    clienteId: string;
    clienteNomeSnapshot: string;
    vendedor: string;
    dataCriacao: string;
    dataValidade?: string;
    status: OrcamentoStatus;
    itens: OrcamentoItem[];
    totais: { subtotal: number; desconto: number; total: number; };
    observacao?: string;
    dataEnvio?: string;
    usuarioEnvio?: string;
    pedidoGeradoId?: string;
}

export type OrcamentoStatus = 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'CONVERTIDO' | 'CANCELADO' | 'EXPIRADO';

export interface OrcamentoItem {
    id: string;
    produtoId: string;
    descricaoSnapshot: string;
    unidade: string;
    quantidade: number;
    precoUnitario: number;
    desconto: number;
    totalItem: number;
}

export interface Pedido {
    id: string;
    orcamentoId: string;
    clienteId: string;
    clienteNomeSnapshot: string;
    vendedor: string;
    dataCriacao: string;
    status: PedidoStatus;
    origem: 'ORCAMENTO' | 'BALCAO';
    itens: OrcamentoItem[];
    totais: { subtotal: number; desconto: number; total: number; };
    observacao?: string;
}

export type PedidoStatus = 'ABERTO' | 'FATURADO' | 'CANCELADO';

// --- RECEIVABLES TYPES ---
export interface ReceivableEntry {
    id: string;
    numero_nf: string;
    cliente: string;
    vendedor: string;
    valor_original: number;
    valor_pago: number;
    saldo_aberto: number;
    data_emissao: string;
    data_vencimento: string;
    status: ReceivableStatus;
    historico_baixas: BaixaRecibivel[];
    observacao?: string;
}

export type ReceivableStatus = 'ABERTA' | 'VENCIDA' | 'PARCIAL' | 'PAGA' | 'CANCELADA';

export interface BaixaRecibivel {
    id: string;
    data_pagamento: string;
    valor_pago: number;
    forma_pagamento: string;
    observacao: string;
    usuario: string;
}

export interface ReceivablesSummary {
    totalAberto: number;
    receberHoje: number;
    receber7Dias: number;
    receber30Dias: number;
    totalVencido: number;
    recebidoPeriodo: number;
    aging: {
        ate30: number;
        ate60: number;
        ate90: number;
        mais90: number;
    };
}

// --- CLOSING TYPES ---
export interface FechamentoMensal {
    id: string;
    periodo: string; // YYYY-MM
    status: StatusFechamento;
    etapas: EtapasFechamento;
    timeline: ClosingEvent[];
    resumoConsolidado?: FechamentoPreview;
    metadata: {
        criadoEm: string;
        atualizadoEm: string;
        fechadoEm?: string | null;
        usuario?: string;
    };
}

export type StatusFechamento = 'EM_ANDAMENTO' | 'EM_CONFERENCIA' | 'FECHADO';

export interface EtapasFechamento {
    movimentoImportado: boolean;
    notasImportadas: boolean;
    conciliado: boolean;
    divergenciasResolvidas: boolean;
    comissaoCalculada: boolean;
    validado: boolean;
}

export interface ClosingEvent {
    id: string;
    timestamp: string;
    type: ClosingEventType;
    user: string;
    description: string;
    metadata?: any;
}

export type ClosingEventType = 'IMPORT' | 'CONCILIATION' | 'DIVERGENCE' | 'COMMISSION' | 'VALIDATION' | 'CLOSE' | 'REOPEN' | 'ALERT';

export interface FechamentoPreview {
    periodo: string;
    geradoEm: string;
    metadata: any;
    totais: {
        vendasBrutas: number;
        devolucoes: number;
        despesas: number;
        liquido: number;
        comissaoTotal: number;
    };
    detalheVendedores: any[];
    alertasBloqueantes: string[];
}

export interface ChecklistItem {
    id: string;
    label: string;
    status: 'OK' | 'WARNING' | 'BLOCKED';
    message: string;
    block: 'IMPORTACAO' | 'CONSISTENCIA' | 'REGRAS';
}

export interface ClosingDecision {
    id: string;
    fechamentoId: string;
    divergenceId: string;
    tipoDivergencia: string;
    acaoEscolhida: string;
    usuario: string;
    observacao: string;
    timestamp: string;
}

export type DivergenceType = 
  | 'VENDEDOR_DIVERGENTE' 
  | 'DATA_DIVERGENTE' 
  | 'DEVOLUCAO_SEM_REFERENCIA' 
  | 'MOVIMENTO_COM_NF_SEM_XML' 
  | 'NF_PAGA_SEM_XML' 
  | 'NF_CANCELADA_COM_MOVIMENTO' 
  | 'XML_SEM_MOVIMENTO' 
  | 'OUTROS';

// --- CONFIG / MISC TYPES ---
export interface AppFeatureFlags {
    feature_whatsapp_enabled: boolean;
    feature_email_enabled: boolean;
    feature_serasa_enabled: boolean;
    feature_banking_enabled: boolean;
}

export interface CollectionSuggestion {
    canal: 'WHATSAPP' | 'EMAIL';
    mensagem: string;
    destinatario: string;
    contexto: string;
}

export interface CustomerRiskScore {
    score: number;
    label: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
    motivo: string;
    fonte: 'INTERNA' | 'SERASA_API';
    lastUpdate: string;
}

export interface HistoricalEvent {
    id: string;
    type: 'VENDA_HISTORICA';
    data: string;
    clienteDoc: string;
    clienteNome: string;
    valor: number;
    itens: any[];
    origemArquivo: string;
    importedAt: string;
}

export interface Vendedor {
    id: string;
    nome: string;
    codigo: string;
    percentualComissao: number;
    ativo: boolean;
    criadoEm: string;
}

export interface AuditLog {
    id: string;
    timestamp: string;
    usuario: string;
    modulo: string;
    acao: string;
    entidadeId: string;
    detalhes: string;
}
