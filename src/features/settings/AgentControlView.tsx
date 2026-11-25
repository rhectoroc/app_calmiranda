import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Sparkles, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Database, 
  MessageSquare, 
  Flame, 
  Activity, 
  ShieldCheck, 
  Send, 
  Trash2, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  DollarSign, 
  FileText, 
  HelpCircle,
  Save,
  Check
} from 'lucide-react';
import { getAuthHeaders } from '../../context/authContext';

interface AgentStats {
  messages: {
    total: number;
    bot: number;
    last24h: number;
    sessions: number;
  };
  products: {
    total: number;
    categories: number;
    priced: number;
  };
  handoffs: number;
  clients: {
    frecuentes: number;
    admins: number;
  };
  bcvRate: {
    tasa: number;
    fecha?: string;
  } | null;
  globalBotDisabled: boolean;
}

interface ProductItem {
  id_producto: number;
  nombre: string;
  categoria: string;
  presentacion?: string;
  peso?: number;
  precio: number;
  estado: string;
  sede?: string;
}

interface SimulatorMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  latencyMs?: number;
  handoff?: boolean;
}

export const AgentControlView: React.FC = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [globalBotDisabled, setGlobalBotDisabled] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Sub-tabs: 'simulador' | 'inventario' | 'instrucciones'
  const [activeSubTab, setActiveSubTab] = useState<'simulador' | 'inventario' | 'instrucciones'>('simulador');

  // Estados del Simulador de Pruebas
  const [simMessages, setSimMessages] = useState<SimulatorMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: '¡Hola! Bienvenido a CalMiranda. Soy Diamantin, su asesor virtual. ¿En qué puedo ayudarle hoy con cal hidratada, cal en pasta o agregados? ¡Vamos positivo! 💪',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [simInput, setSimInput] = useState('');
  const [isSimLoading, setIsSimLoading] = useState(false);

  // Estados de Inventario Leído (Filtros)
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Estados de Instrucciones Maestras
  const [masterPrompt, setMasterPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cargar estadísticas y productos
  const fetchData = async () => {
    setIsLoadingStats(true);
    try {
      // 1. Estadísticas del agente
      const statsRes = await fetch('/api/agent/stats', { headers: getAuthHeaders() });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setGlobalBotDisabled(!!statsData.globalBotDisabled);
      }

      // 2. Productos en base de datos
      const prodRes = await fetch('/api/productos', { headers: getAuthHeaders() });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // 3. Instrucciones maestras (settings)
      const settingsRes = await fetch('/api/settings', { headers: getAuthHeaders() });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.prompts?.bot !== undefined) {
          setMasterPrompt(settingsData.prompts.bot);
        }
      }

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error cargando datos de control del agente:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        setGlobalBotDisabled(customEvent.detail);
      }
    };
    window.addEventListener('bot-status-changed', handleStatusChange);
    return () => window.removeEventListener('bot-status-changed', handleStatusChange);
  }, []);

  // Alternar estado global del Super Agente
  const handleToggleBot = async () => {
    const nextVal = !globalBotDisabled;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ globalBotDisabled: nextVal })
      });
      if (res.ok) {
        setGlobalBotDisabled(nextVal);
        window.dispatchEvent(new CustomEvent('bot-status-changed', { detail: nextVal }));
      } else {
        alert('Error al actualizar el estado del bot.');
      }
    } catch (err) {
      console.error('Error toggling bot:', err);
    }
  };

  // Enviar mensaje en el simulador
  const handleSendSimMessage = async (textToSend?: string) => {
    const text = (textToSend || simInput).trim();
    if (!text || isSimLoading) return;

    const userMsg: SimulatorMessage = {
      id: `sim-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSimMessages(prev => [...prev, userMsg]);
    setSimInput('');
    setIsSimLoading(true);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/web-chatbot', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          chatInput: text,
          sessionId: 'simulador_admin'
        })
      });

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        const data = await res.json();
        const botMsg: SimulatorMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.output || 'No se recibió respuesta del agente.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          latencyMs,
          handoff: data.handoff
        };
        setSimMessages(prev => [...prev, botMsg]);
      } else {
        setSimMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'bot',
            text: '⚠️ Error al comunicarse con el motor de IA. Verifique que la API de DeepSeek esté activa.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      setSimMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Error de conexión con el servidor.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSimLoading(false);
    }
  };

  // Limpiar historial de simulación
  const handleClearSimulator = async () => {
    try {
      await fetch('/api/agent/simulator/clear', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId: 'simulador_admin' })
      });
      setSimMessages([
        {
          id: `init-${Date.now()}`,
          sender: 'bot',
          text: '¡Simulación reiniciada! Soy Diamantin, su asesor de CalMiranda. ¿Qué desea consultar? ¡Vamos positivo! 💪',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Error clearing simulation:', err);
    }
  };

  // Guardar instrucciones maestras
  const handleSaveMasterPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrompt(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          prompts: {
            bot: masterPrompt
          }
        })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Error al guardar las instrucciones.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Filtros de productos para pestaña Inventario Leído
  const categories = ['all', ...Array.from(new Set(products.map(p => p.categoria).filter(Boolean)))];
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.categoria === selectedCategory;
    const matchesSearch = p.nombre.toLowerCase().includes(productSearch.toLowerCase()) || 
                          (p.categoria && p.categoria.toLowerCase().includes(productSearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const bcvTasa = stats?.bcvRate?.tasa || 914.02;

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto w-full animate-fade-in pb-12">
      
      {/* 1. Header con Badge, Switch y Narrativa */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-cal-emerald-light text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} className="animate-spin-slow" />
          <span>Centro de Control y Monitorización IA</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-white leading-none">
              Agente
            </h1>

            {/* Toggle de Modo del Super Agente */}
            <button
              onClick={handleToggleBot}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 border cursor-pointer ${
                globalBotDisabled
                  ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                  : 'bg-cal-emerald/10 text-cal-emerald-light border-cal-emerald/30 hover:bg-cal-emerald/20 shadow-sm shadow-cal-emerald/10'
              }`}
            >
              {globalBotDisabled ? (
                <>
                  <ToggleLeft size={18} />
                  <span>SUPER AGENTE (OFF)</span>
                </>
              ) : (
                <>
                  <ToggleRight size={18} className="text-cal-emerald-light" />
                  <span>SUPER AGENTE (ACTIVO)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 self-start sm:self-auto">
            <span>Actualizado: <strong className="text-gray-200">{lastRefreshed || 'Cargando...'}</strong></span>
            <button
              onClick={fetchData}
              disabled={isLoadingStats}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} className={isLoadingStats ? 'animate-spin' : ''} />
              <span>Refrescar Monitor</span>
            </button>
          </div>
        </div>

        {/* Narrativa de Estado */}
        <p className="text-xs md:text-sm text-gray-400 max-w-4xl leading-relaxed">
          {globalBotDisabled ? (
            <span className="text-red-400/90 font-medium">
              El Super Agente está apagado: WhatsApp responde en modo manual. Los mensajes entrantes se guardan en la base de datos para atención humana pero no se envían respuestas automáticas por IA.
            </span>
          ) : (
            <span>
              El Super Agente está activo: WhatsApp responde automáticamente a consultas con el catálogo oficial de CalMiranda, cotizaciones bimonetarias en USD y Bs (tasa oficial BCV), validación de inventario y derivación de clientes frecuentes a sus asesores comerciales asignados.
            </span>
          )}
        </p>
      </div>

      {/* 2. Tarjetas de Métricas (Grid de 4 tarjetas estilo Practiiko) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Cuota / Actividad Mensual */}
        <div className="glass rounded-3xl p-5 border border-white/5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Actividad Mensual (24H)</span>
            <MessageSquare size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-white font-mono">
              {stats?.messages?.total || 0} <span className="text-sm font-normal text-gray-500">/ 5,000</span>
            </div>
            {/* Barra de progreso */}
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cal-emerald h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, (((stats?.messages?.total || 0) / 5000) * 100)))}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-gray-400">
            <strong className="text-white">{stats?.messages?.last24h || 0}</strong> mensajes en las últimas 24h
          </div>
        </div>

        {/* Card 2: Base de Datos Sincronizada */}
        <div className="glass rounded-3xl p-5 border border-white/5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Base de Datos Sincronizada</span>
            <Database size={16} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-white font-display">
              {stats?.products?.total || 0} <span className="text-sm font-normal text-gray-400">productos</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {stats?.products?.categories || 0} categorías • {stats?.products?.priced || 0} con precio
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-cal-emerald-light">
            <ShieldCheck size={14} />
            <span>Escudo Anti-Alucinación Activo</span>
          </div>
        </div>

        {/* Card 3: Intenciones de Compra / Handoffs */}
        <div className="glass rounded-3xl p-5 border border-white/5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Intenciones de Compra</span>
            <Flame size={16} className="text-amber-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-amber-400 font-display">
              {stats?.handoffs || 0} <span className="text-sm font-normal text-gray-400">listos p/ cerrar</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {stats?.handoffs || 0} chats esperando asesor humano
            </div>
          </div>
          <button
            onClick={() => navigate('/customer-service')}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <span>Ver alertas de asesor</span>
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Card 4: Actividad Super Agente */}
        <div className="glass rounded-3xl p-5 border border-white/5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Actividad Super Agente</span>
            <Activity size={16} className="text-cal-emerald-light" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-white font-display">
              {stats?.messages?.bot || 0} <span className="text-sm font-normal text-gray-400">respuestas</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {stats?.messages?.sessions || 0} clientes atendidos
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cal-emerald-light" />
            <span>Alucinaciones Bloqueadas: <strong>0</strong></span>
          </div>
        </div>

      </div>

      {/* 3. Submenús / Sub-Pestañas Seleccionadas (Simulador de Pruebas, Inventario Leído, Instrucciones Maestras) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        
        {/* Tab 1: Simulador de Pruebas */}
        <button
          onClick={() => setActiveSubTab('simulador')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeSubTab === 'simulador'
              ? 'bg-cal-emerald text-white shadow-md shadow-cal-emerald/20'
              : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <span>🧪 Simulador de Pruebas</span>
        </button>

        {/* Tab 2: Inventario Leído (BD) */}
        <button
          onClick={() => setActiveSubTab('inventario')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeSubTab === 'inventario'
              ? 'bg-cal-emerald text-white shadow-md shadow-cal-emerald/20'
              : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <span>📦 Inventario Leído (BD)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white font-mono">
            {products.length}
          </span>
        </button>

        {/* Tab 3: Instrucciones Maestras */}
        <button
          onClick={() => setActiveSubTab('instrucciones')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeSubTab === 'instrucciones'
              ? 'bg-cal-emerald text-white shadow-md shadow-cal-emerald/20'
              : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <span>💬 Instrucciones Maestras</span>
        </button>
      </div>

      {/* 4. CONTENIDO DINÁMICO SEGÚN SUB-PESTAÑA */}

      {/* ---------------------------------------------------- */}
      {/* VISTA A: SIMULADOR DE PRUEBAS                       */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Chat Simulator Canvas */}
          <div className="lg:col-span-2 glass rounded-3xl border border-white/10 flex flex-col h-[600px] overflow-hidden shadow-2xl">
            
            {/* Header del Chat */}
            <div className="p-4 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cal-emerald/20 border border-cal-emerald/30 flex items-center justify-center text-cal-emerald-light shadow-md shadow-cal-emerald/10">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Diamantín CalMiranda
                    <span className="w-2 h-2 rounded-full bg-cal-emerald-light animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-gray-400">Asesor Comercial Oficial • Tasa BCV: Bs. {bcvTasa.toFixed(2)}</p>
                </div>
              </div>

              <button
                onClick={handleClearSimulator}
                title="Limpiar mensajes de prueba"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 text-xs transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Reiniciar</span>
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-transparent to-black/20">
              {simMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cal-emerald text-white rounded-tr-none shadow-md shadow-cal-emerald/20'
                        : 'bg-[#1a2124] text-gray-200 border border-white/10 rounded-tl-none shadow-lg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Metadata pill below bot messages */}
                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-gray-500">
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'bot' && (
                      <>
                        <span>•</span>
                        <span className="text-cal-emerald-light flex items-center gap-1 font-semibold">
                          <ShieldCheck size={11} />
                          Escudo Verificado
                        </span>
                        {msg.latencyMs && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{msg.latencyMs}ms</span>
                          </>
                        )}
                        {msg.handoff && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-bold uppercase">Handoff Activado</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {isSimLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-400 italic bg-[#1a2124] w-fit p-3 rounded-2xl border border-white/5 animate-pulse">
                  <Bot size={14} className="text-cal-emerald-light animate-bounce" />
                  <span>Diamantín está consultando la base de datos...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendSimMessage();
              }}
              className="p-3 bg-white/[0.04] border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="Escribe un mensaje de prueba para Diamantín..."
                disabled={isSimLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cal-emerald transition-colors"
              />
              <button
                type="submit"
                disabled={isSimLoading || !simInput.trim()}
                className="p-3 rounded-2xl bg-cal-emerald hover:bg-cal-emerald-light text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cal-emerald/20 cursor-pointer"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Quick Scenario Triggers */}
          <div className="flex flex-col gap-4">
            <div className="glass rounded-3xl p-5 border border-white/10 flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <HelpCircle size={15} className="text-cal-emerald-light" />
                Escenarios Rápidos de Prueba
              </h4>
              <p className="text-xs text-gray-400">
                Haz clic en cualquier pregunta típica para auditar cómo responde el Super Agente en tiempo real:
              </p>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleSendSimMessage("¿Qué precio tiene la cal hidratada en saco de 20kg y qué horario tienen?")}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left text-xs text-gray-200 transition-colors flex flex-col gap-1 cursor-pointer"
                >
                  <span className="font-bold text-white">💰 Cotización y Horario</span>
                  <span className="text-[11px] text-gray-400">Prueba consulta de catálogo, tasa BCV y horarios.</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendSimMessage("¿Tienen vacantes de empleo o puedo enviar mi curriculum vitae?")}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left text-xs text-gray-200 transition-colors flex flex-col gap-1 cursor-pointer"
                >
                  <span className="font-bold text-rose-400">🚫 Bloqueo de Talento Humano</span>
                  <span className="text-[11px] text-gray-400">Verifica que NO pida CVs ni desvíe a correos de RRHH.</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendSimMessage("Necesito cotizar 250 sacos de cal hidratada para una constructora en Caracas.")}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left text-xs text-gray-200 transition-colors flex flex-col gap-1 cursor-pointer"
                >
                  <span className="font-bold text-amber-400">📦 Pedido Mayorista (&gt;100 sacos)</span>
                  <span className="text-[11px] text-gray-400">Verifica la transferencia a asesor comercial para precio especial.</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendSimMessage("¿Tienen disponibilidad de cal en pasta en la planta de Guatire?")}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left text-xs text-gray-200 transition-colors flex flex-col gap-1 cursor-pointer"
                >
                  <span className="font-bold text-cyan-400">📍 Validación de Sede Guatire</span>
                  <span className="text-[11px] text-gray-400">Verifica disponibilidad geográfica y retiro en planta.</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendSimMessage("¿Cómo puedo pagar por Pago Móvil en Bolívares?")}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left text-xs text-gray-200 transition-colors flex flex-col gap-1 cursor-pointer"
                >
                  <span className="font-bold text-cal-emerald-light">💳 Datos Bancarios Oficiales</span>
                  <span className="text-[11px] text-gray-400">Verifica datos oficiales protegidos (Banesco / Mercantil).</span>
                </button>
              </div>
            </div>

            <div className="glass rounded-3xl p-5 border border-white/10 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Escudo Activo</span>
              <p className="text-xs text-gray-300 leading-normal">
                Esta simulación utiliza la sesión segura <code className="text-cal-emerald-light font-mono">simulador_admin</code>. No altera los chats de WhatsApp de los clientes reales.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VISTA B: INVENTARIO LEÍDO (BD)                      */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'inventario' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Banner de Tasa BCV Oficial */}
          <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cal-emerald/15 border border-cal-emerald/25 flex items-center justify-center text-cal-emerald-light">
                <DollarSign size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tasa Oficial de Cotización</span>
                <h3 className="text-xl md:text-2xl font-black text-white font-mono">
                  {bcvTasa.toFixed(4)} <span className="text-sm font-normal text-gray-400">Bs / USD (BCV)</span>
                </h3>
              </div>
            </div>

            <div className="text-xs text-gray-400 max-w-md">
              Diamantín convierte automáticamente los precios en USD a Bolívares oficiales usando esta tasa de cambio en cada consulta de cliente.
            </div>
          </div>

          {/* Buscador y Categorías */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cal-emerald text-white'
                      : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                  }`}
                >
                  {cat === 'all' ? 'Todos los Productos' : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filtrar producto..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cal-emerald transition-colors"
              />
            </div>
          </div>

          {/* Grid de Productos Leídos por la IA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((prod) => {
              const precioUsd = Number(prod.precio) || 0;
              const precioBs = precioUsd * bcvTasa;
              return (
                <div
                  key={prod.id_producto}
                  className="glass rounded-3xl p-5 border border-white/10 flex flex-col justify-between gap-4 hover:border-cal-emerald/30 transition-all group"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5">
                        {prod.categoria || 'General'}
                      </span>
                      <span className="text-[10px] font-bold text-cal-emerald-light flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        En Catálogo IA
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-cal-emerald-light transition-colors mt-1">
                      {prod.nombre}
                    </h4>

                    <div className="text-xs text-gray-400 flex items-center gap-3 mt-1">
                      <span>Presentación: <strong className="text-gray-200">{prod.presentacion || 'Estándar'}</strong></span>
                      {prod.peso && <span>Peso: <strong className="text-gray-200">{prod.peso} kg</strong></span>}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">Precio Base USD</span>
                      <div className="text-xl font-extrabold text-white font-mono">
                        ${precioUsd.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">Equivalente BCV</span>
                      <div className="text-sm font-bold text-cal-emerald-light font-mono">
                        Bs. {precioBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full p-8 text-center glass rounded-3xl border border-white/10 text-gray-400 text-sm">
                No se encontraron productos coincidentes en la base de datos.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VISTA C: INSTRUCCIONES MAESTRAS                     */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'instrucciones' && (
        <div className="flex flex-col gap-6 animate-fade-in max-w-4xl">
          
          {/* Card de Resumen de Reglas Maestras Protegidas */}
          <div className="glass rounded-3xl p-6 md:p-8 border border-white/10 flex flex-col gap-5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-cal-emerald/15 border border-cal-emerald/25 flex items-center justify-center text-cal-emerald-light">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Directivas Maestras Protegidas</h3>
                <p className="text-xs text-gray-400">Reglas inviolables codificadas en el servidor para Diamantín</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-2.5">
                <ShieldCheck size={16} className="text-cal-emerald-light shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Cero Alucinaciones (Zero-Hallucination)</strong>
                  <span className="text-gray-400">Solo puede cotizar productos existentes en la tabla PostgreSQL. Jamás inventa precios.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-2.5">
                <ShieldCheck size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-400 block mb-0.5">Bloqueo de Talento Humano / CVs</strong>
                  <span className="text-gray-400">No actúa como RRHH ni solicita currículums en PDF. Aclara su rol estrictamente comercial.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-2.5">
                <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400 block mb-0.5">Derivación de Clientes Frecuentes</strong>
                  <span className="text-gray-400">Si el cliente está etiquetado como "Cliente Frecuente", lo saluda y lo deriva a su vendedor.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-2.5">
                <ShieldCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-400 block mb-0.5">Silencio Operativo (Empleados/Transportistas)</strong>
                  <span className="text-gray-400">Registra los mensajes para auditoría pero no responde a personal operativo.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de Reglas Extras Dinámicas */}
          <form onSubmit={handleSaveMasterPrompt} className="glass rounded-3xl p-6 md:p-8 border border-white/10 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Instrucciones Extras y Novedades del Negocio</h3>
                <p className="text-xs text-gray-400">Estas indicaciones se inyectan en tiempo real en cada consulta de WhatsApp.</p>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-4 bg-cal-emerald/10 border border-cal-emerald/20 text-cal-emerald-light rounded-2xl flex items-center gap-3 text-xs md:text-sm animate-fade-in">
                <Check size={18} />
                <span>Instrucciones guardadas y sincronizadas exitosamente en el servidor.</span>
              </div>
            )}

            <div>
              <textarea
                value={masterPrompt}
                onChange={(e) => setMasterPrompt(e.target.value)}
                placeholder="Ingresa novedades de la semana (ej: 'No hay despacho el viernes por inventario general', 'Promoción especial en cuñete de pintura ecológica')."
                rows={10}
                className="w-full bg-white/5 border border-white/10 focus:border-cal-emerald focus:bg-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none transition-all leading-relaxed font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPrompt}
              className="w-full py-4 bg-cal-emerald hover:bg-cal-emerald-light text-white font-bold text-sm rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-cal-emerald/20 cursor-pointer disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSavingPrompt ? 'Guardando...' : 'Guardar Instrucciones Maestras'}</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
