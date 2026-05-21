import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/authContext';
import { 
  initialInventory, 
  initialPlants, 
  generateBusinessAssistantResponse 
} from '../../shared/mockData';
import { 
  Send, 
  Bot, 
  HelpCircle,
  Database
} from 'lucide-react';

interface InternalMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  dataTable?: any[];
  dataChart?: any[];
}

export const BusinessAssistantView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [messages, setMessages] = useState<InternalMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `¡Hola ${user?.name}! Soy tu Asistente de IA Empresarial para CalMiranda. Puedo ayudarte a consultar el stock del inventario de cal, los reportes de producción de las plantas en tiempo real y el histórico de facturación. ¿Qué te gustaría consultar hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Añadir mensaje del usuario
    const userMsg: InternalMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: queryText,
      timestamp: timeString
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simular procesamiento del modelo local
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generar respuesta simulada
    const response = generateBusinessAssistantResponse(queryText, initialInventory, initialPlants);
    
    // Manejar caso específico para empleados en finanzas
    let responseText = response.text;
    let responseTable = response.dataTable;
    let responseChart = response.dataChart;

    if (!isAdmin && (queryText.toLowerCase().includes('venta') || queryText.toLowerCase().includes('ingreso') || queryText.toLowerCase().includes('dinero') || queryText.toLowerCase().includes('usd'))) {
      responseText = '⚠️ **ACCESO DENEGADO:** Tu cuenta de empleado no tiene permisos para ver datos financieros consolidados en USD. Si deseas consultar el volumen de ventas físico en toneladas, puedes preguntar por: *"Volumen vendido"*';
      responseTable = undefined;
      responseChart = undefined;
    }

    const assistantMsg: InternalMessage = {
      id: Math.random().toString(),
      sender: 'assistant',
      text: responseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dataTable: responseTable,
      dataChart: responseChart
    };

    setMessages(prev => [...prev, assistantMsg]);
    setIsTyping(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(inputValue);
  };

  const quickPrompts = [
    { label: '📦 Ver inventario completo', query: 'Ver inventario general' },
    { label: '🏭 Producción en Guatire', query: 'Producción de la planta Guatire' },
    { label: '📊 Ventas del año', query: 'Mostrar reporte de ventas' },
    { label: '📜 Normativa franquicias', query: 'Requisitos de franquicias' }
  ];

  return (
    <div className="flex-1 flex flex-col glass rounded-3xl border border-white/5 overflow-hidden h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] animate-fade-in shrink-0">
      
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cal-gold/10 border border-cal-gold/20 flex items-center justify-center text-cal-gold shrink-0">
            <Bot size={22} className="animate-pulse" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white leading-tight">
              Asistente IA Corporativo
            </h4>
            <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
              <Database size={10} />
              Acceso a Postgres & Modelos de Negocio
            </span>
          </div>
        </div>
        
        <span className="text-[10px] bg-cal-gold/10 border border-cal-gold/20 text-cal-gold-light px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
          Procesos CalMiranda
        </span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
        
        {messages.map((msg) => {
          const isAssistant = msg.sender === 'assistant';

          return (
            <div 
              key={msg.id} 
              className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[85%] flex flex-col gap-1.5`}>
                
                {/* Sender Indicator */}
                <span className="text-[10px] text-gray-500 font-semibold px-1">
                  {isAssistant ? 'Asistente de Procesos (IA)' : `Usuario (${user?.name})`}
                </span>

                {/* Main Message Bubble */}
                <div className={`rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-lg ${
                  isAssistant 
                    ? 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-none' 
                    : 'bg-cal-emerald text-white rounded-tr-none'
                }`}>
                  
                  {/* Text */}
                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                  {/* Render dynamic dataTable if present */}
                  {msg.dataTable && (
                    <div className="mt-4 border border-white/5 rounded-2xl overflow-hidden bg-black/20 max-w-full">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/5 text-gray-400 font-bold">
                              {Object.keys(msg.dataTable[0]).map((key) => (
                                <th key={key} className="py-2.5 px-3">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-gray-300 font-medium">
                            {msg.dataTable.map((row, i) => (
                              <tr key={i} className="hover:bg-white/5">
                                {Object.values(row).map((val: any, j) => (
                                  <td key={j} className="py-2.5 px-3">
                                    {typeof val === 'string' && val.includes('Bajo Stock') ? (
                                      <span className="text-cal-gold-light font-bold">{val}</span>
                                    ) : (
                                      val
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Render dynamic dataChart (salesHistory) if present */}
                  {msg.dataChart && (
                    <div className="mt-5 p-4 border border-white/5 rounded-2xl bg-black/20 flex flex-col gap-3">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                        Gráfico de Ventas Mensuales (USD)
                      </span>
                      <div className="flex items-end justify-between gap-2 h-32 pt-4 px-2">
                        {msg.dataChart.map((s, i) => {
                          const maxVal = Math.max(...msg.dataChart!.map(x => x.sales));
                          const heightPct = `${Math.round((s.sales / maxVal) * 100)}%`;

                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                              <span className="text-[8px] font-bold text-cal-emerald-light opacity-0 group-hover:opacity-100 transition-opacity">
                                ${Math.round(s.sales / 1000)}k
                              </span>
                              <div className="w-full bg-white/10 rounded-t-lg overflow-hidden h-full flex items-end">
                                <div 
                                  className="w-full bg-cal-emerald hover:bg-cal-emerald-light rounded-t-lg transition-all duration-500 shadow-lg shadow-cal-emerald/20" 
                                  style={{ height: heightPct }}
                                />
                              </div>
                              <span className="text-[9px] text-gray-500 font-mono">{s.month}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Indicator */}
                <span className="text-[9px] text-gray-600 font-mono px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-gray-500 font-semibold px-1">
                Asistente de Procesos (IA)
              </span>
              <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-5 py-4 flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Panel */}
      <div className="px-4 py-3 border-t border-white/5 bg-white/[0.01] flex flex-wrap gap-2 shrink-0">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1 w-full mb-1">
          <HelpCircle size={10} />
          Consultas rápidas:
        </span>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleQuery(prompt.query)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-cal-emerald/10 border border-white/5 hover:border-cal-emerald/30 text-xs text-gray-300 hover:text-cal-emerald-light transition-all duration-300 cursor-pointer"
          >
            {prompt.label}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div className="p-4 border-t border-white/5 bg-white/[0.02] shrink-0">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Pregunta sobre stock, producción o ventas de CalMiranda..."
            className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald transition-all duration-300"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="w-12 h-12 flex-shrink-0 bg-cal-emerald text-white rounded-2xl flex items-center justify-center transition-colors hover:bg-cal-emerald-light disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={18} className="translate-x-px" />
          </button>
        </form>
      </div>
    </div>
  );
};
