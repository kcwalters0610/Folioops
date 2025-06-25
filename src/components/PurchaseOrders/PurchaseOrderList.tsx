import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Building, Edit, Trash2, FileText } from 'lucide-react';
import { supabase, PurchaseOrder, Vendor, WorkOrder } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { getNextDocumentNumber, incrementDocumentNumber } from '../../lib/documentNumbering';

const PurchaseOrderList: React.FC = () => {
  const { profile, hasRole } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  // Check if user can manage purchase orders (admin/manager) or just view (tech)
  const canManagePOs = hasRole(['admin', 'manager']);

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [poRes, vendorsRes, workOrdersRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select(`
            *,
            vendors (id, name, contact_person),
            work_orders (id, title)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('vendors')
          .select('*')
          .eq('company_id', profile?.company_id)
          .eq('is_active', true),
        
        supabase
          .from('work_orders')
          .select('*')
          .eq('company_id', profile?.company_id)
          .neq('status', 'completed')
      ]);

      if (poRes.error) throw poRes.error;
      if (vendorsRes.error) throw vendorsRes.error;
      if (workOrdersRes.error) throw workOrdersRes.error;

      setPurchaseOrders(poRes.data || []);
      setVendors(vendorsRes.data || []);
      setWorkOrders(workOrdersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendors?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.work_orders?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    
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
      case 'received':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddPO = () => {
    if (!canManagePOs) {
      alert('You do not have permission to create purchase orders.');
      return;
    }
    setEditingPO(null);
    setShowModal(true);
  };

  const handleEditPO = (po: PurchaseOrder) => {
    if (!canManagePOs) {
      alert('You do not have permission to edit purchase orders.');
      return;
    }
    setEditingPO(po);
    setShowModal(true);
  };

  const handleDeletePO = async (poId: string) => {
    if (!canManagePOs) {
      alert('You do not have permission to delete purchase orders.');
      return;
    }

    if (!confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', poId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
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
          <h1 className="text-h1 text-primary">Purchase Orders</h1>
          <p className="text-text-secondary mt-1">
            {canManagePOs ? 'Manage vendor purchase orders' : 'View purchase orders'}
          </p>
        </div>
        {canManagePOs && (
          <button
            onClick={handleAddPO}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search purchase orders..."
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
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Purchase Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPOs.map((po) => (
          <div key={po.id} className="card p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  PO #{po.po_number}
                </h3>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(po.status)}`}>
                    {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                  </span>
                </div>
              </div>
              {canManagePOs && (
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleEditPO(po)}
                    className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-folioops transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePO(po.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-folioops transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-text-primary">
                <Building className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {po.vendors?.name}
                  {po.vendors?.contact_person && ` (${po.vendors.contact_person})`}
                </span>
              </div>
              
              {po.work_orders && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Work Order: {po.work_orders.title}
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-3 text-text-primary">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  Order Date: {format(new Date(po.order_date), 'MMM dd, yyyy')}
                </span>
              </div>

              {po.expected_delivery && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Expected: {format(new Date(po.expected_delivery), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {po.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-folioops">
                <p className="text-sm text-text-secondary">{po.notes}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <div className="text-text-secondary">
                  Subtotal: <span className="font-semibold">${po.subtotal}</span>
                </div>
                <div className="text-text-secondary">
                  Tax: <span className="font-semibold">${po.tax_amount}</span>
                </div>
                <div className="text-primary font-semibold">
                  Total: ${po.total_amount}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPOs.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No purchase orders found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'No purchase orders available.'}
          </p>
          {!searchTerm && statusFilter === 'all' && canManagePOs && (
            <button
              onClick={handleAddPO}
              className="mt-4 btn-primary"
            >
              Create Purchase Order
            </button>
          )}
        </div>
      )}

      {showModal && canManagePOs && (
        <PurchaseOrderModal
          purchaseOrder={editingPO}
          vendors={vendors}
          workOrders={workOrders}
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

// Purchase Order Modal Component
interface PurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder | null;
  vendors: Vendor[];
  workOrders: WorkOrder[];
  onClose: () => void;
  onSave: () => void;
}

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ 
  purchaseOrder, 
  vendors, 
  workOrders, 
  onClose, 
  onSave 
}) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    po_number: purchaseOrder?.po_number || '',
    vendor_id: purchaseOrder?.vendor_id || '',
    work_order_id: purchaseOrder?.work_order_id || '',
    status: purchaseOrder?.status || 'draft',
    order_date: purchaseOrder?.order_date || new Date().toISOString().split('T')[0],
    expected_delivery: purchaseOrder?.expected_delivery || '',
    subtotal: purchaseOrder?.subtotal || 0,
    tax_amount: purchaseOrder?.tax_amount || 0,
    notes: purchaseOrder?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!purchaseOrder && profile?.company_id) {
      // Generate document number for new purchase orders
      getNextDocumentNumber(profile.company_id, 'purchase_order').then(number => {
        setFormData(prev => ({ ...prev, po_number: number }));
      });
    }
  }, [purchaseOrder, profile?.company_id]);

  const totalAmount = Number(formData.subtotal) + Number(formData.tax_amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        total_amount: totalAmount,
        subtotal: Number(formData.subtotal),
        tax_amount: Number(formData.tax_amount),
        work_order_id: formData.work_order_id || null,
        expected_delivery: formData.expected_delivery || null,
      };

      if (purchaseOrder) {
        // Update purchase order
        const { error } = await supabase
          .from('purchase_orders')
          .update(submitData)
          .eq('id', purchaseOrder.id);
        if (error) throw error;
      } else {
        // Create purchase order
        const { error } = await supabase
          .from('purchase_orders')
          .insert({
            ...submitData,
            company_id: profile?.company_id,
          });
        if (error) throw error;

        // Increment the document number for next time
        if (profile?.company_id) {
          await incrementDocumentNumber(profile.company_id, 'purchase_order');
        }
      }
      onSave();
    } catch (error) {
      console.error('Error saving purchase order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">
            {purchaseOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                PO Number *
              </label>
              <input
                type="text"
                required
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
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
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Vendor *
            </label>
            <select
              required
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              className="input-field"
            >
              <option value="">Select Vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Related Work Order (Optional)
            </label>
            <select
              value={formData.work_order_id}
              onChange={(e) => setFormData({ ...formData, work_order_id: e.target.value })}
              className="input-field"
            >
              <option value="">No Work Order</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Order Date *
              </label>
              <input
                type="date"
                required
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Expected Delivery
              </label>
              <input
                type="date"
                value={formData.expected_delivery}
                onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Tax Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Total Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={totalAmount}
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
              {loading ? 'Saving...' : 'Save Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderList;