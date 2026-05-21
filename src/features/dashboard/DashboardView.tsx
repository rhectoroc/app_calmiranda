import React, { useState } from 'react';
import { useAuth } from '../../context/authContext';
import { 
  initialInventory, 
  initialPlants, 
  salesHistory
} from '../../shared/mockData';
import type { 
  ProductStock, 
  PlantProduction 
} from '../../shared/mockData';
import { 
  TrendingUp, 
  Package, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Clock
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [inventory] = useState<ProductStock[]>(initialInventory);
  const [plants] = useState<PlantProduction[]>(initialPlants);

  // Calcular métricas
  const totalStockItems = inventory.reduce((acc, curr) => acc + curr.stock, 0);
  const lowStockProducts = inventory.filter(p => p.stock < p.minStock);
  const totalProductionToday = plants.reduce((acc, curr) => acc + curr.dailyProduction, 0);
  const avgEfficiency = Math.round(plants.reduce((acc, curr) => acc + curr.efficiency, 0) / plants.length);

  // Simulación de logs de eventos
  const [eventLogs] = useState([
    { id: '1', time: '13:11', source: 'Diamantín', desc: 'Transferido chat de Carlos Mendoza a espera de agente comercial (WhatsApp).', type: 'info' },
    { id: '2', time: '13:05', source: 'Asistente IA', desc: 'Respuestas de stock enviadas a terminal de Roberto Dávila.', type: 'assistant' },
    { id: '3', time: '12:46', source: 'Diamantín', desc: 'Asistido cliente Ferretería La Solución sobre Pipote Muestrario.', type: 'bot' },
    { id: '4', time: '11:30', source: 'Sistema', desc: 'Sincronización exitosa con la base de datos PostgreSQL de Easypanel.', type: 'success' },
    { id: '5', time: '08:15', source: 'Sede Guatire', desc: 'Encendido de Horno Rotatorio A. Temperatura estable a 980°C.', type: 'success' },
    { id: '6', time: '08:00', source: 'Sistema', desc: 'Inicio de turno operativo. 2 sedes activas y monitoreadas.', type: 'info' }
  ]);

  // Dimensiones para el gráfico SVG
  const chartHeight = 120;
  const chartWidth = 400;
  const padding = 20;

  // Encontrar valores máximos para escalar gráfico
  const maxSales = Math.max(...salesHistory.map(s => s.sales));
  const maxVolume = Math.max(...salesHistory.map(s => s.volume));

  // Generar puntos para el gráfico de línea
  const salesPoints = salesHistory.map((s, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (salesHistory.length - 1);
    const ratio = s.sales / maxSales;
    const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
    return { x, y, month: s.month, value: s.sales };
  });

  const volumePoints = salesHistory.map((s, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (salesHistory.length - 1);
    const ratio = s.volume / maxVolume;
    const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
    return { x, y, month: s.month, value: s.volume };
  });

  const salesPath = salesPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const volumePath = volumePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2 leading-none">
          Panel de Control Operativo
        </h1>
        <p className="text-gray-400 text-sm">
          Monitoreo de producción, existencias y actividad de asistentes en tiempo real.
        </p>
      </div>

      {/* Grid: KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* KPI 1: Producción de Hoy */}
        <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-cal-emerald/30 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Producción de Hoy
            </span>
            <span className="p-2.5 bg-cal-emerald/10 text-cal-emerald-light rounded-2xl border border-cal-emerald/20">
              <Activity size={18} />
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-display text-white mb-1">
              {totalProductionToday.toFixed(1)} Tn
            </h3>
            <span className="text-cal-emerald-light text-xs font-medium flex items-center gap-1">
              <TrendingUp size={12} />
              +4.2% vs promedio semanal
            </span>
          </div>
        </div>

        {/* KPI 2: Eficiencia de Sedes */}
        <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-cal-emerald/30 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Eficiencia Hornos
            </span>
            <span className="p-2.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
              <CheckCircle size={18} />
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-display text-white mb-1">
              {avgEfficiency}%
            </h3>
            <span className="text-gray-400 text-xs font-medium flex items-center gap-1">
              <Clock size={12} />
              Temperatura promedio: 967°C
            </span>
          </div>
        </div>

        {/* KPI 3: Stock de Productos */}
        <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-cal-emerald/30 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Inventario Total
            </span>
            <span className="p-2.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
              <Package size={18} />
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-display text-white mb-1">
              {totalStockItems.toLocaleString()}
            </h3>
            <span className="text-gray-400 text-xs font-medium">
              Distribuidos en 6 formatos
            </span>
          </div>
        </div>

        {/* KPI 4: Alertas de Stock */}
        <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col justify-between hover:border-cal-emerald/30 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Alertas Críticas
            </span>
            <span className={`p-2.5 rounded-2xl border ${
              lowStockProducts.length > 0 
                ? 'bg-cal-gold/10 text-cal-gold-light border-cal-gold/20' 
                : 'bg-cal-emerald/10 text-cal-emerald-light border-cal-emerald/20'
            }`}>
              <AlertTriangle size={18} />
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-display text-white mb-1">
              {lowStockProducts.length}
            </h3>
            <span className={`text-xs font-medium ${
              lowStockProducts.length > 0 ? 'text-cal-gold-light' : 'text-cal-emerald-light'
            }`}>
              {lowStockProducts.length > 0 
                ? 'Productos por debajo del stock mínimo' 
                : 'Niveles de stock óptimos'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: charts and operations info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Production and Sales Chart Card */}
          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold font-display text-white leading-tight">
                  {isAdmin ? 'Ventas e Ingresos' : 'Volumen Comercializado'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {isAdmin ? 'Historial facturado en USD (Año 2026)' : 'Volumen total comercializado (Toneladas)'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                {isAdmin ? (
                  <span className="flex items-center gap-1.5 text-cal-emerald-light">
                    <span className="w-2 h-2 rounded-full bg-cal-emerald-light" />
                    Ingresos ($)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Volumen (Tn)
                  </span>
                )}
              </div>
            </div>

            {/* SVG Interactive Line Chart */}
            <div className="w-full relative h-[150px] flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                {/* Horizontal grid lines */}
                <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255,255,255,0.1)" />

                {/* Sales path (Admin) */}
                {isAdmin && (
                  <>
                    <path
                      d={salesPath}
                      fill="none"
                      stroke="url(#salesGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Shadow under path */}
                    <path
                      d={`${salesPath} L ${salesPoints[salesPoints.length - 1].x} ${chartHeight - padding} L ${salesPoints[0].x} ${chartHeight - padding} Z`}
                      fill="url(#salesGradientBg)"
                      opacity="0.1"
                    />
                  </>
                )}

                {/* Volume path (Employee) */}
                {!isAdmin && (
                  <>
                    <path
                      d={volumePath}
                      fill="none"
                      stroke="url(#volumeGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <path
                      d={`${volumePath} L ${volumePoints[volumePoints.length - 1].x} ${chartHeight - padding} L ${volumePoints[0].x} ${chartHeight - padding} Z`}
                      fill="url(#volumeGradientBg)"
                      opacity="0.1"
                    />
                  </>
                )}

                {/* Gradients definition */}
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="salesGradientBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="volumeGradientBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Data Points and Labels */}
                {(isAdmin ? salesPoints : volumePoints).map((p, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      className={`${isAdmin ? 'fill-cal-emerald-light' : 'fill-blue-400'} stroke-cal-charcoal stroke-2 hover:r-6 transition-all`}
                    />
                    <text
                      x={p.x}
                      y={chartHeight - 4}
                      className="text-[9px] fill-gray-500 font-semibold"
                      textAnchor="middle"
                    >
                      {p.month}
                    </text>
                    <text
                      x={p.x}
                      y={p.y - 8}
                      className="text-[8px] font-bold fill-white opacity-0 group-hover:opacity-100 transition-opacity"
                      textAnchor="middle"
                    >
                      {isAdmin ? `$${(p.value).toLocaleString()}` : `${p.value} Tn`}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Plant Operations Table */}
          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold font-display text-white leading-tight">
                Estado Operativo de Plantas
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Monitoreo en tiempo real de hornos, operarios y rendimiento.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Sede / Planta</th>
                    <th className="py-3 px-4">Producción</th>
                    <th className="py-3 px-4">Temperatura</th>
                    <th className="py-3 px-4">Eficiencia</th>
                    <th className="py-3 px-4">Operarios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {plants.map((plant) => (
                    <tr key={plant.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{plant.name}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-200">{plant.dailyProduction} Tn</span>
                        <span className="text-xs text-gray-500 block">Capacidad: {plant.capacity} Tn</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-cal-gold-light">{plant.ovenTemperature}°C</span>
                        <span className="text-[10px] text-emerald-500 font-medium block">Horno Estable</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-300">
                        <div className="flex items-center gap-2">
                          <span className="w-12 block">{plant.efficiency}%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-cal-emerald rounded-full" 
                              style={{ width: `${plant.efficiency}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{plant.activeWorkers} activos</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: AI event logs and low stock notifications */}
        <div className="flex flex-col gap-6">
          
          {/* Low Stock Alerts Card */}
          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col gap-4">
            <h3 className="text-lg font-bold font-display text-white leading-tight">
              Requerimientos de Almacén
            </h3>
            <div className="flex flex-col gap-3">
              {lowStockProducts.map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-cal-gold/5 border border-cal-gold/15 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-gray-200 block truncate">
                      {p.name}
                    </span>
                    <span className="text-xs text-gray-400 mt-1 block">
                      Existencia: <strong className="text-cal-gold-light">{p.stock}</strong> (Mínimo: {p.minStock} {p.unit})
                    </span>
                  </div>
                  <button className="px-3 py-2 bg-cal-gold hover:bg-cal-gold-dark text-cal-charcoal hover:text-white font-bold text-xs rounded-xl transition-all duration-300 shrink-0 cursor-pointer">
                    Abastecer
                  </button>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <div className="p-4 rounded-2xl bg-cal-emerald/5 border border-cal-emerald/15 flex items-center gap-3 text-cal-emerald-light text-sm">
                  <CheckCircle size={18} className="shrink-0" />
                  <span>Todos los productos tienen existencias adecuadas.</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Event Log Card */}
          <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col gap-4 flex-1">
            <h3 className="text-lg font-bold font-display text-white leading-tight">
              Actividad del Agente IA
            </h3>
            
            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
              {eventLogs.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs leading-normal">
                  <span className="text-gray-500 font-mono mt-0.5 shrink-0">{log.time}</span>
                  <div>
                    <span className={`font-semibold mr-1.5 ${
                      log.source === 'Diamantín' 
                        ? 'text-cal-emerald-light' 
                        : log.source === 'Asistente IA' 
                        ? 'text-cal-gold-light' 
                        : 'text-gray-400'
                    }`}>
                      {log.source}:
                    </span>
                    <span className="text-gray-300">{log.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
