import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download,
  User,
  Stethoscope,
  Building,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface Enfermeria {
  id: string;
  nombre: string;
  cargo: string;
  dependencia: string;
  sintomas: string;
  antecedentes_salud: string;
  observaciones: string | null;
  created_at: string;
  created_by: string;
}

interface CatalogItem {
  id: string;
  nombre: string;
}

const Enfermeria: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [enfermeriaRecords, setEnfermeriaRecords] = useState<Enfermeria[]>([]);
  const [cargos, setCargos] = useState<CatalogItem[]>([]);
  const [dependencias, setDependencias] = useState<CatalogItem[]>([]);
  const [sintomas, setSintomas] = useState<CatalogItem[]>([]);
  const [antecedentesSalud, setAntecedentesSalud] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Enfermeria | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    cargo: '',
    dependencia: '',
    sintomas: '',
    antecedentes_salud: '',
    observaciones: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [enfermeriaRes, cargosRes, dependenciasRes, sintomasRes, antecedentesRes] = await Promise.all([
        supabase.from('enfermeria').select('*').order('created_at', { ascending: false }),
        supabase.from('cargos').select('*').eq('activo', true).order('nombre'),
        supabase.from('dependencias').select('*').eq('activo', true).order('nombre'),
        supabase.from('sintomas').select('*').eq('activo', true).order('nombre'),
        supabase.from('antecedentes_salud').select('*').eq('activo', true).order('nombre')
      ]);

      if (enfermeriaRes.error) throw enfermeriaRes.error;
      if (cargosRes.error) throw cargosRes.error;
      if (dependenciasRes.error) throw dependenciasRes.error;
      if (sintomasRes.error) throw sintomasRes.error;
      if (antecedentesRes.error) throw antecedentesRes.error;

      setEnfermeriaRecords(enfermeriaRes.data || []);
      setCargos(cargosRes.data || []);
      setDependencias(dependenciasRes.data || []);
      setSintomas(sintomasRes.data || []);
      setAntecedentesSalud(antecedentesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('enfermeria', editingRecord ? 'update' : 'create')) {
      toast.error('No tienes permisos para esta acción');
      return;
    }

    try {
      const recordData = {
        ...formData,
        created_by: user?.id || ''
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('enfermeria')
          .update(recordData)
          .eq('id', editingRecord.id);

        if (error) throw error;
        toast.success('Registro de enfermería actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('enfermeria')
          .insert([recordData]);

        if (error) throw error;
        toast.success('Registro de enfermería creado exitosamente');
      }

      setShowModal(false);
      setEditingRecord(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Error al guardar el registro');
    }
  };

  const handleEdit = (record: Enfermeria) => {
    if (!hasPermission('enfermeria', 'update')) {
      toast.error('No tienes permisos para editar');
      return;
    }

    setEditingRecord(record);
    setFormData({
      nombre: record.nombre,
      cargo: record.cargo,
      dependencia: record.dependencia,
      sintomas: record.sintomas,
      antecedentes_salud: record.antecedentes_salud,
      observaciones: record.observaciones || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!hasPermission('enfermeria', 'delete')) {
      toast.error('No tienes permisos para eliminar');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;

    try {
      const { error } = await supabase
        .from('enfermeria')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Registro eliminado exitosamente');
      loadData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Error al eliminar el registro');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      cargo: '',
      dependencia: '',
      sintomas: '',
      antecedentes_salud: '',
      observaciones: ''
    });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(enfermeriaRecords);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Enfermeria');
    XLSX.writeFile(wb, 'enfermeria.xlsx');
    toast.success('Archivo exportado exitosamente');
  };

  const filteredRecords = enfermeriaRecords.filter(record =>
    record.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.dependencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.sintomas.toLowerCase().includes(searchTerm.toLowerCase())
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
              <Stethoscope className="mr-3 h-6 w-6 text-red-600" />
              Gestión de Enfermería
            </h1>
            <p className="text-gray-600 mt-1">
              Administra los registros médicos y de enfermería
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
            {hasPermission('enfermeria', 'create') && (
              <button
                onClick={() => {
                  resetForm();
                  setEditingRecord(null);
                  setShowModal(true);
                }}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Registro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, cargo, dependencia o síntomas..."
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
                  Cargo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dependencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Síntomas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Antecedentes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">
                        {record.nombre}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {record.cargo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">{record.dependencia}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-400 mr-1" />
                      <span className="text-sm text-gray-900">{record.sintomas}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {record.antecedentes_salud}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {hasPermission('enfermeria', 'update') && (
                        <button
                          onClick={() => handleEdit(record)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('enfermeria', 'delete') && (
                        <button
                          onClick={() => handleDelete(record.id)}
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
                {editingRecord ? 'Editar Registro' : 'Nuevo Registro de Enfermería'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Cargo *
                    </label>
                    <select
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Seleccionar cargo</option>
                      {cargos.map(cargo => (
                        <option key={cargo.id} value={cargo.nombre}>
                          {cargo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dependencia *
                    </label>
                    <select
                      value={formData.dependencia}
                      onChange={(e) => setFormData({ ...formData, dependencia: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Seleccionar dependencia</option>
                      {dependencias.map(dependencia => (
                        <option key={dependencia.id} value={dependencia.nombre}>
                          {dependencia.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Síntomas *
                    </label>
                    <select
                      value={formData.sintomas}
                      onChange={(e) => setFormData({ ...formData, sintomas: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Seleccionar síntomas</option>
                      {sintomas.map(sintoma => (
                        <option key={sintoma.id} value={sintoma.nombre}>
                          {sintoma.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Antecedentes de Salud *
                    </label>
                    <select
                      value={formData.antecedentes_salud}
                      onChange={(e) => setFormData({ ...formData, antecedentes_salud: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Seleccionar antecedentes</option>
                      {antecedentesSalud.map(antecedente => (
                        <option key={antecedente.id} value={antecedente.nombre}>
                          {antecedente.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Observaciones adicionales..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingRecord(null);
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
                    {editingRecord ? 'Actualizar' : 'Crear'} Registro
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

export default Enfermeria;