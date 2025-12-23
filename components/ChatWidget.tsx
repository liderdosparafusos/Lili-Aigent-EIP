
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, DollarSign, Lock, Printer, Mail, BarChart2, User, Box, ShieldCheck, AlertTriangle, Activity, HandCoins } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { gerarRelatorioPDF } from '../services/closing';
import { auth } from '../services/firebase';

interface ChatWidgetProps {
  data: any; 
  mode: 'SALES' | 'PAYMENT' | 'DAILY_MOVEMENT' | 'CLOSING' | 'COMMERCIAL_DASHBOARD' | 'PRODUCT_CATALOG' | 'RECEIVABLES';
  defaultOpen?: boolean;
  onClose?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  actions?: {
      label: string;
      type: 'DOWNLOAD_PDF' | 'CONFIRM_SEND';
      payload?: any;
  }[];
}

const safeStringify = (obj: any) => {
  const seen = new WeakSet();
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Ref]';
      seen.add(value);
    }
    if (Array.isArray(value) && value.length > 50) {
        return value.slice(0, 50); 
    }
    return value;
  }));
};

const ChatWidget: React.FC<ChatWidgetProps> = ({ data, mode, defaultOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (defaultOpen !== undefined) setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const handleClose = () => {
      setIsOpen(false);
      if (onClose) onClose();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
      if (messages.length === 0) {
          let initText = "Olá. Sou seu Analista Financeiro EIP. Como posso ajudar com a gestão de recebíveis hoje?";
          
          if (mode === 'RECEIVABLES') {
              initText = "Estou analisando sua carteira de **Contas a Receber**. Posso identificar as prioridades de cobrança hoje, alertar sobre riscos de inadimplência ou detalhar clientes com múltiplos atrasos.";
          } else if (mode === 'PRODUCT_CATALOG') {
              initText = "Estou analisando o Catálogo Mestre. Posso sugerir reajustes de preços ou analisar margens.";
          } else if (mode === 'CLOSING') {
              initText = "Estou monitorando o Fechamento Mensal. Posso auditar os números ou explicar divergências.";
          }

          setMessages([{ id: 'init', role: 'model', text: initText }]);
      }
  }, [mode]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const contextData = safeStringify(data);

      // --- SYSTEM PROMPT: ANALISTA FINANCEIRO SÊNIOR ---
      const systemPrompt = `
        VOCÊ É O ANALISTA FINANCEIRO SÊNIOR DO SISTEMA EIP (LILI AIGENT).
        SEU PAPEL É MONITORAR, ANALISAR, PRIORIZAR E ALERTAR SOBRE CONTAS A RECEBER.

        DIRETRIZES DE PERSONA:
        - Profissional, direto, analítico e focado em liquidez.
        - Linguagem clara: evite jargões técnicos complexos se não forem necessários.
        - Você não executa baixas ou altera dados. Você apenas orienta e explica.
        - Foco EXCLUSIVO em dados de CONTAS A RECEBER.

        REGRAS DE RESPOSTA (BLOCOS):
        Sempre que for listar notas ou alertas, use obrigatoriamente este formato de blocos:
        1. 📌 **Prioridade**: [MÁXIMA | ALTA | MÉDIA]
        2. 📄 **Nota / Cliente**: [NF XXX / Nome do Cliente]
        3. 💰 **Valor**: [R$ XXX,XX]
        4. 📅 **Situação**: [Vence hoje | Vencida há X dias | Vence em X dias]
        5. ⚠️ **Motivo do Alerta**: [Explicação clara do porquê este item merece atenção]
        6. 👉 **Sugestão de Ação**: [O que o financeiro deve fazer agora]

        CONTEXTO ATUAL (JSON):
        ${contextData}

        INSTRUÇÕES ESPECÍFICAS PARA PERGUNTAS COMUNS:
        - "O que cobrar hoje?": Liste primeiro as notas que vencem hoje e as vencidas há mais tempo (>5 dias).
        - "Quem está mais atrasado?": Identifique clientes com o maior saldo vencido acumulado ou maior tempo de atraso.
        - "Riscos?": Alerte sobre clientes com múltiplas notas em aberto ou concentrações de saldo > 20% da carteira.
      `;

      // Use gemini-3-flash-preview for basic text and reasoning tasks
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            { role: 'user', parts: [{ text: systemPrompt + `\n\nUSUÁRIO PERGUNTA: ${userText}` }] }
        ]
      });

      const text = response.text || "Não consegui processar a análise no momento.";
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text }]);

    } catch (error) {
      console.error("Agent Error:", error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: "Ocorreu um erro na minha conexão neural financeira. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  let themeColor = 'cyan';
  let Icon = Sparkles;

  if (mode === 'RECEIVABLES') { themeColor = 'indigo'; Icon = HandCoins; }
  else if (mode === 'PRODUCT_CATALOG') { themeColor = 'blue'; Icon = Box; }
  else if (mode === 'CLOSING') { themeColor = 'indigo'; Icon = Lock; }
  else if (mode === 'SALES') { themeColor = 'emerald'; Icon = User; }

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end font-sans">
      {isOpen && (
        <div className={`mb-4 w-[350px] md:w-[450px] h-[600px] bg-slate-950 border border-${themeColor}-500/50 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]`}>
          
          <div className={`bg-${themeColor}-900/40 p-4 border-b border-${themeColor}-500/30 flex justify-between items-center backdrop-blur-md`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${themeColor}-500/20 rounded-lg border border-${themeColor}-500/30`}>
                  <Icon className={`w-5 h-5 text-${themeColor}-400`} />
              </div>
              <div>
                <h3 className="text-white font-bold font-orbitron text-sm">Analista Sênior EIP</h3>
                <p className={`text-${themeColor}-400 text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1`}>
                    <ShieldCheck className="w-3 h-3" /> Monitoramento Financeiro
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[92%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? `bg-${themeColor}-600 text-white rounded-br-none` 
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                }`}>
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className={`mb-1 last:mb-0 min-h-[1rem] ${line.startsWith('📌') || line.startsWith('📄') ? 'font-bold mt-2 border-l-2 pl-2 border-slate-600' : ''}`}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
               <div className="flex justify-start">
                 <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none p-4 flex gap-1.5 shadow-sm">
                    <div className={`w-2 h-2 bg-${themeColor}-500 rounded-full animate-bounce`}></div>
                    <div className={`w-2 h-2 bg-${themeColor}-500 rounded-full animate-bounce delay-75`}></div>
                    <div className={`w-2 h-2 bg-${themeColor}-500 rounded-full animate-bounce delay-150`}></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Pergunte: 'O que cobrar hoje?'"
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-4 text-sm text-white focus:outline-none focus:border-${themeColor}-500 focus:ring-1 focus:ring-${themeColor}-500/50 transition-all shadow-inner`}
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`absolute right-2 top-2.5 p-1.5 bg-${themeColor}-600 rounded-lg text-white hover:bg-${themeColor}-500 disabled:opacity-50 transition-all`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[9px] text-slate-600 text-center mt-2 uppercase font-bold tracking-tighter">O agente não altera valores. Apenas analisa e orienta.</p>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group ${
            isOpen ? 'bg-slate-700 text-slate-300' : `bg-gradient-to-br from-${themeColor}-600 to-${themeColor}-800 text-white shadow-${themeColor}-500/30 border border-${themeColor}-400/30`
        }`}
      >
        {isOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
      </button>
    </div>
  );
};

export default ChatWidget;
