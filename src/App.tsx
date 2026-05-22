import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/authContext';
import { Layout } from './components/Layout';
import { LoginView } from './features/auth/LoginView';
import { DashboardView } from './features/dashboard/DashboardView';
import { CustomerServiceHub } from './features/customer-service/CustomerServiceHub';
import { ClientesView } from './features/clientes/ClientesView';
import { SettingsView } from './features/settings/SettingsView';

// Componente para proteger rutas según autenticación general
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

// Componente para restringir acceso exclusivamente a administradores
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<LoginView />} />
          
          {/* Rutas protegidas para Admin y Empleado */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardView />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/customer-service" 
            element={
              <ProtectedRoute>
                <CustomerServiceHub />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/clientes" 
            element={
              <ProtectedRoute>
                <ClientesView />
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta protegida exclusiva para Administradores */}
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <SettingsView />
                </AdminRoute>
              </ProtectedRoute>
            } 
          />
          
          {/* Redirecciones por defecto */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
