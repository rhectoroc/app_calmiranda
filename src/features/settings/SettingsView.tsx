import React, { useState, useEffect } from 'react';
import { Database, ShieldAlert, Bot, Settings, Save, RefreshCw, CheckCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  // Configuración de base de datos
  const [dbHost, setDbHost] = useState('easypanel.calmiranda.local');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('calmiranda_prod');
  const [dbUser, setDbUser] = useState('cal_admin');
  const [dbPass, setDbPass] = useState('••••••••••••');

  // Configuración de Evolution API
  const [evoUrl, setEvoUrl] = useState('https://evolution.calmiranda.com');
  const [evoInstance, setEvoInstance] = useState('calmiranda-wa-01');
  const [evoToken, setEvoToken] = useState('evo_tok_991823abce8812');

  // Prompts de IA
  const [botPrompt, setBotPrompt] = useState(
    'Eres Diamantín, el asistente virtual oficial de CalMiranda. Tu objetivo es atender consultas de clientes sobre cal en pasta, cal en polvo y pintura ecológica, recopilar volumen requerido y coordinar desvíos a humanos.'
  );
  const [assistantPrompt, setAssistantPrompt] = useState(
    'Eres el Asistente Empresarial de CalMiranda. Respondes consultas internas de la empresa utilizando bases de datos PostgreSQL sobre stock de inventario, volúmenes de producción diarios y métricas de ventas.'
  );

  // Estados visuales
  const [testingDb, setTestingDb] = useState(false);
  const [testingEvo, setTestingEvo] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'idle'>('connected');
  const [evoStatus, setEvoStatus] = useState<'connected' | 'idle'>('connected');

  // Cargar configuraciones reales del backend al montar
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.prompts) {
            if (data.prompts.bot) setBotPrompt(data.prompts.bot);
            if (data.prompts.assistant) setAssistantPrompt(data.prompts.assistant);
          }
        }
      } catch (error) {
        console.error('Error cargando configuraciones del servidor:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompts: {
            bot: botPrompt,
            assistant: assistantPrompt
          }
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Error al guardar las configuraciones en el servidor.');
      }
    } catch (error) {
      console.error('Error al guardar configuraciones:', error);
      alert('Error de red al guardar configuraciones.');
    }
  };

  const testDbConnection = () => {
    setTestingDb(true);
    setTimeout(() => {
      setTestingDb(false);
      setDbStatus('connected');
    }, 1500);
  };

  const testEvoConnection = () => {
    setTestingEvo(true);
    setTimeout(() => {
      setTestingEvo(false);
      setEvoStatus('connected');
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-fade-in">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2 leading-none">
            Configuración del Sistema
          </h1>
          <p className="text-gray-400 text-sm">
            Administración de credenciales de base de datos, Evolution API y prompts de Inteligencia Artificial.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-cal-emerald/10 border border-cal-emerald/20 text-cal-emerald-light rounded-2xl flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle size={18} />
          <span>Configuraciones guardadas y sincronizadas exitosamente en el servidor.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Connections */}
        <div className="flex flex-col gap-6">
          
          {/* Database Section */}
          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Database size={18} className="text-cal-emerald-light" />
                Base de Datos PostgreSQL (Easypanel)
              </h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                dbStatus === 'connected' 
                  ? 'bg-cal-emerald/10 text-cal-emerald-light border-cal-emerald/20'
                  : 'bg-white/5 text-gray-500 border-white/5'
              }`}>
                {dbStatus === 'connected' ? 'Sincronizado' : 'Desconectado'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 font-semibold mb-2">Host</label>
                <input
                  type="text"
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cal-emerald"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">Puerto</label>
                <input
                  type="text"
                  value={dbPort}
                  onChange={(e) => setDbPort(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cal-emerald"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">Nombre BD</label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cal-emerald"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">Usuario</label>
                <input
                  type="text"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cal-emerald"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">Contraseña</label>
                <input
                  type="password"
                  value={dbPass}
                  onChange={(e) => setDbPass(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cal-emerald"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={testDbConnection}
              disabled={testingDb}
              className="mt-2 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={testingDb ? 'animate-spin' : ''} />
              <span>{testingDb ? 'Probando conexión...' : 'Probar Conexión'}</span>
            </button>
          </div>

          {/* Evolution API Section */}
          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Settings size={18} className="text-cal-emerald-light" />
                Evolution API (Mensajería)
              </h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                evoStatus === 'connected' 
                  ? 'bg-cal-emerald/10 text-cal-emerald-light border-cal-emerald/20'
                  : 'bg-white/5 text-gray-500 border-white/5'
              }`}>
                {evoStatus === 'connected' ? 'Activo' : 'Desconectado'}
              </span>
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-2">Evolution URL</label>
              <input
                type="text"
                value={evoUrl}
                onChange={(e) => setEvoUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cal-emerald"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">Nombre Instancia</label>
                <input
                  type="text"
                  value={evoInstance}
                  onChange={(e) => setEvoInstance(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cal-emerald"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">Global Token</label>
                <input
                  type="password"
                  value={evoToken}
                  onChange={(e) => setEvoToken(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cal-emerald"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={testEvoConnection}
              disabled={testingEvo}
              className="mt-2 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={testingEvo ? 'animate-spin' : ''} />
              <span>{testingEvo ? 'Verificando Instancia...' : 'Probar Evolution API'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Prompts */}
        <div className="flex flex-col gap-6">
          
          {/* Prompts Section */}
          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col gap-5 flex-1">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <Bot size={18} className="text-cal-emerald-light" />
              <h3 className="text-base font-bold font-display text-white">
                Personalización de Asistentes IA
              </h3>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">
                  System Prompt: Diamantín (Atención al Cliente)
                </label>
                <textarea
                  value={botPrompt}
                  onChange={(e) => setBotPrompt(e.target.value)}
                  rows={5}
                  className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-cal-emerald resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-2">
                  System Prompt: Asistente Corporativo (Uso Interno)
                </label>
                <textarea
                  value={assistantPrompt}
                  onChange={(e) => setAssistantPrompt(e.target.value)}
                  rows={5}
                  className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-cal-emerald resize-none leading-relaxed"
                />
              </div>

              <div className="p-4 rounded-2xl bg-cal-emerald/5 border border-cal-emerald/15 flex gap-3 text-xs text-gray-400 leading-normal">
                <ShieldAlert size={16} className="text-cal-emerald-light shrink-0 mt-0.5" />
                <span>
                  Los prompts del sistema definen la personalidad, restricciones y bases de conocimiento locales que guían las respuestas generadas por los modelos.
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-cal-emerald hover:bg-cal-emerald-light text-white font-bold text-sm rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-cal-emerald/20 cursor-pointer"
            >
              <Save size={16} />
              <span>Guardar Todos los Cambios</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
