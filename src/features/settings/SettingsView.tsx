import React, { useState, useEffect } from 'react';
import { Bot, Save, CheckCircle, ShieldAlert } from 'lucide-react';

export const SettingsView: React.FC = () => {
  // Prompts de IA (se mantiene assistantPrompt en estado interno para persistencia)
  const [botPrompt, setBotPrompt] = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');

  // Estados visuales
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cargar configuraciones reales del backend al montar
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.prompts) {
            if (data.prompts.bot !== undefined) setBotPrompt(data.prompts.bot);
            if (data.prompts.assistant !== undefined) setAssistantPrompt(data.prompts.assistant);
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

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-3xl mx-auto w-full animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2 leading-none">
          Configuración del Asistente
        </h1>
        <p className="text-gray-400 text-sm">
          Administración de instrucciones y reglas de negocio del bot de atención al cliente Diamantín.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-cal-emerald/10 border border-cal-emerald/20 text-cal-emerald-light rounded-2xl flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle size={18} />
          <span>Configuraciones guardadas y sincronizadas exitosamente en el servidor.</span>
        </div>
      )}

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="glass rounded-3xl p-6 md:p-8 border border-white/5 flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Bot size={22} className="text-cal-emerald-light" />
          <h3 className="text-lg font-bold font-display text-white">
            Reglas de Diamantín (Atención al Cliente)
          </h3>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">
              Instrucciones y Reglas Extras (Tiempo Real)
            </label>
            <textarea
              value={botPrompt}
              onChange={(e) => setBotPrompt(e.target.value)}
              placeholder="Ingresa reglas de negocio, ofertas de la semana o novedades (ej: 'No hay stock de cal en pasta de 7kg esta semana', 'Cerraremos temprano este sábado por inventario')."
              rows={12}
              className="w-full bg-white/5 border border-white/5 focus:border-cal-emerald/55 focus:bg-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none transition-all leading-relaxed"
            />
          </div>

          <div className="p-4 rounded-2xl bg-cal-emerald/5 border border-cal-emerald/15 flex gap-3 text-xs text-gray-400 leading-normal">
            <ShieldAlert size={18} className="text-cal-emerald-light shrink-0 mt-0.5" />
            <span>
              La personalidad básica, el flujo principal y el catálogo base de Diamantín se encuentran protegidos en el servidor. Usa este espacio para agregar indicaciones especiales o condiciones dinámicas del negocio.
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-cal-emerald hover:bg-cal-emerald-light text-white font-bold text-sm rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-cal-emerald/20 cursor-pointer"
        >
          <Save size={16} />
          <span>Guardar Cambios</span>
        </button>
      </form>
    </div>
  );
};
