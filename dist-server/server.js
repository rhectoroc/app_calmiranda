import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
// Resolver __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
// Configurar CORS
app.use(cors());
// Middleware para parsear JSON
app.use(express.json());
// Endpoint de prueba de API
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor de CalMiranda en funcionamiento' });
});
// Servir la aplicación estática del Frontend (React) en producción
const clientBuildPath = path.join(__dirname, '../dist');
app.use(express.static(clientBuildPath));
// Cualquier otra ruta no capturada por la API es redirigida al index.html de React (SPA Routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});
// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
