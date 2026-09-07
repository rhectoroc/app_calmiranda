import React, { useState, useEffect } from 'react';
import { Package, Save, RefreshCw, Archive, Layers, CalendarCheck, Calendar, Clock, Tag, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
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

const SEDES_OPTIONS = ['Ambas Sedes (Comparativo)', 'Hoyo de la Puerta', 'Guatire'];

export const InventarioView: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [selectedSede, setSelectedSede] = useState<string>('Ambas Sedes (Comparativo)');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fecha en formato local de Venezuela
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }).split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const isHistorical = selectedDate !== todayStr;
  const isDualView = selectedSede === 'Ambas Sedes (Comparativo)';

  useEffect(() => {
    fetchAvailableDates();
  }, []);

  useEffect(() => {
    fetchInventoryAndProductos();
  }, [selectedSede, selectedDate]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchAvailableDates = async () => {
    try {
      const res = await fetch('/api/inventario/fechas-disponibles');
      if (res.ok) {
        const dates = await res.json();
        setAvailableDates(dates);
      }
    } catch (e) {
      console.error('Error fetching available dates:', e);
    }
  };

  const fetchInventoryAndProductos = async () => {
    setLoading(true);
    try {
      const sedeQuery = !isDualView ? `&sede=${encodeURIComponent(selectedSede)}` : '';
      const endpoint = isHistorical 
        ? `/api/inventario/historial?fecha=${selectedDate}${sedeQuery}` 
        : '/api/inventario';

      const [invRes, prodRes] = await Promise.all([
        fetch(endpoint),
        fetch('/api/productos')
      ]);
      
      if (invRes.ok && prodRes.ok) {
        const invData = await invRes.json();
        const prodData = await prodRes.json();
        setRawProducts(prodData);
        
        const mappedInv = invData.map((item: any) => ({
          ...item,
          stock_inicial: parseFloat(item.stock_inicial) || 0,
          produccion: parseFloat(item.produccion) || 0,
          salidas: parseFloat(item.salidas) || 0,
          stock_actual: isHistorical 
            ? (parseFloat(item.stock_final) || 0) 
            : ((parseFloat(item.stock_inicial) || 0) + (parseFloat(item.produccion) || 0) - (parseFloat(item.salidas) || 0))
        }));

        setItems(mappedInv);
      }
    } catch (error) {
      console.error('Error fetching inventory and products:', error);
      showToast('error', 'Error al cargar datos del inventario.');
    } finally {
      setLoading(false);
    }
  };

  // Obtener categorías únicas según productos activos y sede seleccionada
  const getCategories = () => {
    const categoriesMap: Record<string, { nombre: string; tipo_medida: string }[]> = {};
    
    rawProducts.forEach((p: any) => {
      if (p.estado !== 'Activo') return;
      if (!isDualView && p.sede && p.sede !== 'Ambas' && p.sede !== selectedSede) {
        return;
      }
      if (!categoriesMap[p.categoria]) {
        categoriesMap[p.categoria] = [];
      }
      if (!categoriesMap[p.categoria].some(prod => prod.nombre === p.nombre)) {
        categoriesMap[p.categoria].push({
          nombre: p.nombre,
          tipo_medida: p.tipo_medida || 'Unidad'
        });
      }
    });

    return Object.keys(categoriesMap).map(cat => ({
      nombre: cat,
      icon: CATEGORIAS_ICONS[cat] || CATEGORIAS_ICONS['default'],
      productos: categoriesMap[cat]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemsToSave = isDualView 
        ? items.map(item => ({ ...item, updated_by: user?.name }))
        : items.filter(item => item.sede === selectedSede).map(item => ({ ...item, updated_by: user?.name }));

      const response = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave })
      });
      if (response.ok) {
        await fetchInventoryAndProductos();
        showToast('success', 'Cambios guardados exitosamente en la base de datos.');
      } else {
        showToast('error', 'No se pudo guardar el inventario.');
      }
    } catch (error) {
      console.error('Error saving inventory:', error);
      showToast('error', 'Error de red al guardar el inventario.');
    } finally {
      setSaving(false);
    }
  };

  const handleCerrarDia = async () => {
    const targetText = isDualView ? 'AMBAS SEDES (Hoyo de la Puerta y Guatire)' : selectedSede;
    if (!window.confirm(`¿Estás seguro de cerrar el día en ${targetText}?\n\nEsto guardará la foto de hoy en el historial, trasladará el Stock Final al Stock Inicial de mañana y reiniciará Entradas y Salidas en cero.\n\nESTA ACCIÓN NO SE PUEDE DESHACER.`)) {
      return;
    }
    setClosing(true);
    try {
      // 1. Guardar cambios actuales primero
      const itemsToSave = isDualView 
        ? items.map(item => ({ ...item, updated_by: user?.name }))
        : items.filter(item => item.sede === selectedSede).map(item => ({ ...item, updated_by: user?.name }));

      await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave })
      });
      
      // 2. Ejecutar cierre
      const targetSedePayload = isDualView ? 'Todas' : selectedSede;
      const response = await fetch('/api/inventario/cerrar-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sede: targetSedePayload, updated_by: user?.name })
      });

      if (response.ok) {
        await fetchInventoryAndProductos();
        await fetchAvailableDates();
        showToast('success', `Cierre de día completado exitosamente para ${targetText}.`);
      } else {
        showToast('error', 'Error al procesar el cierre de día.');
      }
    } catch (error) {
      console.error('Error closing day:', error);
      showToast('error', 'Error de red al cerrar el día.');
    } finally {
      setClosing(false);
    }
  };

  const getItem = (sedeName: string, categoria: string, producto: string): InventoryItem => {
    const existing = items.find(i => i.sede === sedeName && i.categoria === categoria && i.producto === producto);
    if (existing) return existing;
    return { sede: sedeName, categoria, producto, stock_inicial: 0, produccion: 0, salidas: 0, stock_actual: 0 };
  };

  const updateItem = (sedeName: string, categoria: string, producto: string, field: 'stock_inicial' | 'produccion' | 'salidas', value: string, isUnidad: boolean) => {
    if (isHistorical) return; // Modo lectura en historial
    
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;
    if (isUnidad) numValue = Math.floor(numValue);

    setItems(prev => {
      const copy = [...prev];
      const index = copy.findIndex(i => i.sede === sedeName && i.categoria === categoria && i.producto === producto);
      
      if (index >= 0) {
        const item = copy[index];
        const updatedItem = { ...item, [field]: numValue };
        updatedItem.stock_actual = updatedItem.stock_inicial + updatedItem.produccion - updatedItem.salidas;
        copy[index] = updatedItem;
      } else {
        const newItem: InventoryItem = {
          sede: sedeName,
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

  const categories = getCategories();
  const hasHistoryForDate = !isHistorical || (items.length > 0);

  return (
    <div className="flex-1 text-gray-100 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 pb-12">
        
        {/* Toast Notification */}
        {notification && (
          <div className={cn(
            "p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-fadeIn",
            notification.type === 'success' 
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200" 
              : "bg-red-950/80 border-red-500/50 text-red-200"
          )}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-xs opacity-75 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-gray-850/80 p-5 md:p-6 rounded-2xl border border-gray-700/60 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-cal-emerald/10 rounded-2xl border border-cal-emerald/25 shadow-lg shadow-cal-emerald/5 flex-shrink-0">
              <Package className="w-8 h-8 text-cal-emerald" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1.5">
                Kardex de Inventario
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>Control diario de stock, producción y despachos</span>
                <span className="text-gray-600 hidden sm:inline">•</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-800/90 border border-gray-700 text-gray-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-cal-emerald" />
                  <span>Cierre auto: <strong className="text-gray-200">6:00 PM VET</strong></span>
                </div>
                {isDualView && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cal-emerald/10 border border-cal-emerald/30 text-cal-emerald-light font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-cal-emerald animate-pulse" />
                    <span>2 Sedes activas</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action and Filter Controls Group */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Date Selector */}
            <div className="relative flex items-center h-10 px-3 bg-gray-900/90 border border-gray-700 hover:border-gray-600 focus-within:border-cal-emerald/60 focus-within:ring-2 focus-within:ring-cal-emerald/20 rounded-xl transition-all shadow-inner w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-cal-emerald mr-2 flex-shrink-0" />
              <input 
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-200 outline-none cursor-pointer w-full sm:w-auto"
                title="Seleccionar fecha"
              />
            </div>

            {/* Sede Selector */}
            <div className="relative flex items-center h-10 px-3 bg-gray-900/90 border border-gray-700 hover:border-gray-600 focus-within:border-cal-emerald/60 focus-within:ring-2 focus-within:ring-cal-emerald/20 rounded-xl transition-all shadow-inner w-full sm:w-auto">
              <Building2 className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <select
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-200 outline-none cursor-pointer pr-4 w-full sm:w-auto"
              >
                {SEDES_OPTIONS.map(sede => (
                  <option key={sede} value={sede} className="bg-gray-900 text-gray-200">{sede}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            {!isHistorical && (
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={handleCerrarDia}
                  disabled={closing || saving || loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-gray-800/90 hover:bg-gray-700/90 active:bg-gray-800 text-gray-300 hover:text-white border border-gray-600/60 rounded-xl transition-all font-medium text-xs disabled:opacity-50 shadow-sm"
                  title="Cierra el día manualmente y traslada el saldo a mañana"
                >
                  {closing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  ) : (
                    <CalendarCheck className="w-3.5 h-3.5 text-orange-400" />
                  )}
                  <span>Cerrar Día</span>
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={saving || closing || loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-5 bg-cal-emerald hover:bg-cal-emerald-light active:bg-cal-emerald-dark text-white rounded-xl shadow-lg shadow-cal-emerald/20 hover:shadow-cal-emerald/30 transition-all font-semibold text-xs disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Guardar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Historical Alert & Quick Date Selector */}
        {isHistorical && (
          <div className={cn(
            "p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md",
            hasHistoryForDate ? "bg-blue-950/30 border-blue-800/40 text-blue-200" : "bg-amber-950/30 border-amber-800/40 text-amber-200"
          )}>
            <div className="flex items-center gap-3">
              {hasHistoryForDate ? <CalendarCheck className="w-5 h-5 text-blue-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
              <div>
                <p className="font-semibold text-sm">
                  {hasHistoryForDate 
                    ? `Visualizando Historial del ${selectedDate} (Modo Lectura)`
                    : `No hay cierre de inventario registrado para el día ${selectedDate}`
                  }
                </p>
                <p className="text-xs opacity-75">
                  {hasHistoryForDate 
                    ? 'Los datos corresponden a la fotografía oficial almacenada durante el cierre de esa jornada.'
                    : 'Selecciona una de las fechas con historial registrado o vuelve al día de hoy.'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 border border-gray-600 transition-colors"
              >
                Volver a Hoy ({todayStr})
              </button>

              {availableDates.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs opacity-70">Cierres guardados:</span>
                  <select
                    value={availableDates.includes(selectedDate) ? selectedDate : ''}
                    onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
                    className="bg-gray-900 border border-gray-700 text-xs text-cal-emerald-light rounded-lg px-2 py-1 outline-none"
                  >
                    <option value="">Seleccionar fecha...</option>
                    {availableDates.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories / Tables */}
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-24">
            <RefreshCw className="w-10 h-10 animate-spin text-cal-emerald" />
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((cat) => (
              <div key={cat.nombre} className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                
                {/* Category Header */}
                <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg border border-gray-700 shadow-sm">
                      {cat.icon}
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-gray-100">{cat.nombre}</h2>
                      <span className="text-xs text-gray-400">{cat.productos.length} productos</span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  {isDualView ? (
                    // -------------------------------------------------------------
                    // VISTA UNIFICADA: AMBAS SEDES EN LA MISMA TABLA
                    // -------------------------------------------------------------
                    <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                      <thead>
                        {/* Top header grouping */}
                        <tr className="bg-gray-900/80 text-gray-300 text-xs uppercase tracking-wider border-b border-gray-700">
                          <th rowSpan={2} className="px-4 py-3 font-bold w-[24%] border-r border-gray-700/60 bg-gray-900/90">
                            Producto & Presentación
                          </th>
                          <th colSpan={4} className="text-center py-2 border-r border-gray-700/80 bg-blue-950/20 text-blue-300 font-semibold tracking-wide">
                            📍 HOYO DE LA PUERTA
                          </th>
                          <th colSpan={4} className="text-center py-2 bg-emerald-950/20 text-emerald-300 font-semibold tracking-wide">
                            📍 GUATIRE
                          </th>
                        </tr>
                        {/* Sub headers */}
                        <tr className="bg-gray-900/60 text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-700/60">
                          {/* Hoyo de la Puerta */}
                          <th className="py-2 px-1 text-center font-medium w-[9%] border-r border-gray-800">Inicial</th>
                          <th className="py-2 px-1 text-center font-medium w-[9%] text-emerald-400 border-r border-gray-800">Prod</th>
                          <th className="py-2 px-1 text-center font-medium w-[9%] text-red-400 border-r border-gray-800">Sale</th>
                          <th className="py-2 px-1 text-center font-bold w-[11%] text-white border-r border-gray-700/80 bg-gray-900/30">Total Hoyo</th>

                          {/* Guatire */}
                          <th className="py-2 px-1 text-center font-medium w-[9%] border-r border-gray-800">Inicial</th>
                          <th className="py-2 px-1 text-center font-medium w-[9%] text-emerald-400 border-r border-gray-800">Prod</th>
                          <th className="py-2 px-1 text-center font-medium w-[9%] text-red-400 border-r border-gray-800">Sale</th>
                          <th className="py-2 px-1 text-center font-bold w-[11%] text-white bg-gray-900/30">Total Guatire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/40 text-sm">
                        {cat.productos.map((prod) => {
                          const itemHoyo = getItem('Hoyo de la Puerta', cat.nombre, prod.nombre);
                          const itemGuatire = getItem('Guatire', cat.nombre, prod.nombre);
                          const isUnidad = prod.tipo_medida === 'Unidad';

                          return (
                            <tr key={prod.nombre} className="hover:bg-gray-700/20 transition-colors">
                              {/* Producto Info */}
                              <td className="px-4 py-3 font-medium text-gray-200 border-r border-gray-700/60 bg-gray-900/20">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-100 text-xs md:text-sm">{prod.nombre}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                                      {prod.tipo_medida}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Hoyo de la Puerta: Inicial */}
                              <td className="p-1 text-center border-r border-gray-800">
                                <input
                                  type="number"
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={itemHoyo.stock_inicial === 0 ? '' : itemHoyo.stock_inicial}
                                  onChange={(e) => updateItem('Hoyo de la Puerta', cat.nombre, prod.nombre, 'stock_inicial', e.target.value, isUnidad)}
                                  className="w-full max-w-[70px] bg-gray-900/80 border border-gray-700 rounded px-1.5 py-1 text-center text-xs text-gray-200 focus:outline-none focus:border-cal-emerald mx-auto block disabled:opacity-50 disabled:border-transparent"
                                  placeholder="0"
                                />
                              </td>
                              {/* Hoyo de la Puerta: Produccion */}
                              <td className="p-1 text-center border-r border-gray-800">
                                <input
                                  type="number"
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={itemHoyo.produccion === 0 ? '' : itemHoyo.produccion}
                                  onChange={(e) => updateItem('Hoyo de la Puerta', cat.nombre, prod.nombre, 'produccion', e.target.value, isUnidad)}
                                  className="w-full max-w-[70px] bg-gray-900/80 border border-emerald-900/60 rounded px-1.5 py-1 text-center text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 mx-auto block disabled:opacity-50 disabled:border-transparent"
                                  placeholder="0"
                                />
                              </td>
                              {/* Hoyo de la Puerta: Salidas */}
                              <td className="p-1 text-center border-r border-gray-800">
                                <input
                                  type="number"
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={itemHoyo.salidas === 0 ? '' : itemHoyo.salidas}
                                  onChange={(e) => updateItem('Hoyo de la Puerta', cat.nombre, prod.nombre, 'salidas', e.target.value, isUnidad)}
                                  className="w-full max-w-[70px] bg-gray-900/80 border border-red-900/60 rounded px-1.5 py-1 text-center text-xs text-red-400 focus:outline-none focus:border-red-500 mx-auto block disabled:opacity-50 disabled:border-transparent"
                                  placeholder="0"
                                />
                              </td>
                              {/* Hoyo de la Puerta: Total */}
                              <td className="p-1.5 text-center border-r border-gray-700/80 bg-gray-900/30">
                                <span className={cn(
                                  "text-xs md:text-sm font-bold tracking-wider",
                                  itemHoyo.stock_actual < 0 ? "text-red-400" : "text-blue-300"
                                )}>
                                  {formatVE(itemHoyo.stock_actual)}
                                </span>
                              </td>

                              {/* Guatire: Inicial */}
                              <td className="p-1 text-center border-r border-gray-800">
                                <input
                                  type="number"
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={itemGuatire.stock_inicial === 0 ? '' : itemGuatire.stock_inicial}
                                  onChange={(e) => updateItem('Guatire', cat.nombre, prod.nombre, 'stock_inicial', e.target.value, isUnidad)}
                                  className="w-full max-w-[70px] bg-gray-900/80 border border-gray-700 rounded px-1.5 py-1 text-center text-xs text-gray-200 focus:outline-none focus:border-cal-emerald mx-auto block disabled:opacity-50 disabled:border-transparent"
                                  placeholder="0"
                                />
                              </td>
                              {/* Guatire: Produccion */}
                              <td className="p-1 text-center border-r border-gray-800">
                                <input
                                  type="number"
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={itemGuatire.produccion === 0 ? '' : itemGuatire.produccion}
                                  onChange={(e) => updateItem('Guatire', cat.nombre, prod.nombre, 'produccion', e.target.value, isUnidad)}
                                  className="w-full max-w-[70px] bg-gray-900/80 border border-emerald-900/60 rounded px-1.5 py-1 text-center text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 mx-auto block disabled:opacity-50 disabled:border-transparent"
                                  placeholder="0"
                                />
                              </td>
                              {/* Guatire: Salidas */}
                              <td className="p-1 text-center border-r border-gray-800">
                                <input
                                  type="number"
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={itemGuatire.salidas === 0 ? '' : itemGuatire.salidas}
                                  onChange={(e) => updateItem('Guatire', cat.nombre, prod.nombre, 'salidas', e.target.value, isUnidad)}
                                  className="w-full max-w-[70px] bg-gray-900/80 border border-red-900/60 rounded px-1.5 py-1 text-center text-xs text-red-400 focus:outline-none focus:border-red-500 mx-auto block disabled:opacity-50 disabled:border-transparent"
                                  placeholder="0"
                                />
                              </td>
                              {/* Guatire: Total */}
                              <td className="p-1.5 text-center bg-gray-900/30">
                                <span className={cn(
                                  "text-xs md:text-sm font-bold tracking-wider",
                                  itemGuatire.stock_actual < 0 ? "text-red-400" : "text-emerald-300"
                                )}>
                                  {formatVE(itemGuatire.stock_actual)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    // -------------------------------------------------------------
                    // VISTA INDIVIDUAL (UNA SOLA SEDE SELECCIONADA)
                    // -------------------------------------------------------------
                    <table className="w-full text-left border-collapse min-w-full md:min-w-[700px] table-fixed md:table-auto">
                      <thead>
                        <tr className="bg-gray-900/50 text-gray-400 text-[10px] md:text-xs uppercase tracking-wider">
                          <th className="px-3 md:px-6 py-2.5 md:py-4 font-semibold w-[35%] md:w-1/4 leading-tight">Producto</th>
                          <th className="px-1 md:px-6 py-2.5 md:py-4 font-semibold text-center border-l border-gray-700/50 leading-tight w-[16%]">Inicial</th>
                          <th className="px-1 md:px-6 py-2.5 md:py-4 font-semibold text-center text-emerald-400/90 leading-tight w-[16%]">Producción</th>
                          <th className="px-1 md:px-6 py-2.5 md:py-4 font-semibold text-center text-red-400/90 leading-tight w-[16%]">Salidas</th>
                          <th className="px-2 md:px-6 py-2.5 md:py-4 font-semibold text-center text-white border-l border-gray-700/50 leading-tight w-[17%]">Saldo Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {cat.productos.map((prod) => {
                          const item = getItem(selectedSede, cat.nombre, prod.nombre);
                          const isUnidad = prod.tipo_medida === 'Unidad';
                          return (
                            <tr key={prod.nombre} className={cn("transition-colors", isHistorical ? "" : "hover:bg-gray-700/20")}>
                              <td className="px-3 md:px-6 py-2.5 md:py-4 text-xs md:text-sm font-medium text-gray-200 leading-tight">
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                                  <span className="break-words leading-tight">{prod.nombre}</span>
                                  <span className="inline-block text-[8px] md:text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 w-fit">
                                    {prod.tipo_medida}
                                  </span>
                                </div>
                                {item.updated_at && (
                                  <div className="text-[9px] md:text-[11px] text-gray-500 font-normal mt-1 leading-tight">
                                    Act: {new Date(item.updated_at).toLocaleTimeString('es-VE', {timeZone: 'America/Caracas', hour: '2-digit', minute:'2-digit'})}
                                    {item.updated_by && <span className="block text-emerald-500/80">por {item.updated_by}</span>}
                                  </div>
                                )}
                              </td>
                              
                              <td className="px-1 md:px-4 py-2 md:py-3 text-center border-l border-gray-700/50">
                                <input 
                                  type="number" 
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={item.stock_inicial === 0 ? '' : item.stock_inicial}
                                  onChange={(e) => updateItem(selectedSede, cat.nombre, prod.nombre, 'stock_inicial', e.target.value, isUnidad)}
                                  className="w-full max-w-[80px] md:max-w-[100px] bg-gray-900/80 border border-gray-600 rounded-lg px-2 py-1.5 text-center text-gray-200 text-xs md:text-sm focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald transition-all disabled:opacity-50 disabled:border-transparent mx-auto block"
                                  placeholder="0"
                                />
                              </td>
                              
                              <td className="px-1 md:px-4 py-2 md:py-3 text-center">
                                <input 
                                  type="number" 
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={item.produccion === 0 ? '' : item.produccion}
                                  onChange={(e) => updateItem(selectedSede, cat.nombre, prod.nombre, 'produccion', e.target.value, isUnidad)}
                                  className="w-full max-w-[80px] md:max-w-[100px] bg-gray-900/80 border border-emerald-900/50 rounded-lg px-2 py-1.5 text-center text-emerald-400 text-xs md:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:border-transparent mx-auto block"
                                  placeholder="0"
                                />
                              </td>

                              <td className="px-1 md:px-4 py-2 md:py-3 text-center">
                                <input 
                                  type="number" 
                                  min="0"
                                  step={isUnidad ? "1" : "0.01"}
                                  disabled={isHistorical}
                                  value={item.salidas === 0 ? '' : item.salidas}
                                  onChange={(e) => updateItem(selectedSede, cat.nombre, prod.nombre, 'salidas', e.target.value, isUnidad)}
                                  className="w-full max-w-[80px] md:max-w-[100px] bg-gray-900/80 border border-red-900/50 rounded-lg px-2 py-1.5 text-center text-red-400 text-xs md:text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all disabled:opacity-50 disabled:border-transparent mx-auto block"
                                  placeholder="0"
                                />
                              </td>

                              <td className="px-2 md:px-6 py-2.5 md:py-4 text-center border-l border-gray-700/50 bg-gray-900/20">
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
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
