import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, Search, X, Check, Package } from 'lucide-react';

// Redefine cn just in case
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
function classNames(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface Producto {
  id?: number;
  nombre: string;
  categoria: string;
  sku?: string;
  tipo_medida?: 'Unidad' | 'Peso';
  peso: number;
  presentacion: string;
  precio: number;
  estado: string;
  created_at?: string;
  updated_at?: string;
}

export const ProductosView: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProducto, setCurrentProducto] = useState<Producto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isNewCategoria, setIsNewCategoria] = useState(false);
  const [isNewPresentacion, setIsNewPresentacion] = useState(false);

  // Category Management Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{old: string, new: string} | null>(null);

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/productos');
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
      }
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProductos = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (producto?: Producto) => {
    setIsNewCategoria(false);
    setIsNewPresentacion(false);
    
    if (producto) {
      setCurrentProducto(producto);
    } else {
      setCurrentProducto({
        nombre: '',
        categoria: '',
        sku: '',
        tipo_medida: 'Unidad',
        peso: 0,
        presentacion: '',
        precio: 0,
        estado: 'Activo'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentProducto(null);
  };

  const handleSaveProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProducto) return;
    
    setIsSaving(true);
    try {
      const isEditing = !!currentProducto.id;
      const url = isEditing ? `/api/productos/${currentProducto.id}` : '/api/productos';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProducto)
      });

      if (response.ok) {
        await fetchProductos();
        handleCloseModal();
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.error}`);
      }
    } catch (error) {
      console.error('Error saving producto:', error);
      alert('Error de conexión al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto? Esto podría afectar el historial si se eliminan productos activos.')) return;
    
    try {
      const response = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchProductos();
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.error}`);
      }
    } catch (error) {
      console.error('Error deleting producto:', error);
    }
  };

  const handleRenameCategory = async () => {
    if (!editingCategory || !editingCategory.new.trim() || editingCategory.old === editingCategory.new) {
      setEditingCategory(null);
      return;
    }
    try {
      const response = await fetch('/api/productos/categorias/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCategoria: editingCategory.old, newCategoria: editingCategory.new })
      });
      if (response.ok) {
        await fetchProductos();
        setEditingCategory(null);
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error renaming category:', error);
      alert('Error de conexión.');
    }
  };

  const existingCategorias = Array.from(new Set(productos.map(p => p.categoria))).filter(Boolean).sort();
  const existingPresentaciones = Array.from(new Set(productos.map(p => p.presentacion))).filter(Boolean).sort();

  return (
    <div className="flex-1 text-gray-100 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-800/40 p-4 md:p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-cal-emerald/10 rounded-2xl border border-cal-emerald/20 shadow-lg shadow-cal-emerald/5">
              <Tag className="w-8 h-8 text-cal-emerald" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">Catálogo de Productos</h1>
              <p className="text-sm text-gray-400">Gestión de productos, especificaciones y categorías</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-cal-emerald/50"
              />
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-xl transition-all font-medium text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Gestionar Categorías
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2.5 bg-cal-emerald hover:bg-cal-emerald-light text-white rounded-xl shadow-lg shadow-cal-emerald/20 transition-all font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Productos Table */}
        <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Producto</th>
                  <th className="px-6 py-4 font-semibold">SKU / Presentación</th>
                  <th className="px-6 py-4 font-semibold">Categoría</th>
                  <th className="px-6 py-4 font-semibold text-center">Peso</th>
                  <th className="px-6 py-4 font-semibold text-center">Estado</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                      Cargando productos...
                    </td>
                  </tr>
                ) : filteredProductos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                      No se encontraron productos.
                    </td>
                  </tr>
                ) : (
                  filteredProductos.map((prod) => (
                    <tr key={prod.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-700/50">
                            <Package className="w-4 h-4 text-cal-emerald-light" />
                          </div>
                          <span className="font-medium text-gray-200">{prod.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-300">{prod.sku || 'N/A'}</span>
                          <span className="text-xs text-gray-500">{prod.presentacion || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {prod.categoria}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-300">
                        {prod.peso ? `${prod.peso} kg` : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={classNames(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                          prod.estado === 'Activo' 
                            ? "bg-cal-emerald/10 text-cal-emerald-light border-cal-emerald/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          <span className={classNames(
                            "w-1.5 h-1.5 rounded-full",
                            prod.estado === 'Activo' ? "bg-cal-emerald-light" : "bg-red-400"
                          )} />
                          {prod.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(prod)}
                            className="p-2 text-gray-400 hover:text-cal-emerald hover:bg-cal-emerald/10 rounded-lg transition-colors"
                            title="Editar Producto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => prod.id && handleDelete(prod.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar Producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal CRUD */}
      {isModalOpen && currentProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
              <h3 className="text-xl font-bold text-white">
                {currentProducto.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="producto-form" onSubmit={handleSaveProducto} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre del Producto</label>
                    <input 
                      required
                      type="text" 
                      value={currentProducto.nombre}
                      onChange={e => setCurrentProducto({...currentProducto, nombre: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                      placeholder="Ej: Cal en Pasta 7kg"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="flex justify-between items-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Categoría
                      {isNewCategoria && (
                        <button type="button" onClick={() => setIsNewCategoria(false)} className="text-cal-emerald-light hover:underline lowercase text-[10px]">
                          Volver a la lista
                        </button>
                      )}
                    </label>
                    {isNewCategoria || existingCategorias.length === 0 ? (
                      <input 
                        required
                        type="text" 
                        value={currentProducto.categoria}
                        onChange={e => setCurrentProducto({...currentProducto, categoria: e.target.value})}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                        placeholder="Escribe la nueva categoría..."
                      />
                    ) : (
                      <select
                        required
                        value={existingCategorias.includes(currentProducto.categoria) ? currentProducto.categoria : (currentProducto.categoria === '' ? '' : 'NEW')}
                        onChange={e => {
                          if (e.target.value === 'NEW') {
                            setIsNewCategoria(true);
                            setCurrentProducto({...currentProducto, categoria: ''});
                          } else {
                            setCurrentProducto({...currentProducto, categoria: e.target.value});
                          }
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                      >
                        <option value="" disabled>Selecciona una categoría...</option>
                        {existingCategorias.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="NEW" className="font-bold text-cal-emerald-light">+ Agregar nueva categoría</option>
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tipo de Cuantificación</label>
                    <select
                      value={currentProducto.tipo_medida || 'Unidad'}
                      onChange={e => setCurrentProducto({...currentProducto, tipo_medida: e.target.value as 'Unidad' | 'Peso'})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                    >
                      <option value="Unidad">Unidad (Enteros)</option>
                      <option value="Peso">Peso / Volumen (Permite decimales)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">SKU / Código</label>
                    <input 
                      type="text" 
                      value={currentProducto.sku}
                      onChange={e => setCurrentProducto({...currentProducto, sku: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                      placeholder="Ej: BCP-007"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Peso (kg)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={currentProducto.peso || ''}
                      onChange={e => setCurrentProducto({...currentProducto, peso: parseFloat(e.target.value) || 0})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                      placeholder="Ej: 7.00"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex justify-between items-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Presentación
                      {isNewPresentacion && (
                        <button type="button" onClick={() => setIsNewPresentacion(false)} className="text-cal-emerald-light hover:underline lowercase text-[10px]">
                          Volver a la lista
                        </button>
                      )}
                    </label>
                    {isNewPresentacion || existingPresentaciones.length === 0 ? (
                      <input 
                        type="text" 
                        value={currentProducto.presentacion}
                        onChange={e => setCurrentProducto({...currentProducto, presentacion: e.target.value})}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                        placeholder="Ej: Bolsa, Saco, Pipote..."
                      />
                    ) : (
                      <select
                        value={existingPresentaciones.includes(currentProducto.presentacion) ? currentProducto.presentacion : (currentProducto.presentacion === '' ? '' : 'NEW')}
                        onChange={e => {
                          if (e.target.value === 'NEW') {
                            setIsNewPresentacion(true);
                            setCurrentProducto({...currentProducto, presentacion: ''});
                          } else {
                            setCurrentProducto({...currentProducto, presentacion: e.target.value});
                          }
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                      >
                        <option value="">Ninguna / Seleccionar...</option>
                        {existingPresentaciones.map(pres => (
                          <option key={pres} value={pres}>{pres}</option>
                        ))}
                        <option value="NEW" className="font-bold text-cal-emerald-light">+ Agregar nueva presentación</option>
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Precio (USD) Referencial</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={currentProducto.precio || ''}
                      onChange={e => setCurrentProducto({...currentProducto, precio: parseFloat(e.target.value) || 0})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                      placeholder="Ej: 15.00"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Estado Operativo</label>
                    <select 
                      value={currentProducto.estado}
                      onChange={e => setCurrentProducto({...currentProducto, estado: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald"
                    >
                      <option value="Activo">Activo (Visible en Kardex)</option>
                      <option value="Inactivo">Inactivo / Descontinuado</option>
                    </select>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="producto-form"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-cal-emerald hover:bg-cal-emerald-light text-white rounded-xl shadow-lg shadow-cal-emerald/20 transition-all font-medium text-sm disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar Producto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Categorías */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
              <h3 className="text-xl font-bold text-white">Gestionar Categorías</h3>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-2">
              {existingCategorias.length === 0 && <p className="text-gray-400 text-sm text-center">No hay categorías registradas.</p>}
              {existingCategorias.map(cat => (
                <div key={cat} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl border border-gray-700/50">
                  {editingCategory?.old === cat ? (
                    <input 
                      autoFocus
                      type="text"
                      value={editingCategory.new}
                      onChange={(e) => setEditingCategory({...editingCategory, new: e.target.value})}
                      className="flex-1 bg-gray-900 border border-cal-emerald rounded-lg px-3 py-1 text-sm text-white focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-200">{cat}</span>
                  )}
                  
                  <div className="ml-3 flex gap-1">
                    {editingCategory?.old === cat ? (
                      <>
                        <button onClick={handleRenameCategory} className="p-1.5 bg-cal-emerald/10 text-cal-emerald hover:bg-cal-emerald hover:text-white rounded-lg transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingCategory(null)} className="p-1.5 bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setEditingCategory({ old: cat, new: cat })} className="p-1.5 text-gray-400 hover:text-cal-emerald hover:bg-cal-emerald/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
