import React, { useState } from 'react';
import { useAuth } from '../context/authContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Bot, 
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
      to: '/business-assistant',
      label: 'Asistente IA',
      icon: <Bot size={20} />,
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
    <div className="min-h-screen bg-cal-charcoal text-white flex flex-col md:flex-row relative">
      
      {/* Mobile Header */}
      <header className="md:hidden glass border-b border-white/5 px-6 py-4 flex justify-between items-center z-30 shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-cal-emerald flex items-center justify-center font-display font-bold text-white text-lg">
            C
          </span>
          <span className="font-display font-semibold text-lg tracking-wider">
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
              <span className="w-10 h-10 rounded-xl bg-cal-emerald flex items-center justify-center font-display font-extrabold text-white text-xl shadow-lg shadow-cal-emerald/20">
                C
              </span>
              <div>
                <span className="font-display font-bold text-lg tracking-wide block leading-tight">
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
                    ? 'bg-cal-emerald text-white shadow-lg shadow-cal-emerald/10 font-semibold' 
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
                    : 'bg-cal-gold/15 text-cal-gold-light border-cal-gold/30'}
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
