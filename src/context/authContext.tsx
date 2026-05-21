import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface User {
  name: string;
  username: string;
  role: 'admin' | 'employee';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaurar sesión persistida
    const storedUser = localStorage.getItem('calmiranda_session');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('calmiranda_session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Simulación de retraso de red para dar feedback de carga visual en el formulario
    await new Promise((resolve) => setTimeout(resolve, 800));

    const u = username.toLowerCase().trim();

    // Cuenta de administrador
    if (u === 'admin' && password === 'admin123') {
      const adminUser: User = {
        name: 'Alejandro Miranda',
        username: 'admin',
        role: 'admin',
      };
      setUser(adminUser);
      localStorage.setItem('calmiranda_session', JSON.stringify(adminUser));
      return true;
    }

    // Cuenta de empleado
    if ((u === 'empleado' || u === 'roberto') && password === 'cal123') {
      const employeeUser: User = {
        name: 'Roberto Dávila',
        username: u,
        role: 'employee',
      };
      setUser(employeeUser);
      localStorage.setItem('calmiranda_session', JSON.stringify(employeeUser));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('calmiranda_session');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cal-charcoal flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cal-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
