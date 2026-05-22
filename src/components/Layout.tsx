import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [botDisabled, setBotDisabled] = useState(false);

  useEffect(() => {
    const fetchBotStatus = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setBotDisabled(!!data.globalBotDisabled);
        }
      } catch (err) {
        console.error('Error fetching bot status:', err);
      }
    };
    fetchBotStatus();

    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        setBotDisabled(customEvent.detail);
      }
    };
    window.addEventListener('bot-status-changed', handleStatusChange);
    return () => window.removeEventListener('bot-status-changed', handleStatusChange);
  }, []);

  const toggleBot = async () => {
    const newStatus = !botDisabled;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalBotDisabled: newStatus })
      });
      if (res.ok) {
        setBotDisabled(newStatus);
        window.dispatchEvent(new CustomEvent('bot-status-changed', { detail: newStatus }));
      } else {
        alert('Error al cambiar el estado del bot.');
      }
    } catch (err) {
      console.error('Error toggling bot status:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      roles: ['admin', 'employee']
    },
    {
      to: '/customer-service',
      label: 'Atención Cliente',
      icon: <MessageSquare size={20} />,
      roles: ['admin', 'employee']
    },
    {
      to: '/clientes',
      label: 'Clientes',
      icon: <Users size={20} />,
      roles: ['admin', 'employee']
    },
    {
      to: '/settings',
      label: 'Configuración',
      icon: <Settings size={20} />,
      roles: ['admin'] // Solo administradores
    }
  ];

  const allowedNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-cal-dark text-white flex flex-col md:flex-row relative">
      
      {/* Mobile Header */}
      <header className="md:hidden glass border-b border-white/5 px-6 py-4 flex justify-between items-center z-30 shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cal-emerald to-cal-earth flex items-center justify-center font-display font-bold text-white text-lg shadow-sm">
            C
          </span>
          <span className="font-display font-bold text-lg tracking-wider text-gradient">
            CalMiranda
          </span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar - Desktop and Mobile Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 glass border-r border-white/5 flex flex-col justify-between p-6 transform transition-transform duration-300 ease-in-out shrink-0
        md:translate-x-0 md:static md:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-8">
          {/* Logo Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cal-emerald to-cal-earth flex items-center justify-center font-display font-extrabold text-white text-xl shadow-md shadow-cal-emerald/15">
                C
              </span>
              <div>
                <span className="font-display font-extrabold text-lg tracking-wide block leading-tight text-gradient">
                  CalMiranda
                </span>
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                  Procesos & IA
                </span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X size={20} />
            </button>
          </div>

          {/* Connection Status Panel */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Evolution API</span>
              <span className="flex items-center gap-1.5 text-cal-emerald-light font-semibold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-cal-emerald-light animate-ping" />
                Activo
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">PostgreSQL</span>
              <span className="flex items-center gap-1.5 text-cal-emerald-light font-semibold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-cal-emerald-light" />
                Online
              </span>
            </div>
            {user?.role === 'admin' && (
              <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2 mt-1">
                <span className="text-gray-500 font-medium">Estado Bot</span>
                <button 
                  onClick={toggleBot}
                  className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wide text-[10px] cursor-pointer transition-colors duration-300 ${
                    botDisabled 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/25' 
                      : 'bg-cal-emerald/10 text-cal-emerald-light border border-cal-emerald/20 hover:bg-cal-emerald/25'
                  }`}
                >
                  {botDisabled ? 'Inactivo' : 'Activo'}
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {allowedNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300
                  ${isActive 
                    ? 'bg-gradient-to-r from-cal-emerald/90 to-cal-emerald/75 text-white shadow-md shadow-cal-emerald/15 font-semibold' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-6">
          {user && (
            <div className="flex items-center gap-3 p-1">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-gray-200 border border-white/10 shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold block truncate leading-tight">
                  {user.name}
                </span>
                <span className={`
                  inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full mt-1 border
                  ${user.role === 'admin' 
                    ? 'bg-cal-emerald/15 text-cal-emerald-light border-cal-emerald/30' 
                    : 'bg-cal-sand/15 text-cal-sand border-cal-sand/30'}
                `}>
                  {user.role === 'admin' ? 'Administrador' : 'Empleado'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 text-sm font-semibold rounded-2xl py-3 transition-all duration-300 cursor-pointer"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:h-screen overflow-y-auto">
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6 md:gap-8">
          {children}
        </div>
      </main>
    </div>
  );
};
