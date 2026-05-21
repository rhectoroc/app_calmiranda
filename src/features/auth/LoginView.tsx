import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor rellene todos los campos');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('Credenciales incorrectas. Verifique el usuario y contraseña.');
      }
    } catch (err) {
      setError('Ocurrió un error al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cal-dark bg-grid flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cal-emerald/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cal-earth/8 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md glass rounded-3xl shadow-2xl p-8 relative z-10 border border-white/10 glow-emerald/10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-cal-emerald/10 rounded-2xl border border-cal-emerald/30 text-cal-emerald mb-4 shadow-inner">
            <ShieldCheck size={36} className="animate-pulse" />
          </div>
          <h1 className="text-3.5xl font-extrabold font-display tracking-tight text-gradient mb-2">
            CalMiranda
          </h1>
          <p className="text-gray-400 text-sm">
            Gestión Operativa y Asistentes de IA
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-sm animate-shake">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                <User size={18} />
              </span>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: usuario@calmiranda.com"
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cal-emerald hover:bg-cal-emerald-dark active:bg-cal-emerald-dark text-white font-semibold rounded-2xl py-4 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cal-emerald/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>
      </div>

      {/* Debug Panel */}
      <div className="mt-6 p-4 glass rounded-2xl border border-white/5 text-xs text-gray-400 max-w-md w-full relative z-10">
        <p className="font-bold text-cal-emerald mb-1 flex items-center gap-1">
          <span>🛠️</span> Panel de Depuración (Frontend):
        </p>
        <div className="space-y-1 mt-2">
          <p><span className="text-gray-500">Usuario esperado:</span> <code className="bg-white/5 px-1.5 py-0.5 rounded text-white font-mono">rhectoroc@gmail.com</code></p>
          <p><span className="text-gray-500">Contraseña esperada:</span> <code className="bg-white/5 px-1.5 py-0.5 rounded text-white font-mono">987654321</code></p>
        </div>
        <p className="mt-3 text-[10px] text-gray-500 leading-relaxed border-t border-white/5 pt-2">
          Si ves este panel, significa que estás ejecutando la versión actualizada del código.
          Si no lo ves, tu navegador tiene en caché una versión antigua o no se ha reconstruido/desplegado en Easypanel.
        </p>
      </div>
    </div>
  );
};
