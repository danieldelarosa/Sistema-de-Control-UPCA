import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download, 
  Upload,
  Calendar,
  Clock,
  User,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface Novedad {
  id: string;
  cedula: string;
  nombre: string;
  tipo_planta: string;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_fin: string;
  hora_fin: string;
  horas_ausencia: number;
  tipo_novedad: string;
  observacion: string | null;
  created_at: string;
  created_by: string;
}

const Novedades: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<Novedad | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    cedula: '',
    nombre: '',
    tipo_planta: 'Docente',
    fecha_inicio: '',
    hora_inicio: '',
    fecha_fin: '',
    hora_fin: '',
    tipo_novedad: 'Permiso',
    observacion: ''
  });

  const tiposPlanta = ['Docente', 'Administrativo', 'Aprendiz'];
  const tiposNovedad = ['Permiso', 'Calamidad', 'Licencia', 'Ausencia', 'Otro'];

  useEffect(() => {
    loadNovedades();
  }, []);

  const loadNovedades = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('novedades')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNovedades(data || []);
    } catch (error) {
      console.error('Error loading novedades:', error);
      toast.error('Error al cargar las novedades');
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (fechaInicio: string, horaInicio: string, fechaFin: string, horaFin: string): number => {
    const inicio = new Date(`${fechaInicio}T${horaInicio}`);
    const fin = new Date(`${fechaFin}T${horaFin}`);
    const diffMs = fin.getTime() - inicio.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('novedades', editingNovedad ? 'update' : 'create')) {
      toast.error('No tienes permisos para esta acción');
      return;
    }

    try {
      const horas_ausencia = calculateHours(
        formData.fecha_inicio,
        formData.hora_inicio,
        formData.fecha_fin,
        formData.hora_fin
      );

      const novedadData = {
        ...formData,
        horas_ausencia,
        created_by: user?.id || ''
      };

      if (editingNovedad) {
        const { error } = await supabase
          .from('novedades')
          .update(novedadData)
          .eq('id', editingNovedad.id);

        if (error) throw error;
        toast.success('Novedad actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('novedades')
          .insert([novedadData]);

        if (error) throw error;
        toast.success('Novedad creada exitosamente');
      }

      setShowModal(false);
      setEditingNovedad(null);
      resetForm();
      loadNovedades();
    } catch (error) {
      console.error('Error saving novedad:', error);
      toast.error('Error al guardar la novedad');
    }
  };

  const handleEdit = (novedad: Novedad) => {
    if (!hasPermission('novedades', 'update')) {
      toast.error('No tienes permisos para editar');
      return;
    }

    setEditingNovedad(novedad);
    setFormData({
      cedula: novedad.cedula,
      nombre: novedad.nombre,
      tipo_planta: novedad.tipo_planta,
      fecha_inicio: novedad.fecha_inicio,
      hora_inicio: novedad.hora_inicio,
      fecha_fin: novedad.fecha_fin,
      hora_fin: novedad.hora_fin,
      tipo_novedad: novedad.tipo_novedad,
      observacion: novedad.observacion || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!hasPermission('novedades', 'delete')) {
      toast.error('No tienes permisos para eliminar');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta novedad?')) return;

    try {
      const { error } = await supabase
        .from('novedades')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Novedad eliminada exitosamente');
      loadNovedades();
    } catch (error) {
      console.error('Error deleting novedad:', error);
      toast.error('Error al eliminar la novedad');
    }
  };

  const resetForm = () => {
    setFormData({
      cedula: '',
      nombre: '',
      tipo_planta: 'Docente',
      fecha_inicio: '',
      hora_inicio: '',
      fecha_fin: '',
      hora_fin: '',
      tipo_novedad: 'Permiso',
      observacion: ''
    });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(novedades);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Novedades');
    XLSX.writeFile(wb, 'novedades.xlsx');
    toast.success('Archivo exportado exitosamente');
  };

  const filteredNovedades = novedades.filter(novedad =>
    novedad.cedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
    novedad.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    novedad.tipo_novedad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <FileText className="mr-3 h-6 w-6 text-red-600" />
              Gestión de Novedades
            </h1>
            <p className="text-gray-600 mt-1">
              Administra las novedades del personal
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={exportToExcel}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </button>
            {hasPermission('novedades', 'create') && (
              <button
                onClick={() => {
                  resetForm();
                  setEditingNovedad(null);
                  setShowModal(true);
                }}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Novedad
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por cédula, nombre o tipo de novedad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo Planta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo Novedad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNovedades.map((novedad) => (
                <tr key={novedad.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {novedad.nombre}
                      </div>
                      <div className="text-sm text-gray-500">
                        CC: {novedad.cedula}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {novedad.tipo_planta}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{novedad.fecha_inicio}</span>
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{novedad.hora_inicio} - {novedad.hora_fin}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-medium">{novedad.horas_ausencia.toFixed(1)}h</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {novedad.tipo_novedad}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {hasPermission('novedades', 'update') && (
                        <button
                          onClick={() => handleEdit(novedad)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('novedades', 'delete') && (
                        <button
                          onClick={() => handleDelete(novedad.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {editingNovedad ? 'Editar Novedad' : 'Nueva Novedad'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Cédula *
                    </label>
                    <input
                      type="text"
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Planta *
                    </label>
                    <select
                      value={formData.tipo_planta}
                      onChange={(e) => setFormData({ ...formData, tipo_planta: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      {tiposPlanta.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Novedad *
                    </label>
                    <select
                      value={formData.tipo_novedad}
                      onChange={(e) => setFormData({ ...formData, tipo_novedad: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      {tiposNovedad.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Inicio *
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora Inicio *
                    </label>
                    <input
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Fin *
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora Fin *
                    </label>
                    <input
                      type="time"
                      value={formData.hora_fin}
                      onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observacion}
                    onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Observaciones adicionales..."
                  />
                </div>
                
                {formData.fecha_inicio && formData.hora_inicio && formData.fecha_fin && formData.hora_fin && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Horas de ausencia calculadas: {' '}
                      <span className="font-medium text-gray-800">
                        {calculateHours(formData.fecha_inicio, formData.hora_inicio, formData.fecha_fin, formData.hora_fin).toFixed(1)} horas
                      </span>
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingNovedad(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    {editingNovedad ? 'Actualizar' : 'Crear'} Novedad
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Novedades;