import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/authContext';
import { Layout } from './components/Layout';
import { LoginView } from './features/auth/LoginView';
import { DashboardView } from './features/dashboard/DashboardView';
import { CustomerServiceHub } from './features/customer-service/CustomerServiceHub';
import { ClientesView } from './features/clientes/ClientesView';
import { SettingsView } from './features/settings/SettingsView';
import { UsuariosView } from './features/users/UsuariosView';
import { InventarioView } from './features/inventario/InventarioView';
import { ProductosView } from './features/productos/ProductosView';

// Componente para proteger rutas según autenticación general y permisos
const ProtectedRoute: React.FC<{ children: React.ReactNode, section?: string }> = ({ children, section }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (section && user?.role === 'operador' && !user.permisos?.includes(section)) {
    const primerPermiso = user.permisos && user.permisos.length > 0 ? `/${user.permisos[0]}` : '/dashboard';
    if (primerPermiso !== `/${section}`) {
      return <Navigate to={primerPermiso} replace />;
    } else {
       return <div className="min-h-screen bg-cal-dark flex items-center justify-center text-white">Acceso Denegado</div>;
    }
  }
  
  return <Layout>{children}</Layout>;
};

// Componente para restringir acceso exclusivamente a administradores
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
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
              <ProtectedRoute section="dashboard">
                <DashboardView />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/customer-service" 
            element={
              <ProtectedRoute section="customer-service">
                <CustomerServiceHub />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/clientes" 
            element={
              <ProtectedRoute section="clientes">
                <ClientesView />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/productos" 
            element={
              <ProtectedRoute section="productos">
                <ProductosView />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/inventario" 
            element={
              <ProtectedRoute section="inventario">
                <InventarioView />
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

          <Route 
            path="/usuarios" 
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <UsuariosView />
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
