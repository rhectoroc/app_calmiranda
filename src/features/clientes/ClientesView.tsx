import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  DollarSign, 
  Clock, 
  ShieldAlert, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface Cliente {
  id_cliente: string;
  zona: string;
  nombre: string;
  rif?: string;
  direccion?: string;
  ubicacion?: string;
  contacto_1?: string;
  telefono_1?: string;
  movil?: string;
  telefono_2?: string;
  contacto_2?: string;
  telefono_3?: string;
  email?: string;
  estatus: string;
  vendedor?: string;
  tiempo_promedio_pedido?: string;
  historial_negociacion?: string;
  comentario?: string;
  ultimo_precio?: number;
  dias_credito: number;
  ultima_llamada?: string;
  proxima_llamada?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export const ClientesView: React.FC = () => {
  // Estado de la lista
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [activeModal, setActiveModal] = useState<'details' | 'edit' | 'create' | 'delete' | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [activeTab, setActiveTab] = useState<'basicos' | 'contacto' | 'comercial' | 'seguimiento'>('basicos');

  // Formulario
  const [formData, setFormData] = useState<Partial<Cliente>>({});

  // Cargar clientes desde el servidor
  const fetchClientes = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status: statusFilter
      });
      const res = await fetch(`/api/clientes?${queryParams}`);
      if (res.ok) {
        const result = await res.json();
        setClientes(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } else {
        console.error('Error al obtener clientes');
      }
    } catch (error) {
      console.error('Error de red al cargar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [page, search, statusFilter]);

  // Formateadores de fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin registrar';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setFormData({
      nombre: '',
      zona: '',
      rif: '',
      direccion: '',
      ubicacion: '',
      contacto_1: '',
      telefono_1: '',
      movil: '',
      telefono_2: '',
      contacto_2: '',
      telefono_3: '',
      email: '',
      estatus: 'Activo',
      vendedor: '',
      tiempo_promedio_pedido: '',
      historial_negociacion: '',
      comentario: '',
      ultimo_precio: undefined,
      dias_credito: 0,
      ultima_llamada: '',
      proxima_llamada: ''
    });
    setActiveTab('basicos');
    setActiveModal('create');
  };

  // Abrir Modal Detalles
  const handleOpenDetails = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setActiveTab('basicos');
    setActiveModal('details');
  };

  // Abrir Modal Editar
  const handleOpenEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormData({ ...cliente });
    setActiveTab('basicos');
    setActiveModal('edit');
  };

  // Abrir Modal Eliminar
  const handleOpenDelete = (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCliente(cliente);
    setActiveModal('delete');
  };

  // Guardar Cambios (Crear o Editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.zona) {
      alert('Nombre y Zona son campos requeridos.');
      return;
    }

    try {
      const url = activeModal === 'create' 
        ? '/api/clientes' 
        : `/api/clientes/${selectedCliente?.id_cliente}`;
      const method = activeModal === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setActiveModal(null);
        setSelectedCliente(null);
        fetchClientes();
      } else {
        const errorData = await res.json();
        alert(`Error al guardar: ${errorData.error || 'Intente de nuevo.'}`);
      }
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      alert('Error de red al intentar guardar.');
    }
  };

  // Eliminar Cliente
  const handleDelete = async () => {
    if (!selectedCliente) return;
    try {
      const res = await fetch(`/api/clientes/${selectedCliente.id_cliente}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setActiveModal(null);
        setSelectedCliente(null);
        fetchClientes();
      } else {
        const errorData = await res.json();
        alert(`Error al eliminar: ${errorData.error || 'Intente de nuevo.'}`);
      }
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      alert('Error de red al intentar eliminar.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-fade-in w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-white mb-2 leading-none">
            Directorio de Clientes
          </h1>
          <p className="text-gray-400 text-sm">
            Catálogo comercial completo. Gestión de contactos, zonas y estatus de negociación de CalMiranda.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cal-emerald to-cal-emerald-light hover:from-cal-emerald-light hover:to-cal-emerald text-white text-sm font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-cal-emerald/20 cursor-pointer"
        >
          <Plus size={18} />
          <span>Agregar Cliente</span>
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="glass rounded-3xl p-5 border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, RIF, teléfono, contacto o zona..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider shrink-0">Estatus:</label>
          <div className="relative w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-cal-emerald/50 transition-all appearance-none cursor-pointer leading-normal"
            >
              <option value="Todos" className="bg-[#1e2528] text-white">Todos</option>
              <option value="Activo" className="bg-[#1e2528] text-white">Activo</option>
              <option value="Inactivo" className="bg-[#1e2528] text-white">Inactivo</option>
              <option value="Prospecto" className="bg-[#1e2528] text-white">Prospecto</option>
              <option value="Empleado" className="bg-[#1e2528] text-white">Empleado</option>
              <option value="Transportista" className="bg-[#1e2528] text-white">Transportista</option>
              <option value="Ignorar Bot" className="bg-[#1e2528] text-white">Ignorar Bot</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="glass rounded-3xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-cal-emerald border-t-transparent animate-spin" />
            <span className="text-xs text-gray-400 font-medium">Cargando directorio de clientes...</span>
          </div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <span className="text-gray-500 text-sm">No se encontraron clientes con los filtros aplicados.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4.5">Cliente / RIF</th>
                  <th className="px-6 py-4.5">Zona / Ubicación</th>
                  <th className="px-6 py-4.5">Contacto Principal</th>
                  <th className="px-6 py-4.5">Teléfono / Móvil</th>
                  <th className="px-6 py-4.5 text-center">Estatus</th>
                  <th className="px-6 py-4.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientes.map((cliente) => (
                  <tr 
                    key={cliente.id_cliente}
                    onClick={() => handleOpenDetails(cliente)}
                    className="hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors duration-200 cursor-pointer text-sm"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white tracking-wide">{cliente.nombre}</span>
                        <span className="text-xs text-gray-400 mt-0.5">{cliente.rif || 'RIF no registrado'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-gray-200">{cliente.zona}</span>
                        <span className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5" title={cliente.direccion}>
                          {cliente.direccion || 'Sin dirección'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-200">
                      {cliente.contacto_1 || <span className="text-gray-500 italic">No asignado</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      <div className="flex flex-col">
                        <span>{cliente.telefono_1 || cliente.movil || 'Sin teléfono'}</span>
                        {cliente.telefono_1 && cliente.movil && (
                          <span className="text-[11px] text-gray-500 mt-0.5">{cliente.movil}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        cliente.estatus === 'Activo'
                          ? 'bg-cal-emerald/10 text-cal-emerald-light border-cal-emerald/20'
                          : cliente.estatus === 'Inactivo'
                          ? 'bg-white/5 text-gray-400 border-white/10'
                          : cliente.estatus === 'Empleado'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : cliente.estatus === 'Transportista'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : cliente.estatus === 'Ignorar Bot'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {cliente.estatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(cliente)}
                          title="Editar Cliente"
                          className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleOpenDelete(cliente, e)}
                          title="Eliminar Cliente"
                          className="p-2 bg-white/5 hover:bg-red-500/15 text-gray-400 hover:text-red-400 rounded-xl border border-white/5 hover:border-red-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-white/5 bg-white/[0.01] gap-4">
            <span className="text-xs text-gray-400 font-medium">
              Mostrando {clientes.length} de {total} registros
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-white/5"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-4 py-1.5 bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 rounded-xl">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-white/5"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETALLES DEL CLIENTE */}
      {activeModal === 'details' && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-white/10 shadow-2xl text-left overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-start">
              <div>
                <span className={`inline-block text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 border ${
                  selectedCliente.estatus === 'Activo'
                    ? 'bg-cal-emerald/10 text-cal-emerald-light border-cal-emerald/20'
                    : selectedCliente.estatus === 'Inactivo'
                    ? 'bg-white/5 text-gray-400 border-white/10'
                    : selectedCliente.estatus === 'Empleado'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : selectedCliente.estatus === 'Transportista'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : selectedCliente.estatus === 'Ignorar Bot'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {selectedCliente.estatus}
                </span>
                <h3 className="text-xl font-extrabold font-display text-white tracking-wide leading-tight">
                  {selectedCliente.nombre}
                </h3>
                <p className="text-gray-400 text-xs mt-1">RIF: {selectedCliente.rif || 'Sin registrar'}</p>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-white/5 px-6 bg-white/[0.01]">
              {(['basicos', 'contacto', 'comercial', 'seguimiento'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'border-cal-emerald text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab === 'basicos' ? 'Básicos' : tab === 'contacto' ? 'Contacto' : tab === 'comercial' ? 'Comercial' : 'Seguimiento'}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-sm text-gray-300">
              {activeTab === 'basicos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                    <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <User size={14} className="text-cal-emerald-light" /> Datos Generales
                    </h4>
                    <div>
                      <span className="text-xs text-gray-500 font-semibold block">Zona</span>
                      <span className="text-white font-medium text-sm">{selectedCliente.zona}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-semibold block">Vendedor Asignado</span>
                      <span className="text-white font-medium text-sm">{selectedCliente.vendedor || 'No asignado'}</span>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                    <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar size={14} className="text-cal-emerald-light" /> Registro del Sistema
                    </h4>
                    <div>
                      <span className="text-xs text-gray-500 font-semibold block">Fecha de Registro</span>
                      <span className="text-white font-medium text-sm">{formatDate(selectedCliente.fecha_creacion)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-semibold block">Última Actualización</span>
                      <span className="text-white font-medium text-sm">{formatDate(selectedCliente.fecha_actualizacion)}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'contacto' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                    <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={14} className="text-cal-emerald-light" /> Canales de Contacto
                    </h4>
                    <div className="flex flex-col gap-3">
                      <div>
                        <span className="text-xs text-gray-500 font-semibold block">Contacto 1 ({selectedCliente.contacto_1 || 'General'})</span>
                        <a href={`tel:${selectedCliente.telefono_1}`} className="text-cal-emerald-light font-medium text-sm hover:underline flex items-center gap-1.5 mt-0.5">
                          <Phone size={12} /> {selectedCliente.telefono_1 || 'No registrado'}
                        </a>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 font-semibold block">Teléfono Móvil (WhatsApp)</span>
                        <a href={`tel:${selectedCliente.movil}`} className="text-cal-emerald-light font-medium text-sm hover:underline flex items-center gap-1.5 mt-0.5">
                          <Phone size={12} /> {selectedCliente.movil || 'No registrado'}
                        </a>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 font-semibold block">Contacto 2 ({selectedCliente.contacto_2 || 'Secundario'})</span>
                        <a href={`tel:${selectedCliente.telefono_2}`} className="text-cal-emerald-light font-medium text-sm hover:underline flex items-center gap-1.5 mt-0.5">
                          <Phone size={12} /> {selectedCliente.telefono_2 || 'No registrado'}
                        </a>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 font-semibold block">Teléfono de Apoyo 3</span>
                        <span className="text-white text-sm font-medium mt-0.5">{selectedCliente.telefono_3 || 'No registrado'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 font-semibold block">Correo Electrónico</span>
                        <a href={`mailto:${selectedCliente.email}`} className="text-cal-emerald-light font-medium text-sm hover:underline flex items-center gap-1.5 mt-0.5">
                          <Mail size={12} /> {selectedCliente.email || 'No registrado'}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                    <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={14} className="text-cal-emerald-light" /> Dirección Física & Mapas
                    </h4>
                    <div className="flex flex-col gap-3">
                      <div>
                        <span className="text-xs text-gray-500 font-semibold block">Dirección Detallada</span>
                        <p className="text-white text-sm mt-0.5 whitespace-pre-wrap leading-relaxed">
                          {selectedCliente.direccion || 'No registrada'}
                        </p>
                      </div>
                      {selectedCliente.ubicacion && (
                        <div>
                          <span className="text-xs text-gray-500 font-semibold block">Enlace de Ubicación (Google Maps)</span>
                          <a 
                            href={selectedCliente.ubicacion} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-cal-emerald-light font-semibold text-xs hover:underline mt-1 bg-cal-emerald/10 px-3 py-1.5 rounded-xl border border-cal-emerald/20"
                          >
                            <span>Ver en Google Maps</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comercial' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center justify-center">
                    <DollarSign size={28} className="text-cal-emerald-light mb-2" />
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Último Precio</span>
                    <span className="text-white font-extrabold text-2xl mt-1">
                      {selectedCliente.ultimo_precio ? `$${Number(selectedCliente.ultimo_precio).toFixed(2)}` : 'Sin cotización'}
                    </span>
                  </div>
                  
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center justify-center">
                    <Clock size={28} className="text-cal-emerald-light mb-2" />
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Días de Crédito</span>
                    <span className="text-white font-extrabold text-2xl mt-1">
                      {selectedCliente.dias_credito || 0} días
                    </span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center justify-center">
                    <User size={28} className="text-cal-emerald-light mb-2" />
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Frecuencia de Pedido</span>
                    <span className="text-white font-semibold text-sm mt-2">
                      {selectedCliente.tiempo_promedio_pedido || 'No determinado'}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'seguimiento' && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <Calendar size={14} className="text-cal-emerald-light" /> Última Llamada
                      </span>
                      <span className="text-white font-semibold">{formatDate(selectedCliente.ultima_llamada)}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <Calendar size={14} className="text-cal-emerald-light" /> Próxima Llamada Sched
                      </span>
                      <span className="text-white font-semibold">{formatDate(selectedCliente.proxima_llamada)}</span>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Historial de Negociación</span>
                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedCliente.historial_negociacion || 'No hay negociaciones históricas registradas.'}
                    </p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Comentarios Generales</span>
                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedCliente.comentario || 'Sin comentarios.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 flex gap-3 justify-end bg-white/[0.01]">
              <button
                onClick={() => handleOpenEdit(selectedCliente)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 size={12} />
                <span>Editar Cliente</span>
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-cal-emerald hover:bg-cal-emerald-light text-white text-xs font-bold rounded-2xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR O EDITAR CLIENTE */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form 
            onSubmit={handleSubmit}
            className="glass rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-white/10 shadow-2xl text-left overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold font-display text-white tracking-wide leading-tight">
                  {activeModal === 'create' ? 'Agregar Nuevo Cliente' : 'Editar Cliente'}
                </h3>
                <p className="text-gray-400 text-xs mt-1">Completa los campos en las diferentes pestañas.</p>
              </div>
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 px-6 bg-white/[0.01]">
              {(['basicos', 'contacto', 'comercial', 'seguimiento'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'border-cal-emerald text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab === 'basicos' ? 'Básicos' : tab === 'contacto' ? 'Contacto' : tab === 'comercial' ? 'Comercial' : 'Seguimiento'}
                </button>
              ))}
            </div>

            {/* Body Forms */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-sm text-gray-300">
              
              {activeTab === 'basicos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Nombre del Cliente *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre || ''}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Inversiones Borges C.A."
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">RIF o Documento</label>
                    <input
                      type="text"
                      name="rif"
                      value={formData.rif || ''}
                      onChange={handleInputChange}
                      placeholder="Ej: J-30491823-9"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Zona Geográfica *</label>
                    <input
                      type="text"
                      name="zona"
                      value={formData.zona || ''}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Guarenas / Guatire"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Vendedor Asignado</label>
                    <input
                      type="text"
                      name="vendedor"
                      value={formData.vendedor || ''}
                      onChange={handleInputChange}
                      placeholder="Ej: Julio Borges"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Estatus</label>
                    <div className="relative">
                      <select
                        name="estatus"
                        value={formData.estatus || 'Activo'}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 appearance-none cursor-pointer leading-normal"
                      >
                        <option value="Activo" className="bg-[#1e2528] text-white">Activo</option>
                        <option value="Inactivo" className="bg-[#1e2528] text-white">Inactivo</option>
                        <option value="Prospecto" className="bg-[#1e2528] text-white">Prospecto</option>
                        <option value="Empleado" className="bg-[#1e2528] text-white">Empleado</option>
                        <option value="Transportista" className="bg-[#1e2528] text-white">Transportista</option>
                        <option value="Ignorar Bot" className="bg-[#1e2528] text-white">Ignorar Bot</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'contacto' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Contacto Principal (Nombre)</label>
                    <input
                      type="text"
                      name="contacto_1"
                      value={formData.contacto_1 || ''}
                      onChange={handleInputChange}
                      placeholder="Ej: Juan Pérez"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Teléfono Principal</label>
                    <input
                      type="text"
                      name="telefono_1"
                      value={formData.telefono_1 || ''}
                      onChange={handleInputChange}
                      placeholder="Ej: 04141234567"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Móvil (WhatsApp)</label>
                    <input
                      type="text"
                      name="movil"
                      value={formData.movil || ''}
                      onChange={handleInputChange}
                      placeholder="Ej: 584141234567"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Correo Electrónico</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      placeholder="Ej: cliente@correo.com"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-white/5 pt-4 mt-2">
                    <h5 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Dirección & Mapas</h5>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Dirección Detallada</label>
                    <textarea
                      name="direccion"
                      value={formData.direccion || ''}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Dirección comercial exacta..."
                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-3.5 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all resize-none leading-relaxed"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">URL Google Maps</label>
                    <input
                      type="text"
                      name="ubicacion"
                      value={formData.ubicacion || ''}
                      onChange={handleInputChange}
                      placeholder="https://goo.gl/maps/..."
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-white/5 pt-4 mt-2">
                    <h5 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Contactos de Respaldo</h5>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Contacto 2 (Nombre)</label>
                    <input
                      type="text"
                      name="contacto_2"
                      value={formData.contacto_2 || ''}
                      onChange={handleInputChange}
                      placeholder="Contacto secundario"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Teléfono Contacto 2</label>
                    <input
                      type="text"
                      name="telefono_2"
                      value={formData.telefono_2 || ''}
                      onChange={handleInputChange}
                      placeholder="Ej: 04121234567"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Teléfono de Respaldo 3</label>
                    <input
                      type="text"
                      name="telefono_3"
                      value={formData.telefono_3 || ''}
                      onChange={handleInputChange}
                      placeholder="Otro número telefónico"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'comercial' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Último Precio Acordado ($)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">$</span>
                      <input
                        type="number"
                        name="ultimo_precio"
                        step="0.01"
                        value={formData.ultimo_precio !== undefined ? formData.ultimo_precio : ''}
                        onChange={handleInputChange}
                        placeholder="Ej: 4.50"
                        className="w-full pl-8 pr-4 bg-white/5 border border-white/5 rounded-2xl py-3 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Días de Crédito Autorizados</label>
                    <input
                      type="number"
                      name="dias_credito"
                      value={formData.dias_credito !== undefined ? formData.dias_credito : 0}
                      onChange={handleInputChange}
                      placeholder="Ej: 7"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Tiempo Promedio de Pedido</label>
                    <input
                      type="text"
                      name="tiempo_promedio_pedido"
                      value={formData.tiempo_promedio_pedido || ''}
                      onChange={handleInputChange}
                      placeholder="Ej: Semanal, Quincenal, Mensual"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'seguimiento' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Fecha Última Llamada / Contacto</label>
                    <input
                      type="datetime-local"
                      name="ultima_llamada"
                      value={formatDateForInput(formData.ultima_llamada)}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Fecha Próxima Llamada Programada</label>
                    <input
                      type="datetime-local"
                      name="proxima_llamada"
                      value={formatDateForInput(formData.proxima_llamada)}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Historial de Negociación</label>
                    <textarea
                      name="historial_negociacion"
                      value={formData.historial_negociacion || ''}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Detalles sobre acuerdos previos, ofertas especiales realizadas..."
                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-3.5 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all resize-none leading-relaxed"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Comentarios Internos</label>
                    <textarea
                      name="comentario"
                      value={formData.comentario || ''}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Notas del vendedor, observaciones operativas..."
                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-3.5 text-sm text-white focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 flex gap-3 justify-end bg-white/[0.01]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-cal-emerald hover:bg-cal-emerald-light text-white text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>Guardar Cliente</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {activeModal === 'delete' && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-3xl w-full max-w-md border border-white/10 shadow-2xl text-left overflow-hidden">
            <div className="p-6 flex flex-col gap-4">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">¿Eliminar Cliente?</h3>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                  ¿Estás seguro de que deseas eliminar permanentemente a <strong>{selectedCliente.nombre}</strong>? 
                  Esta acción borrará de forma irreversible el registro comercial y toda su configuración.
                </p>
              </div>
              <div className="flex gap-3 mt-2 justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-red-500/20"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
