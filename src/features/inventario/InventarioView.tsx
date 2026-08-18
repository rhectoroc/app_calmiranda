import React, { useState, useEffect } from 'react';
import { Package, Save, RefreshCw, Archive, Layers, CalendarCheck, Tag } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface InventoryItem {
  id?: number;
  sede: string;
  categoria: string;
  producto: string;
  stock_inicial: number;
  produccion: number;
  salidas: number;
  stock_actual: number;
  updated_at?: string;
  updated_by?: string;
}

const CATEGORIAS_ICONS: Record<string, React.ReactNode> = {
  'Producto Terminado': <Package className="w-5 h-5 text-cal-emerald-light" />,
  'Agregados': <Layers className="w-5 h-5 text-cal-emerald-light" />,
  'Insumos y Muestrarios': <Archive className="w-5 h-5 text-cal-emerald-light" />,
  'default': <Tag className="w-5 h-5 text-cal-emerald-light" />
};

const SEDES = ['Hoyo de la Puerta', 'Guatire'];

export const InventarioView: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [productosData, setProductosData] = useState<{ nombre: string, categoria: string, productos: {nombre: string, tipo_medida: string}[], icon: React.ReactNode }[]>([]);
  const [selectedSede, setSelectedSede] = useState<string>('Hoyo de la Puerta');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  // Fecha en formato local de Venezuela
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }).split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const isHistorical = selectedDate !== todayStr;

  useEffect(() => {
    fetchInventoryAndProductos();
  }, [selectedSede, selectedDate]);

  const fetchInventoryAndProductos = async () => {
    setLoading(true);
    try {
      const endpoint = isHistorical ? `/api/inventario/historial?fecha=${selectedDate}` : '/api/inventario';
      const [invRes, prodRes] = await Promise.all([
        fetch(endpoint),
        fetch('/api/productos')
      ]);
      
      if (invRes.ok && prodRes.ok) {
        const invData = await invRes.json();
        const prodData = await prodRes.json();
        
        const mappedInv = invData.map((item: any) => ({
          ...item,
          stock_inicial: parseFloat(item.stock_inicial) || 0,
          produccion: parseFloat(item.produccion) || 0,
          salidas: parseFloat(item.salidas) || 0,
          stock_actual: isHistorical ? (parseFloat(item.stock_final) || 0) : ((parseFloat(item.stock_inicial) || 0) + (parseFloat(item.produccion) || 0) - (parseFloat(item.salidas) || 0))
        }));

        setItems(mappedInv);
        
        // Group active products by category
        const grouped: Record<string, {nombre: string, tipo_medida: string}[]> = {};
        prodData.forEach((p: any) => {
          if (p.estado === 'Activo') {
            if (!grouped[p.categoria]) grouped[p.categoria] = [];
            grouped[p.categoria].push({ nombre: p.nombre, tipo_medida: p.tipo_medida || 'Unidad' });
          }
        });
        
        const categoriesArray = Object.keys(grouped).map(cat => ({
          nombre: cat,
          categoria: cat,
          icon: CATEGORIAS_ICONS[cat] || CATEGORIAS_ICONS['default'],
          productos: grouped[cat]
        }));
        
        setProductosData(categoriesArray);
      }
    } catch (error) {
      console.error('Error fetching inventory and products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemsToSave = items.filter(item => item.sede === selectedSede).map(item => ({ ...item, updated_by: user?.name }));
      const response = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave })
      });
      if (response.ok) {
        await fetchInventoryAndProductos();
      }
    } catch (error) {
      console.error('Error saving inventory:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCerrarDia = async () => {
    if (!window.confirm(`¿Estás seguro de cerrar el día en ${selectedSede}?\n\nEsto trasladará el Stock Final al Stock Inicial de mañana y pondrá Entradas y Salidas en cero. ESTA ACCIÓN NO SE PUEDE DESHACER.`)) {
      return;
    }
    setClosing(true);
    try {
      // Primero guardamos los cambios actuales
      const itemsToSave = items.filter(item => item.sede === selectedSede).map(item => ({ ...item, updated_by: user?.name }));
      await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave })
      });
      
      // Luego ejecutamos el cierre de día
      const response = await fetch('/api/inventario/cerrar-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sede: selectedSede, updated_by: user?.name })
      });
      if (response.ok) {
        await fetchInventoryAndProductos();
        alert('Cierre de día exitoso. El Kardex se ha reiniciado para el nuevo día.');
      }
    } catch (error) {
      console.error('Error closing day:', error);
      alert('Hubo un error al cerrar el día.');
    } finally {
      setClosing(false);
    }
  };

  const getItem = (categoria: string, producto: string): InventoryItem => {
    const existing = items.find(i => i.sede === selectedSede && i.categoria === categoria && i.producto === producto);
    if (existing) return existing;
    return { sede: selectedSede, categoria, producto, stock_inicial: 0, produccion: 0, salidas: 0, stock_actual: 0 };
  };

  const updateItem = (categoria: string, producto: string, field: 'stock_inicial' | 'produccion' | 'salidas', value: string, isUnidad: boolean) => {
    if (isHistorical) return; // Read-only in historical mode
    
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;
    if (isUnidad) numValue = Math.floor(numValue);

    setItems(prev => {
      const copy = [...prev];
      const index = copy.findIndex(i => i.sede === selectedSede && i.categoria === categoria && i.producto === producto);
      
      if (index >= 0) {
        const item = copy[index];
        const updatedItem = { ...item, [field]: numValue };
        updatedItem.stock_actual = updatedItem.stock_inicial + updatedItem.produccion - updatedItem.salidas;
        copy[index] = updatedItem;
      } else {
        const newItem: InventoryItem = {
          sede: selectedSede,
          categoria,
          producto,
          stock_inicial: field === 'stock_inicial' ? numValue : 0,
          produccion: field === 'produccion' ? numValue : 0,
          salidas: field === 'salidas' ? numValue : 0,
          stock_actual: 0
        };
        newItem.stock_actual = newItem.stock_inicial + newItem.produccion - newItem.salidas;
        copy.push(newItem);
      }
      return copy;
    });
  };

  const formatVE = (num: number) => {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div className="flex-1 text-gray-100 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-800/40 p-4 md:p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-cal-emerald/10 rounded-2xl border border-cal-emerald/20 shadow-lg shadow-cal-emerald/5">
              <Package className="w-8 h-8 text-cal-emerald" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">Kardex de Inventario</h1>
              <p className="text-sm text-gray-400">Control de entradas, salidas y existencias por sede</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input 
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 border border-cal-emerald/30 rounded-xl text-base sm:text-sm font-medium text-cal-emerald-light outline-none focus:ring-2 focus:ring-cal-emerald/50"
            />
            <select
              value={selectedSede}
              onChange={(e) => setSelectedSede(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-base sm:text-sm font-medium text-gray-200 outline-none focus:ring-2 focus:ring-cal-emerald/50"
            >
              {SEDES.map(sede => (
                <option key={sede} value={sede}>{sede}</option>
              ))}
            </select>

            {!isHistorical && (
              <div className="flex w-full sm:w-auto gap-2">
              <button
                onClick={handleCerrarDia}
                disabled={closing || saving || loading}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                title="Trasladar stock actual a inicial y resetear movimientos"
              >
                {closing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4 text-orange-400" />}
                Cerrar Día
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving || closing || loading}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-cal-emerald hover:bg-cal-emerald-light text-white rounded-xl shadow-lg shadow-cal-emerald/20 transition-all font-medium text-sm disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
            )}
          </div>
        </div>

        {/* Categories / Tables */}
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-10 h-10 animate-spin text-cal-emerald" />
          </div>
        ) : (
          <div className="space-y-8">
            {productosData.map((cat) => (
              <div key={cat.nombre} className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                
                <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-900/30 flex items-center gap-3">
                  <div className="p-2 bg-gray-800 rounded-lg border border-gray-700">
                    {cat.icon}
                  </div>
                  <h2 className="text-xl font-bold text-gray-100">{cat.nombre}</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-full md:min-w-[700px] table-fixed md:table-auto">
                    <thead>
                      <tr className="bg-gray-900/50 text-gray-400 text-[8px] md:text-xs uppercase tracking-wider">
                        <th className="px-1 md:px-6 py-2 md:py-4 font-semibold w-[32%] md:w-1/4 leading-tight">Producto</th>
                        <th className="px-0 md:px-6 py-2 md:py-4 font-semibold text-center border-l border-gray-700/50 leading-tight w-[17%]">Inicial</th>
                        <th className="px-0 md:px-6 py-2 md:py-4 font-semibold text-center text-emerald-400/80 leading-tight w-[17%]">Prod.</th>
                        <th className="px-0 md:px-6 py-2 md:py-4 font-semibold text-center text-red-400/80 leading-tight w-[17%]">Sale</th>
                        <th className="px-0 md:px-6 py-2 md:py-4 font-semibold text-center text-white border-l border-gray-700/50 leading-tight w-[17%]">Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {cat.productos.map((prod) => {
                        const item = getItem(cat.nombre, prod.nombre);
                        const isUnidad = prod.tipo_medida === 'Unidad';
                        return (
                          <tr key={prod.nombre} className={cn("transition-colors", isHistorical ? "" : "hover:bg-gray-700/20")}>
                            <td className="px-1.5 md:px-6 py-2 md:py-4 text-[10px] md:text-sm font-medium text-gray-200 leading-tight">
                              <span className="flex items-center gap-2">
                                {prod.nombre}
                                <span className="text-[8px] md:text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">{prod.tipo_medida}</span>
                              </span>
                              {item.updated_at && (
                                <div className="text-[8px] md:text-[10px] text-gray-500 font-normal mt-0.5 md:mt-1 leading-tight">
                                  Act: {new Date(item.updated_at).toLocaleTimeString('es-VE', {timeZone: 'America/Caracas', hour: '2-digit', minute:'2-digit'})}
                                  {item.updated_by && <span className="block text-emerald-500/80 mt-0">por {item.updated_by}</span>}
                                </div>
                              )}
                            </td>
                            
                            <td className="px-0.5 md:px-4 py-2 md:py-3 text-center border-l border-gray-700/50">
                                <input 
                                  type="number" 
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={item.stock_inicial === 0 ? '' : item.stock_inicial}
                                  onChange={(e) => updateItem(cat.nombre, prod.nombre, 'stock_inicial', e.target.value, isUnidad)}
                                  className="w-full max-w-[48px] sm:max-w-[64px] md:max-w-[96px] bg-gray-900/80 border border-gray-600 rounded md:rounded-lg px-0 md:px-2 py-1 md:py-2 text-center text-gray-200 text-[10px] md:text-sm focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald transition-all disabled:opacity-50 disabled:border-transparent mx-auto block"
                                  placeholder="0"
                                />
                            </td>
                            
                            <td className="px-0.5 md:px-4 py-2 md:py-3 text-center">
                                <input 
                                  type="number" 
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={item.produccion === 0 ? '' : item.produccion}
                                  onChange={(e) => updateItem(cat.nombre, prod.nombre, 'produccion', e.target.value, isUnidad)}
                                  className="w-full max-w-[48px] sm:max-w-[64px] md:max-w-[96px] bg-gray-900/80 border border-emerald-900/50 rounded md:rounded-lg px-0 md:px-2 py-1 md:py-2 text-center text-emerald-400 text-[10px] md:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:border-transparent mx-auto block"
                                  placeholder="0"
                                />
                            </td>

                            <td className="px-0.5 md:px-4 py-2 md:py-3 text-center">
                                <input 
                                  type="number" 
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={item.salidas === 0 ? '' : item.salidas}
                                  onChange={(e) => updateItem(cat.nombre, prod.nombre, 'salidas', e.target.value, isUnidad)}
                                  className="w-full max-w-[48px] sm:max-w-[64px] md:max-w-[96px] bg-gray-900/80 border border-red-900/50 rounded md:rounded-lg px-0 md:px-2 py-1 md:py-2 text-center text-red-400 text-[10px] md:text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all disabled:opacity-50 disabled:border-transparent mx-auto block"
                                  placeholder="0"
                                />
                            </td>

                            <td className="px-1 md:px-6 py-2 md:py-4 text-center border-l border-gray-700/50 bg-gray-900/20">
                              <span className={cn(
                                "text-sm md:text-xl font-bold tracking-wider",
                                item.stock_actual < 0 ? "text-red-500" : "text-cal-emerald-light"
                              )}>
                                {formatVE(item.stock_actual)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
