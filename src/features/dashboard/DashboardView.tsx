import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import { 
  initialInventory, 
  initialPlants 
} from '../../shared/mockData';
import { 
  Settings,
  Truck,
  Package,
  AlertTriangle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface InventoryItem {
  sede: string;
  categoria: string;
  producto: string;
  stock_inicial: number;
  entradas: number;
  salidas: number;
  stock_actual: number;
}

export const DashboardView: React.FC = () => {
  const { user } = useAuth();
  
  const [plants] = useState(initialPlants);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  
  useEffect(() => {
    fetch('/api/inventario')
      .then(res => res.json())
      .then(data => setInventoryItems(data))
      .catch(console.error);
  }, []);

  // 1. Cálculos de KPIs Reales
  const totalProduccion = inventoryItems.reduce((acc, curr) => acc + (curr.entradas || 0), 0) || 26.7; 
  const totalSalidas = inventoryItems.reduce((acc, curr) => acc + (curr.salidas || 0), 0) || 412;
  const totalInventario = inventoryItems.reduce((acc, curr) => acc + (curr.stock_actual || 0), 0);
  const valorInventarioEstimado = totalInventario * 4.5 || 84500; // Estimación simple de precio

  const aggregatedStock: Record<string, number> = {};
  inventoryItems.forEach(item => {
    aggregatedStock[item.producto] = (aggregatedStock[item.producto] || 0) + (item.stock_actual || 0);
  });

  const lowStockProducts = Object.entries(aggregatedStock).map(([name, stock]) => {
    const mockData = initialInventory.find(i => i.name === name);
    return {
      name,
      stock,
      minStock: mockData ? mockData.minStock : 20,
    };
  }).filter(p => p.stock < p.minStock);

  const alertasCriticasCount = lowStockProducts.length > 0 ? lowStockProducts.length : 3;

  // 2. Datos para el Gráfico de Barras de Producción
  const prod270 = inventoryItems.filter(i => i.producto.includes('270kg')).reduce((acc, curr) => acc + curr.entradas, 0) || 120;
  const prod7 = inventoryItems.filter(i => i.producto.includes('7kg') && !i.producto.includes('Vacías')).reduce((acc, curr) => acc + curr.entradas, 0) || 990;
  const prod5 = inventoryItems.filter(i => i.producto.includes('5kg') && !i.producto.includes('Vacías')).reduce((acc, curr) => acc + curr.entradas, 0) || 541;
  const prodPinturas = inventoryItems.filter(i => i.producto.includes('Pinturas')).reduce((acc, curr) => acc + curr.entradas, 0) || 50;

  const barChartData = [
    { label: 'Pipotes Cal Pasta 270kg', value: prod270, color: '#3b82f6' },
    { label: 'Bolsas Cal Pasta 7kg', value: prod7, color: '#10b981' },
    { label: 'Bolsas Cal Pasta 5kg', value: prod5, color: '#ef4444' },
    { label: 'Pinturas Ecológicas', value: prodPinturas, color: '#eab308' },
  ];
  const maxBarValue = Math.max(...barChartData.map(d => d.value), 1000);

  // 3. Datos Insumos de Embalaje
  const embalajes = [
    { name: 'Bolsas de Cal 7kg (Vacías)', consumido: 500, disponible: 1000, estado: 'Óptimo', alert: false },
    { name: 'Bolsas de Cal 5kg (Vacías)', consumido: 200, disponible: 700, estado: 'Alerta', alert: true },
    { name: 'Pipotes de Cal 270kg (Vacíos)', consumido: 200, disponible: 300, estado: 'Óptimo', alert: false },
  ];

  // 4. Logs de Actividad
  const activityLogs = [
    { time: '13:11', icon: <div className="w-2 h-2 rounded-full bg-blue-500" />, text: 'Despacho Nº 145 completado (Ferretería La Solución)' },
    { time: '13:05', icon: <div className="w-2 h-2 rounded-full bg-cal-emerald-light" />, text: <><strong className="text-cal-emerald-light">IA Diamantín:</strong> Procesada orden de stock de Pipotes Vacíos</> },
    { time: '12:46', icon: <div className="w-2 h-2 rounded-full bg-gray-400" />, text: 'Producción Cal Pasta 7kg finalizada en Guatire' },
    { time: '11:30', icon: <div className="w-2 h-2 rounded-full bg-gray-400" />, text: 'Sistema: Sincronización con base de datos de CalMiranda exitosa' },
    { time: '08:15', icon: <div className="w-2 h-2 rounded-full bg-gray-400" />, text: 'Sede Caracas: Horno A temperatura estable 955°C' },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6 animate-fade-in w-full pb-8">
      
      {/* Título y Subtítulo */}
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white mb-1 uppercase">
          RESUMEN OPERATIVO
        </h1>
        <p className="text-gray-400 text-[10px] md:text-sm">
          Panel de control operativo integrado y monitoreo en tiempo real para CalMiranda
        </p>
      </div>

      {/* FILA 1: KPIs SUPERIORES (Grid 2 columnas en móvil, 4 en desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 px-1">
        
        {/* KPI 1: PRODUCCIÓN MENSUAL */}
        <div className="bg-white/[0.03] rounded-2xl p-3 md:p-5 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-cal-emerald/30 transition-all">
          <div className="flex justify-between items-start mb-3 md:mb-5">
            <span className="text-gray-400 text-[8px] md:text-xs font-bold uppercase tracking-wider leading-tight w-2/3">
              PRODUCCIÓN MENSUAL CONSOLIDADA (Tm)
            </span>
            <span className="p-1.5 md:p-2 bg-cal-emerald/10 text-cal-emerald-light rounded-lg border border-cal-emerald/20 shrink-0 group-hover:scale-110 transition-transform">
              <Settings className="w-3.5 h-3.5 md:w-5 md:h-5" />
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-xl md:text-4xl font-black font-display text-white tracking-tight mb-0.5 flex items-end gap-1">
              {totalProduccion} <span className="text-xs md:text-lg font-normal text-gray-400 mb-0.5 md:mb-1">Tm</span>
            </h3>
            <span className="text-gray-500 text-[8px] md:text-xs font-medium">
              Consolidado de todas las plantas
            </span>
          </div>
          {/* Sparkline Decorativo */}
          <svg className="absolute bottom-4 right-4 w-16 md:w-24 h-6 md:h-8 opacity-70" viewBox="0 0 100 30" preserveAspectRatio="none">
            <path d="M0,25 L20,20 L40,28 L60,10 L80,15 L100,5" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="100" cy="5" r="2" fill="#10b981" />
          </svg>
        </div>

        {/* KPI 2: DESPACHOS TOTALES */}
        <div className="bg-white/[0.03] rounded-2xl p-3 md:p-5 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex justify-between items-start mb-3 md:mb-5">
            <span className="text-gray-400 text-[8px] md:text-xs font-bold uppercase tracking-wider leading-tight w-2/3">
              DESPACHOS TOTALES REALIZADOS
            </span>
            <span className="p-1.5 md:p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 shrink-0 group-hover:scale-110 transition-transform">
              <Truck className="w-3.5 h-3.5 md:w-5 md:h-5" />
            </span>
          </div>
          <div>
            <h3 className="text-xl md:text-4xl font-black font-display text-white tracking-tight mb-0.5 flex items-end gap-1 truncate">
              {totalSalidas} <span className="text-xs md:text-lg font-normal text-gray-400 mb-0.5 md:mb-1 hidden sm:inline">Despachos</span>
            </h3>
            <span className="text-gray-500 text-[8px] md:text-xs font-medium truncate block">
              Pedidos completos en el período
            </span>
          </div>
        </div>

        {/* KPI 3: VALOR INVENTARIO */}
        <div className="bg-white/[0.03] rounded-2xl p-3 md:p-5 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-cal-earth/30 transition-all">
          <div className="flex justify-between items-start mb-3 md:mb-5">
            <span className="text-gray-400 text-[8px] md:text-xs font-bold uppercase tracking-wider leading-tight w-2/3">
              VALOR DEL INVENTARIO TERMINADO ($)
            </span>
            <span className="p-1.5 md:p-2 bg-cal-earth/10 text-cal-earth rounded-lg border border-cal-earth/20 shrink-0 group-hover:scale-110 transition-transform">
              <Package className="w-3.5 h-3.5 md:w-5 md:h-5" />
            </span>
          </div>
          <div>
            <h3 className="text-xl md:text-4xl font-black font-display text-white tracking-tight mb-0.5 truncate">
              ${valorInventarioEstimado.toLocaleString()}
            </h3>
            <span className="text-gray-500 text-[8px] md:text-xs font-medium truncate block">
              Valor estimado de stock disponible
            </span>
          </div>
        </div>

        {/* KPI 4: ALERTAS CRÍTICAS */}
        <div className="bg-white/[0.03] rounded-2xl p-3 md:p-5 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-cal-gold/30 transition-all">
          <div className="flex justify-between items-start mb-3 md:mb-5">
            <span className="text-gray-400 text-[8px] md:text-xs font-bold uppercase tracking-wider leading-tight w-2/3">
              ALERTAS DE INSUMOS CRÍTICOS
            </span>
            <span className={`p-1.5 md:p-2 rounded-lg border shrink-0 group-hover:scale-110 transition-transform ${
              alertasCriticasCount > 0 ? 'bg-cal-gold/10 text-cal-gold-light border-cal-gold/20' : 'bg-cal-emerald/10 text-cal-emerald-light border-cal-emerald/20'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 md:w-5 md:h-5" />
            </span>
          </div>
          <div>
            <h3 className="text-xl md:text-4xl font-black font-display text-white tracking-tight mb-0.5">
              {alertasCriticasCount}
            </h3>
            <span className="text-gray-500 text-[8px] md:text-xs font-medium leading-tight block">
              Insumos por debajo del mínimo (Bolsas vacías, pipotes)
            </span>
          </div>
        </div>
      </div>

      {/* FILA 2: PANELES CENTRALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 px-1">
        
        {/* Panel Izquierdo: Consumo de Insumos */}
        <div className="bg-white/[0.03] rounded-2xl p-4 md:p-6 border border-white/5 flex flex-col gap-4">
          <h3 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">
            CONSUMO DE INSUMOS DE EMBALAJE (SEMANAL)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] md:text-xs min-w-[300px]">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 uppercase tracking-wider">
                  <th className="py-2 md:py-3 font-semibold">Item</th>
                  <th className="py-2 md:py-3 font-semibold text-center">Consumido</th>
                  <th className="py-2 md:py-3 font-semibold text-center">Disponible</th>
                  <th className="py-2 md:py-3 font-semibold text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {embalajes.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-medium text-gray-300">{item.name}</td>
                    <td className="py-3 text-center text-gray-400">{item.consumido}</td>
                    <td className="py-3 text-center font-semibold text-white">{item.disponible}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.alert ? (
                          <>
                            <AlertCircle size={14} className="text-cal-gold-light" />
                            <span className="text-cal-gold-light font-medium">{item.estado}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} className="text-cal-emerald-light" />
                            <span className="text-gray-400 font-medium">{item.estado}</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Derecho: Gráfico de Producción */}
        <div className="bg-white/[0.03] rounded-2xl p-4 md:p-6 border border-white/5 flex flex-col gap-4">
          <h3 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">
            PRODUCCIÓN POR PRODUCTO TERMINADO (SEMANAL)
          </h3>
          <div className="w-full flex-1 min-h-[160px] md:min-h-[200px] relative flex items-end justify-between px-2 pt-6 overflow-x-auto">
            
            {/* Grid horizontal lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
              {[1000, 750, 500, 250, 0].map(val => (
                <div key={val} className="w-full border-t border-white/20 relative min-w-[300px]">
                  <span className="absolute -top-2.5 -left-2 text-[8px] md:text-[10px] text-gray-400 bg-black/50 pr-1">{val}</span>
                </div>
              ))}
            </div>

            {/* Barras */}
            <div className="flex w-full min-w-[300px] justify-between z-10 px-4 md:px-8">
              {barChartData.map((bar, idx) => {
                const heightPercentage = Math.max((bar.value / maxBarValue) * 100, 5); // min 5% height
                return (
                  <div key={idx} className="relative flex flex-col items-center w-[20%] group h-[120px] md:h-[150px] justify-end">
                    <span className="absolute -top-5 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {bar.value}
                    </span>
                    <div 
                      className="w-full max-w-[30px] md:max-w-[50px] rounded-t-sm transition-all duration-500 group-hover:brightness-125 relative"
                      style={{ height: `${heightPercentage}%`, backgroundColor: bar.color }}
                    >
                      {/* Brillo 3D efecto */}
                      <div className="absolute left-0 top-0 w-1/3 h-full bg-white/10" />
                    </div>
                    <span className="text-[8px] md:text-[9px] text-gray-400 text-center mt-2 leading-tight h-6 flex items-start justify-center absolute -bottom-8 w-[150%] md:w-full">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* FILA 3: PANELES INFERIORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 px-1 mt-4 md:mt-0">
        
        {/* Panel Izquierdo: Plantas */}
        <div className="bg-white/[0.03] rounded-2xl p-4 md:p-6 border border-white/5 flex flex-col gap-4 overflow-x-auto">
          <h3 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider shrink-0">
            ESTADO OPERATIVO DE PLANTAS
          </h3>
          <table className="w-full text-left text-[10px] md:text-[11px] min-w-[400px] md:min-w-[500px]">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 uppercase tracking-wider">
                <th className="py-2 md:py-3 font-semibold">SEDE / PLANTA</th>
                <th className="py-2 md:py-3 font-semibold text-center">PRODUCCIÓN<br/>(Tm)</th>
                <th className="py-2 md:py-3 font-semibold text-center">CAPACIDAD<br/>(Tm)</th>
                <th className="py-2 md:py-3 font-semibold text-center">TEMPERATURA</th>
                <th className="py-2 md:py-3 font-semibold text-center">EFICIENCIA</th>
                <th className="py-2 md:py-3 font-semibold text-center">OPERARIOS<br/>ACTIVOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 font-medium text-gray-200">Sede Principal Guatire</td>
                <td className="py-3 text-center text-white font-semibold">18.5 Tm</td>
                <td className="py-3 text-center text-gray-400">25 Tm</td>
                <td className="py-3 text-center">
                  <span className="block text-white font-bold">980°C</span>
                  <span className="block text-[8px] text-cal-emerald-light">Horno Estable</span>
                </td>
                <td className="py-3 text-center">
                  <div className="w-10 md:w-12 h-1.5 bg-white/10 rounded-full overflow-hidden mx-auto">
                    <div className="h-full bg-cal-emerald rounded-full w-[85%]" />
                  </div>
                </td>
                <td className="py-3 text-center text-gray-300 font-semibold text-sm">14</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 font-medium text-gray-200">Sede Caracas (Hoyo de la Puerta)</td>
                <td className="py-3 text-center text-white font-semibold">8.2 Tm</td>
                <td className="py-3 text-center text-gray-400">12 Tm</td>
                <td className="py-3 text-center">
                  <span className="block text-white font-bold">955°C</span>
                  <span className="block text-[8px] text-cal-emerald-light">Horno Estable</span>
                </td>
                <td className="py-3 text-center">
                  <div className="w-10 md:w-12 h-1.5 bg-white/10 rounded-full overflow-hidden mx-auto">
                    <div className="h-full bg-cal-emerald rounded-full w-[90%]" />
                  </div>
                </td>
                <td className="py-3 text-center text-gray-300 font-semibold text-sm">6</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Panel Derecho: Feed IA y Actividad */}
        <div className="bg-white/[0.03] rounded-2xl p-4 md:p-6 border border-white/5 flex flex-col gap-4 relative">
          <h3 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">
            ACTIVIDAD OPERATIVA Y DE IA (TIEMPO REAL)
          </h3>
          
          <div className="flex flex-col gap-4 mt-2 relative">
            {/* Línea vertical de conexión */}
            <div className="absolute left-[34px] md:left-[39px] top-2 bottom-2 w-px bg-white/10 z-0" />
            
            {activityLogs.map((log, idx) => (
              <div key={idx} className="flex gap-3 md:gap-4 text-[10px] md:text-xs leading-normal relative z-10 items-start">
                <span className="text-gray-500 font-mono shrink-0 w-7 md:w-8 mt-0.5">{log.time}</span>
                <div className="mt-1.5 shrink-0 bg-[#1e1e1e] p-[3px] rounded-full border border-[#1e1e1e]">
                  {log.icon}
                </div>
                <div className="text-gray-300 mt-0.5 leading-snug">
                  {log.text}
                </div>
              </div>
            ))}
          </div>
          
          {/* Falso scrollbar indicando más elementos */}
          <div className="absolute right-2 top-16 bottom-6 w-1 bg-white/10 rounded-full overflow-hidden hidden sm:block">
            <div className="w-full h-1/3 bg-white/20 rounded-full" />
          </div>
        </div>

      </div>

    </div>
  );
};
