import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Interceptor global para inyectar headers de autenticación (JWT) en todas las peticiones fetch
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  
  if (url.startsWith('/api')) {
    const headers = new Headers(init?.headers);
    const storedUser = localStorage.getItem('calmiranda_session');
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${user.token}`);
        }
        if (user.username && !headers.has('x-current-user-email')) {
          headers.set('x-current-user-email', user.username);
        }
      } catch (e) {}
    }
    
    return originalFetch(input, { ...init, headers });
  }
  
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
