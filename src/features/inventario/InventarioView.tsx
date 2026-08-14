import React, { useState, useEffect } from 'react';
import { Package, Save, RefreshCw, Archive, Layers, CalendarCheck } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface InventoryItem {
  id?: number;
  sede: string;
  categoria: string;
  producto: string;
  stock_inicial: number;
  entradas: number;
  salidas: number;
  stock_actual: number;
  updated_at?: string;
  updated_by?: string;
}

const CATEGORIAS = [
  {
    nombre: 'Producto Terminado',
    icon: <Package className="w-5 h-5 text-cal-emerald-light" />,
    productos: [
      'Pipotes Cal en Pasta 270kg',
      'Bolsas de Cal en Pasta 7kg',
      'Bolsas de Cal en Pasta 5kg',
      'Pinturas Ecológicas'
    ]
  },
  {
    nombre: 'Canto Rodado',
    icon: <Layers className="w-5 h-5 text-cal-emerald-light" />,
    productos: [
      'Gris #1 (6kg)',
      'Gris #1 (20kg)',
      'Rojo #3',
      'Piedra'
    ]
  },
  {
    nombre: 'Insumos y Muestrarios',
    icon: <Archive className="w-5 h-5 text-cal-emerald-light" />,
    productos: [
      'Pipotes Vacíos',
      'Pipotes Muestrarios Grandes',
      'Pipotes Muestrarios Pequeños',
      'Bolsas de 7kg (Vacías)',
      'Bolsas Sello Original',
      'Bolsas Rotas de 7kg',
      'Bolsas Rotas de 5kg'
    ]
  }
];

const SEDES = ['Hoyo de la Puerta', 'Guatire'];

export const InventarioView: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedSede, setSelectedSede] = useState<string>('Hoyo de la Puerta');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [selectedSede]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventario');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
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
        await fetchInventory();
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
        await fetchInventory();
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
    return { sede: selectedSede, categoria, producto, stock_inicial: 0, entradas: 0, salidas: 0, stock_actual: 0 };
  };

  const updateItem = (categoria: string, producto: string, field: 'stock_inicial' | 'entradas' | 'salidas', value: string) => {
    const numValue = parseFloat(value) || 0;
    setItems(prev => {
      const copy = [...prev];
      const index = copy.findIndex(i => i.sede === selectedSede && i.categoria === categoria && i.producto === producto);
      
      if (index >= 0) {
        const item = copy[index];
        const updatedItem = { ...item, [field]: numValue };
        updatedItem.stock_actual = updatedItem.stock_inicial + updatedItem.entradas - updatedItem.salidas;
        copy[index] = updatedItem;
      } else {
        const newItem = {
          sede: selectedSede,
          categoria,
          producto,
          stock_inicial: field === 'stock_inicial' ? numValue : 0,
          entradas: field === 'entradas' ? numValue : 0,
          salidas: field === 'salidas' ? numValue : 0,
          stock_actual: 0
        };
        newItem.stock_actual = newItem.stock_inicial + newItem.entradas - newItem.salidas;
        copy.push(newItem);
      }
      return copy;
    });
  };

  const formatVE = (num: number) => {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div className="flex-1 p-8 text-gray-100 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-cal-emerald/10 rounded-2xl border border-cal-emerald/20 shadow-lg shadow-cal-emerald/5">
              <Package className="w-8 h-8 text-cal-emerald" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Kardex de Inventario</h1>
              <p className="text-sm text-gray-400">Control de entradas, salidas y existencias por sede</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={selectedSede}
              onChange={(e) => setSelectedSede(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-base sm:text-sm font-medium text-gray-200 outline-none focus:ring-2 focus:ring-cal-emerald/50"
            >
              {SEDES.map(sede => (
                <option key={sede} value={sede}>{sede}</option>
              ))}
            </select>

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
          </div>
        </div>

        {/* Categories / Tables */}
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-10 h-10 animate-spin text-cal-emerald" />
          </div>
        ) : (
          <div className="space-y-8">
            {CATEGORIAS.map((cat) => (
              <div key={cat.nombre} className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                
                <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-900/30 flex items-center gap-3">
                  <div className="p-2 bg-gray-800 rounded-lg border border-gray-700">
                    {cat.icon}
                  </div>
                  <h2 className="text-xl font-bold text-gray-100">{cat.nombre}</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold w-1/4">Producto</th>
                        <th className="px-6 py-4 font-semibold text-center border-l border-gray-700/50">Stock Inicial</th>
                        <th className="px-6 py-4 font-semibold text-center text-emerald-400/80">Entradas (+)</th>
                        <th className="px-6 py-4 font-semibold text-center text-red-400/80">Salidas (-)</th>
                        <th className="px-6 py-4 font-semibold text-center text-white border-l border-gray-700/50">Stock Final (=)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {cat.productos.map((prod) => {
                        const item = getItem(cat.nombre, prod);
                        return (
                          <tr key={prod} className="hover:bg-gray-700/20 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-200">
                              {prod}
                              {item.updated_at && (
                                <div className="text-[10px] text-gray-500 font-normal mt-1 leading-tight">
                                  Act: {new Date(item.updated_at).toLocaleTimeString('es-VE', {timeZone: 'America/Caracas', hour: '2-digit', minute:'2-digit'})}
                                  {item.updated_by && <span className="block text-emerald-500/80 mt-0.5">por {item.updated_by}</span>}
                                </div>
                              )}
                            </td>
                            
                            <td className="px-4 py-3 text-center border-l border-gray-700/50">
                              <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                value={item.stock_inicial || ''}
                                onChange={(e) => updateItem(cat.nombre, prod, 'stock_inicial', e.target.value)}
                                className="w-24 bg-gray-900/80 border border-gray-600 rounded-lg px-2 py-2 text-center text-gray-200 focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald transition-all"
                                placeholder="0,00"
                              />
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                value={item.entradas || ''}
                                onChange={(e) => updateItem(cat.nombre, prod, 'entradas', e.target.value)}
                                className="w-24 bg-gray-900/80 border border-emerald-900/50 rounded-lg px-2 py-2 text-center text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                placeholder="0,00"
                              />
                            </td>

                            <td className="px-4 py-3 text-center">
                              <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                value={item.salidas || ''}
                                onChange={(e) => updateItem(cat.nombre, prod, 'salidas', e.target.value)}
                                className="w-24 bg-gray-900/80 border border-red-900/50 rounded-lg px-2 py-2 text-center text-red-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                                placeholder="0,00"
                              />
                            </td>

                            <td className="px-6 py-4 text-center border-l border-gray-700/50 bg-gray-900/20">
                              <span className={cn(
                                "text-xl font-bold tracking-wider",
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
