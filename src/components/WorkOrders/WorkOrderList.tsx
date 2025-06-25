import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, AlertCircle, CheckCircle, Clock, X, Edit, Trash2 } from 'lucide-react';
import { supabase, WorkOrder, Customer, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { getNextDocumentNumber, incrementDocumentNumber } from '../../lib/documentNumbering';

const WorkOrderList: React.FC = () => {
  const { profile } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [workOrdersRes, customersRes, employeesRes] = await Promise.all([
        supabase
          .from('work_orders')
          .select(`
            *,
            customers (id, first_name, last_name, address, city, state),
            profiles!assigned_to (id, first_name, last_name)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('customers')
          .select('*')
          .eq('company_id', profile?.company_id),
        
        supabase
          .from('profiles')
          .select('*')
          .eq('company_id', profile?.company_id)
      ]);

      if (workOrdersRes.error) throw workOrdersRes.error;
      if (customersRes.error) throw customersRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setWorkOrders(workOrdersRes.data || []);
      setCustomers(customersRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkOrders = workOrders.filter(workOrder => {
    const matchesSearch = workOrder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.wo_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${workOrder.customers?.first_name} ${workOrder.customers?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || workOrder.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddWorkOrder = () => {
    setEditingWorkOrder(null);
    setShowModal(true);
  };

  const handleEditWorkOrder = (workOrder: WorkOrder) => {
    setEditingWorkOrder(workOrder);
    setShowModal(true);
  };

  const handleDeleteWorkOrder = async (workOrderId: string) => {
    if (!confirm('Are you sure you want to delete this work order?')) return;

    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', workOrderId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting work order:', error);
    }
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
          <h1 className="text-h1 text-primary">Work Orders</h1>
          <p className="text-text-secondary mt-1">Manage and track your work orders</p>
        </div>
        <button
          onClick={handleAddWorkOrder}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Work Order</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search work orders..."
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
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Work Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredWorkOrders.map((workOrder) => (
          <div key={workOrder.id} className="card p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-primary">
                    {workOrder.wo_number || 'No WO#'}
                  </h3>
                  <span className="text-sm text-text-secondary">•</span>
                  <span className="text-sm text-text-secondary">{workOrder.title}</span>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(workOrder.status)}`}>
                    {getStatusIcon(workOrder.status)}
                    <span className="capitalize">{workOrder.status.replace('_', ' ')}</span>
                  </span>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(workOrder.priority)}`}>
                    {workOrder.priority} priority
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => handleEditWorkOrder(workOrder)}
                  className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-folioops transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteWorkOrder(workOrder.id)}
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
                  {workOrder.customers?.first_name} {workOrder.customers?.last_name}
                </span>
              </div>
              
              {workOrder.profiles && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Assigned to: {workOrder.profiles.first_name} {workOrder.profiles.last_name}
                  </span>
                </div>
              )}

              {workOrder.scheduled_date && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {format(new Date(workOrder.scheduled_date), 'MMM dd, yyyy h:mm a')}
                  </span>
                </div>
              )}

              {workOrder.customers?.address && (
                <div className="flex items-start space-x-3 text-text-primary">
                  <div className="h-4 w-4 text-gray-400 mt-0.5">📍</div>
                  <span className="text-sm">
                    {workOrder.customers.address}
                    {workOrder.customers.city && `, ${workOrder.customers.city}`}
                    {workOrder.customers.state && `, ${workOrder.customers.state}`}
                  </span>
                </div>
              )}
            </div>

            {workOrder.description && (
              <div className="mt-4 p-3 bg-gray-50 rounded-folioops">
                <p className="text-sm text-text-secondary">{workOrder.description}</p>
              </div>
            )}

            <div className="mt-4 flex justify-between items-center text-sm">
              <div className="text-text-secondary">
                Total: <span className="font-semibold text-primary">${workOrder.total_cost}</span>
              </div>
              {workOrder.estimated_hours && (
                <div className="text-text-secondary">
                  Est: {workOrder.estimated_hours}h
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredWorkOrders.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No work orders found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Get started by creating your first work order.'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={handleAddWorkOrder}
              className="mt-4 btn-primary"
            >
              Create Work Order
            </button>
          )}
        </div>
      )}

      {showModal && (
        <WorkOrderModal
          workOrder={editingWorkOrder}
          customers={customers}
          employees={employees}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// Work Order Modal Component
interface WorkOrderModalProps {
  workOrder: WorkOrder | null;
  customers: Customer[];
  employees: Profile[];
  onClose: () => void;
  onSave: () => void;
}

const WorkOrderModal: React.FC<WorkOrderModalProps> = ({ workOrder, customers, employees, onClose, onSave }) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    wo_number: workOrder?.wo_number || '',
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    customer_id: workOrder?.customer_id || '',
    assigned_to: workOrder?.assigned_to || '',
    priority: workOrder?.priority || 'medium',
    status: workOrder?.status || 'scheduled',
    scheduled_date: workOrder?.scheduled_date ? new Date(workOrder.scheduled_date).toISOString().slice(0, 16) : '',
    estimated_hours: workOrder?.estimated_hours || '',
    labor_cost: workOrder?.labor_cost || 0,
    material_cost: workOrder?.material_cost || 0,
    notes: workOrder?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workOrder && profile?.company_id) {
      // Generate WO number for new work orders
      getNextDocumentNumber(profile.company_id, 'work_order').then(number => {
        setFormData(prev => ({ ...prev, wo_number: number }));
      });
    }
  }, [workOrder, profile?.company_id]);

  const totalCost = Number(formData.labor_cost) + Number(formData.material_cost);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        total_cost: totalCost,
        estimated_hours: formData.estimated_hours ? Number(formData.estimated_hours) : null,
        labor_cost: Number(formData.labor_cost),
        material_cost: Number(formData.material_cost),
        scheduled_date: formData.scheduled_date ? new Date(formData.scheduled_date).toISOString() : null,
        assigned_to: formData.assigned_to || null,
      };

      if (workOrder) {
        // Update work order
        const { error } = await supabase
          .from('work_orders')
          .update(submitData)
          .eq('id', workOrder.id);
        if (error) throw error;
      } else {
        // Create work order with generated WO number
        const { error } = await supabase
          .from('work_orders')
          .insert({
            ...submitData,
            company_id: profile?.company_id,
          });
        if (error) throw error;

        // Increment the document number for next time
        if (profile?.company_id) {
          await incrementDocumentNumber(profile.company_id, 'work_order');
        }
      }
      onSave();
    } catch (error) {
      console.error('Error saving work order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">
            {workOrder ? 'Edit Work Order' : 'Create New Work Order'}
          </h2>
          {!workOrder && formData.wo_number && (
            <p className="text-sm text-text-secondary mt-1">
              Work Order Number: <span className="font-mono font-semibold">{formData.wo_number}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                WO Number *
              </label>
              <input
                type="text"
                required
                value={formData.wo_number}
                onChange={(e) => setFormData({ ...formData, wo_number: e.target.value })}
                className="input-field"
                placeholder="WO-2024-0001"
              />
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
                placeholder="Brief description of work"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              placeholder="Detailed description of work to be performed..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Assigned To
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="input-field"
              >
                <option value="">Unassigned</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
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
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Scheduled Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Labor Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.labor_cost}
                onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Material Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.material_cost}
                onChange={(e) => setFormData({ ...formData, material_cost: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Total Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={totalCost}
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
              placeholder="Additional notes or special instructions..."
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
              {loading ? 'Saving...' : 'Save Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkOrderList;