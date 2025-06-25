import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Edit, Trash2, Calculator, Clock, ArrowRight } from 'lucide-react';
import { supabase, Estimate, Customer } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { getNextDocumentNumber, incrementDocumentNumber } from '../../lib/documentNumbering';

const EstimateList: React.FC = () => {
  const { profile } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingEstimate, setConvertingEstimate] = useState<Estimate | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [estimatesRes, customersRes] = await Promise.all([
        supabase
          .from('estimates')
          .select(`
            *,
            customers (id, first_name, last_name, email)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('customers')
          .select('*')
          .eq('company_id', profile?.company_id)
      ]);

      if (estimatesRes.error) throw estimatesRes.error;
      if (customersRes.error) throw customersRes.error;

      setEstimates(estimatesRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEstimates = estimates.filter(estimate => {
    const matchesSearch = estimate.estimate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${estimate.customers?.first_name} ${estimate.customers?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || estimate.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = (estimate: Estimate) => {
    if (!estimate.expiry_date) return false;
    return new Date(estimate.expiry_date) < new Date() && estimate.status !== 'approved';
  };

  const canConvertToProject = (estimate: Estimate) => {
    return estimate.status === 'approved';
  };

  const handleAddEstimate = () => {
    setEditingEstimate(null);
    setShowModal(true);
  };

  const handleEditEstimate = (estimate: Estimate) => {
    setEditingEstimate(estimate);
    setShowModal(true);
  };

  const handleDeleteEstimate = async (estimateId: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return;

    try {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', estimateId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting estimate:', error);
    }
  };

  const handleConvertToProject = (estimate: Estimate) => {
    setConvertingEstimate(estimate);
    setShowConvertModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-primary">Estimates</h1>
          <p className="text-text-secondary mt-1">Create and manage project estimates</p>
        </div>
        <button
          onClick={handleAddEstimate}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Estimate</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search estimates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="converted">Converted</option>
        </select>
      </div>

      {/* Estimates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEstimates.map((estimate) => (
          <div key={estimate.id} className="card p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  {estimate.title}
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  Estimate #{estimate.estimate_number}
                </p>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    isExpired(estimate) 
                      ? 'bg-orange-100 text-orange-800' 
                      : getStatusColor(estimate.status)
                  }`}>
                    {isExpired(estimate) ? 'Expired' : estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                  </span>
                  {canConvertToProject(estimate) && (
                    <button
                      onClick={() => handleConvertToProject(estimate)}
                      className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full bg-accent text-white hover:bg-hover transition-colors duration-200"
                    >
                      <ArrowRight className="h-3 w-3" />
                      <span>Convert to Project</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => handleEditEstimate(estimate)}
                  className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-folioops transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteEstimate(estimate.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-folioops transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-text-primary">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {estimate.customers?.first_name} {estimate.customers?.last_name}
                </span>
              </div>

              <div className="flex items-center space-x-3 text-text-primary">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  Issue Date: {format(new Date(estimate.issue_date), 'MMM dd, yyyy')}
                </span>
              </div>

              {estimate.expiry_date && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className={`text-sm ${isExpired(estimate) ? 'text-red-600 font-medium' : ''}`}>
                    Expires: {format(new Date(estimate.expiry_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {estimate.description && (
              <div className="mt-4 p-3 bg-gray-50 rounded-folioops">
                <p className="text-sm text-text-secondary">{estimate.description}</p>
              </div>
            )}

            {estimate.notes && (
              <div className="mt-4 p-3 bg-blue-50 rounded-folioops">
                <p className="text-sm text-blue-700">{estimate.notes}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <div className="text-text-secondary">
                  Subtotal: <span className="font-semibold">${estimate.subtotal}</span>
                </div>
                <div className="text-text-secondary">
                  Tax: <span className="font-semibold">${estimate.tax_amount}</span>
                </div>
                <div className="text-primary font-semibold">
                  Total: ${estimate.total_amount}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEstimates.length === 0 && (
        <div className="text-center py-12">
          <Calculator className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No estimates found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Get started by creating your first estimate.'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={handleAddEstimate}
              className="mt-4 btn-primary"
            >
              Create Estimate
            </button>
          )}
        </div>
      )}

      {showModal && (
        <EstimateModal
          estimate={editingEstimate}
          customers={customers}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchData();
          }}
        />
      )}

      {showConvertModal && convertingEstimate && (
        <ConvertToProjectModal
          estimate={convertingEstimate}
          onClose={() => {
            setShowConvertModal(false);
            setConvertingEstimate(null);
          }}
          onSuccess={() => {
            setShowConvertModal(false);
            setConvertingEstimate(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// Estimate Modal Component
interface EstimateModalProps {
  estimate: Estimate | null;
  customers: Customer[];
  onClose: () => void;
  onSave: () => void;
}

const EstimateModal: React.FC<EstimateModalProps> = ({ 
  estimate, 
  customers, 
  onClose, 
  onSave 
}) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    estimate_number: estimate?.estimate_number || '',
    title: estimate?.title || '',
    description: estimate?.description || '',
    customer_id: estimate?.customer_id || '',
    status: estimate?.status || 'draft',
    issue_date: estimate?.issue_date || new Date().toISOString().split('T')[0],
    expiry_date: estimate?.expiry_date || '',
    subtotal: estimate?.subtotal || 0,
    tax_rate: estimate?.tax_rate || 0,
    notes: estimate?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!estimate && profile?.company_id) {
      // Generate document number for new estimates
      getNextDocumentNumber(profile.company_id, 'estimate').then(number => {
        setFormData(prev => ({ ...prev, estimate_number: number }));
      });
    }
  }, [estimate, profile?.company_id]);

  const taxAmount = (Number(formData.subtotal) * Number(formData.tax_rate)) / 100;
  const totalAmount = Number(formData.subtotal) + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        subtotal: Number(formData.subtotal),
        tax_rate: Number(formData.tax_rate),
        expiry_date: formData.expiry_date || null,
      };

      if (estimate) {
        // Update estimate
        const { error } = await supabase
          .from('estimates')
          .update(submitData)
          .eq('id', estimate.id);
        if (error) throw error;
      } else {
        // Create estimate
        const { error } = await supabase
          .from('estimates')
          .insert({
            ...submitData,
            company_id: profile?.company_id,
          });
        if (error) throw error;

        // Increment the document number for next time
        if (profile?.company_id) {
          await incrementDocumentNumber(profile.company_id, 'estimate');
        }
      }
      onSave();
    } catch (error) {
      console.error('Error saving estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">
            {estimate ? 'Edit Estimate' : 'Create New Estimate'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Estimate Number *
              </label>
              <input
                type="text"
                required
                value={formData.estimate_number}
                onChange={(e) => setFormData({ ...formData, estimate_number: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-field"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              placeholder="e.g., HVAC System Installation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Customer *
            </label>
            <select
              required
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="input-field"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.first_name} {customer.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              placeholder="Detailed description of the work to be performed..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Subtotal ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.subtotal}
                onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Tax Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={taxAmount.toFixed(2)}
                readOnly
                className="input-field bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Total Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={totalAmount.toFixed(2)}
                readOnly
                className="input-field bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              placeholder="Additional notes or terms..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Estimate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Convert to Project Modal Component
interface ConvertToProjectModalProps {
  estimate: Estimate;
  onClose: () => void;
  onSuccess: () => void;
}

const ConvertToProjectModal: React.FC<ConvertToProjectModalProps> = ({
  estimate,
  onClose,
  onSuccess
}) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    project_name: estimate.title,
    project_manager: '',
    start_date: '',
    estimated_end_date: '',
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile?.company_id)
        .in('role', ['admin', 'manager']);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('convert_estimate_to_project', {
        estimate_uuid: estimate.id,
        project_name_override: formData.project_name !== estimate.title ? formData.project_name : null,
        project_manager_id: formData.project_manager || null,
        start_date_override: formData.start_date || null,
        estimated_end_date_override: formData.estimated_end_date || null,
      });

      if (error) throw error;

      if (data.success) {
        alert('Estimate successfully converted to project!');
        onSuccess();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error converting estimate:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">Convert Estimate to Project</h2>
          <p className="text-text-secondary mt-1">
            Convert estimate #{estimate.estimate_number} into a project
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-folioops p-4">
            <h3 className="font-medium text-blue-800 mb-2">Estimate Details</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Title:</strong> {estimate.title}</p>
              <p><strong>Customer:</strong> {estimate.customers?.first_name} {estimate.customers?.last_name}</p>
              <p><strong>Total Amount:</strong> ${estimate.total_amount}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              className="input-field"
              placeholder="Project name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Project Manager
            </label>
            <select
              value={formData.project_manager}
              onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
              className="input-field"
            >
              <option value="">Select Project Manager</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Estimated End Date
              </label>
              <input
                type="date"
                value={formData.estimated_end_date}
                onChange={(e) => setFormData({ ...formData, estimated_end_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-folioops p-4">
            <h3 className="font-medium text-green-800 mb-2">What happens next?</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• A new project will be created with the estimate data</li>
              <li>• The project budget will be set to the estimate total (${estimate.total_amount})</li>
              <li>• The estimate status will be updated to "Converted"</li>
              <li>• You can then add work orders to the project</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Converting...' : 'Convert to Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EstimateList;