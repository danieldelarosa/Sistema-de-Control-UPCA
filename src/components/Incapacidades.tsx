import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Edit, Trash2, Download, Calendar, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface Incapacidad {
  id: string;
  numero_id: string;
  nombre_completo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_incapacidad: number;
  diagnostico: string;
  tipo_incapacidad: string;
  created_at: string;
  created_by: string;
}

interface CatalogItem {
  id: string;
  nombre: string;
}

const Incapacidades: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<CatalogItem[]>([]);
  const [tiposIncapacidad, setTiposIncapacidad] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncapacidad, setEditingIncapacidad] = useState<Incapacidad | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    numero_id: '',
    nombre_completo: '',
    fecha_inicio: '',
    fecha_fin: '',
    diagnostico: '',
    tipo_incapacidad: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [incapacidadesRes, diagnosticosRes, tiposRes] = await Promise.all([
        supabase.from('incapacidades').select('*').order('created_at', { ascending: false }),
        supabase.from('diagnosticos').select('*').eq('activo', true).order('nombre'),
        supabase.from('tipos_incapacidad').select('*').eq('activo', true).order('nombre')
      ]);

      if (incapacidadesRes.error) throw incapacidadesRes.error;
      if (diagnosticosRes.error) throw diagnosticosRes.error;
      if (tiposRes.error) throw tiposRes.error;

      setIncapacidades(incapacidadesRes.data || []);
      setDiagnosticos(diagnosticosRes.data || []);
      setTiposIncapacidad(tiposRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (fechaInicio: string, fechaFin: string): number => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diffTime = fin.getTime() - inicio.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasPermission('incapacidades', editingIncapacidad ? 'update' : 'create')) {
      toast.error('No tienes permisos para esta acción');
      return;
    }

    try {
      const dias_incapacidad = calculateDays(formData.fecha_inicio, formData.fecha_fin);

      const incapacidadData = {
        ...formData,
        dias_incapacidad,
        created_by: user?.id || ''
      };

      if (editingIncapacidad) {
        const { error } = await supabase
          .from('incapacidades')
          .update(incapacidadData)
          .eq('id', editingIncapacidad.id);

        if (error) throw error;
        toast.success('Incapacidad actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('incapacidades')
          .insert([incapacidadData]);

        if (error) throw error;
        toast.success('Incapacidad creada exitosamente');
      }

      setShowModal(false);
      setEditingIncapacidad(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving incapacidad:', error);
      toast.error('Error al guardar la incapacidad');
    }
  };

  const handleEdit = (incapacidad: Incapacidad) => {
    if (!hasPermission('incapacidades', 'update')) {
      toast.error('No tienes permisos para editar');
      return;
    }

    setEditingIncapacidad(incapacidad);
    setFormData({
      numero_id: incapacidad.numero_id,
      nombre_completo: incapacidad.nombre_completo,
      fecha_inicio: incapacidad.fecha_inicio,
      fecha_fin: incapacidad.fecha_fin,
      diagnostico: incapacidad.diagnostico,
      tipo_incapacidad: incapacidad.tipo_incapacidad
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!hasPermission('incapacidades', 'delete')) {
      toast.error('No tienes permisos para eliminar');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta incapacidad?')) return;

    try {
      const { error } = await supabase
        .from('incapacidades')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Incapacidad eliminada exitosamente');
      loadData();
    } catch (error) {
      console.error('Error deleting incapacidad:', error);
      toast.error('Error al eliminar la incapacidad');
    }
  };

  const resetForm = () => {
    setFormData({
      numero_id: '',
      nombre_completo: '',
      fecha_inicio: '',
      fecha_fin: '',
      diagnostico: '',
      tipo_incapacidad: ''
    });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(incapacidades);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incapacidades');
    XLSX.writeFile(wb, 'incapacidades.xlsx');
    toast.success('Archivo exportado exitosamente');
  };

  const filteredIncapacidades = incapacidades.filter((incapacidad) =>
    incapacidad.numero_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incapacidad.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incapacidad.diagnostico.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incapacidad.tipo_incapacidad.toLowerCase().includes(searchTerm.toLowerCase())
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
              <Heart className="mr-3 h-6 w-6 text-red-600" />
              Gestión de Incapacidades
            </h1>
            <p className="text-gray-600 mt-1">
              Administra las incapacidades médicas del personal
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
            {hasPermission('incapacidades', 'create') && (
              <button
                onClick={() => {
                  resetForm();
                  setEditingIncapacidad(null);
                  setShowModal(true);
                }}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Incapacidad
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por número ID, nombre, diagnóstico o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
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
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diagnóstico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIncapacidades.map((incapacidad) => (
                <tr key={incapacidad.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {incapacidad.nombre_completo}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {incapacidad.numero_id}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{incapacidad.fecha_inicio} - {incapacidad.fecha_fin}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-medium">{incapacidad.dias_incapacidad} días</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {incapacidad.diagnostico}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {incapacidad.tipo_incapacidad}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {hasPermission('incapacidades', 'update') && (
                        <button
                          onClick={() => handleEdit(incapacidad)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('incapacidades', 'delete') && (
                        <button
                          onClick={() => handleDelete(incapacidad.id)}
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
                {editingIncapacidad ? 'Editar Incapacidad' : 'Nueva Incapacidad'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de ID *
                    </label>
                    <input
                      type="text"
                      value={formData.numero_id}
                      onChange={(e) => setFormData({ ...formData, numero_id: e.target.value })}
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
                      value={formData.nombre_completo}
                      onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
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
                      Diagnóstico *
                    </label>
                    <select
                      value={formData.diagnostico}
                      onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Seleccionar diagnóstico</option>
                      {diagnosticos.map(diagnostico => (
                        <option key={diagnostico.id} value={diagnostico.nombre}>
                          {diagnostico.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Incapacidad *
                    </label>
                    <select
                      value={formData.tipo_incapacidad}
                      onChange={(e) => setFormData({ ...formData, tipo_incapacidad: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Seleccionar tipo</option>
                      {tiposIncapacidad.map(tipo => (
                        <option key={tipo.id} value={tipo.nombre}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {formData.fecha_inicio && formData.fecha_fin && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Días de incapacidad calculados: {' '}
                      <span className="font-medium text-gray-800">
                        {calculateDays(formData.fecha_inicio, formData.fecha_fin)} días
                      </span>
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingIncapacidad(null);
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
                    {editingIncapacidad ? 'Actualizar' : 'Crear'} Incapacidad
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

export default Incapacidades;