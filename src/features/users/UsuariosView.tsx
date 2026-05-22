import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  ShieldAlert, 
  Mail, 
  User, 
  Key,
  Shield
} from 'lucide-react';

interface UserData {
  id: number;
  email: string;
  nombre: string;
  rol: 'superadmin' | 'admin' | 'operador';
  created_at: string;
}

export const UsuariosView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'operador' as 'superadmin' | 'admin' | 'operador'
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        console.error('Error al cargar usuarios');
      }
    } catch (err) {
      console.error('Error de red al cargar usuarios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'operador'
    });
    setActiveModal('create');
  };

  const handleOpenEdit = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      password: '', // En blanco a menos que se desee cambiar
      rol: user.rol
    });
    setActiveModal('edit');
  };

  const handleOpenDelete = (user: UserData) => {
    if (user.email === currentUser?.username) {
      return; // Bloqueado por seguridad
    }
    setSelectedUser(user);
    setActiveModal('delete');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.email || (activeModal === 'create' && !formData.password)) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }

    try {
      const url = activeModal === 'create' ? '/api/users' : `/api/users/${selectedUser?.id}`;
      const method = activeModal === 'create' ? 'POST' : 'PUT';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (currentUser?.username) {
        headers['x-current-user-email'] = currentUser.username;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setActiveModal(null);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || 'Ocurrió un error al guardar.'}`);
      }
    } catch (err) {
      console.error('Error guardando usuario:', err);
      alert('Error de red al guardar.');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.username) {
        headers['x-current-user-email'] = currentUser.username;
      }

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        setActiveModal(null);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(`Error al eliminar: ${errData.error || 'Ocurrió un error.'}`);
      }
    } catch (err) {
      console.error('Error eliminando usuario:', err);
      alert('Error de red al eliminar.');
    }
  };

  // Filtrar usuarios reactivamente
  const filteredUsers = users.filter(u => 
    u.nombre.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-fade-in w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-white mb-2 leading-none">
            Administración de Usuarios
          </h1>
          <p className="text-gray-400 text-sm">
            Gestiona las cuentas autorizadas para acceder al panel administrativo de CalMiranda y sus respectivos niveles de acceso.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cal-emerald to-cal-emerald-light hover:from-cal-emerald-light hover:to-cal-emerald text-white text-sm font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-cal-emerald/20 cursor-pointer"
        >
          <Plus size={18} />
          <span>Agregar Usuario</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="glass rounded-3xl p-5 border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Buscar usuario por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
          />
        </div>
        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
          Total: {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="glass rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Usuario / Nombre</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Fecha Registro</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-cal-emerald border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.email === currentUser?.username;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-gray-300">
                            {u.nombre.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold block text-white leading-tight">
                              {u.nombre}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] text-cal-emerald-light font-bold">
                                (Tu cuenta actual)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-mono text-xs">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`
                          inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border
                          ${u.rol === 'superadmin'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : u.rol === 'admin'
                            ? 'bg-cal-emerald/15 text-cal-emerald-light border-cal-emerald/30'
                            : 'bg-cal-sand/15 text-cal-sand border-cal-sand/30'}
                        `}>
                          {u.rol === 'superadmin' ? 'Super Admin' : u.rol === 'admin' ? 'Administrador' : 'Operador'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Editar usuario"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(u)}
                            disabled={isSelf}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              isSelf 
                                ? 'text-gray-600 cursor-not-allowed opacity-30' 
                                : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            title={isSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-scale-up">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-xl font-bold font-display text-white">
                {activeModal === 'create' ? 'Agregar Nuevo Usuario' : 'Editar Usuario'}
              </h2>
              <button 
                onClick={() => { setActiveModal(null); setSelectedUser(null); }}
                className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {/* Campo: Nombre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} /> Nombre Completo
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                />
              </div>

              {/* Campo: Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={13} /> Email (Usuario)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="usuario@calmiranda.com"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                />
              </div>

              {/* Campo: Rol */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={13} /> Rol de Acceso
                </label>
                <div className="relative">
                  <select
                    name="rol"
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value as any})}
                    disabled={selectedUser?.email === currentUser?.username}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-cal-emerald/50 transition-all appearance-none cursor-pointer leading-normal disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="operador" className="bg-[#1e2528] text-white">Operador</option>
                    <option value="admin" className="bg-[#1e2528] text-white">Administrador</option>
                    <option value="superadmin" className="bg-[#1e2528] text-white">Super Admin</option>
                  </select>
                </div>
                {selectedUser?.email === currentUser?.username && (
                  <span className="text-[10px] text-amber-400 font-medium">
                    * No puedes cambiar tu propio rol para evitar pérdida de acceso.
                  </span>
                )}
              </div>

              {/* Campo: Contraseña */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={13} /> Contraseña {activeModal === 'edit' && '(Dejar en blanco para conservar actual)'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={activeModal === 'create'}
                  placeholder={activeModal === 'create' ? "Mínimo 6 caracteres" : "Nueva contraseña (opcional)"}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cal-emerald/50 focus:bg-white/10 transition-all leading-normal"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 mt-4 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => { setActiveModal(null); setSelectedUser(null); }}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-2xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cal-emerald to-cal-emerald-light hover:from-cal-emerald-light hover:to-cal-emerald text-white text-sm font-bold rounded-2xl transition-all duration-300 shadow-md shadow-cal-emerald/10 cursor-pointer"
                >
                  <Save size={16} />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {activeModal === 'delete' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 self-center">
                <ShieldAlert size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold font-display text-white mb-2">¿Eliminar Usuario?</h3>
                <p className="text-sm text-gray-400">
                  ¿Estás seguro de que deseas eliminar permanentemente al usuario <strong className="text-white">{selectedUser.nombre}</strong> (<span className="font-mono text-xs">{selectedUser.email}</span>)? Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex justify-center gap-3 mt-2">
                <button
                  onClick={() => { setActiveModal(null); setSelectedUser(null); }}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-2xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-5 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-2xl transition-colors shadow-md shadow-red-500/15 cursor-pointer"
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
