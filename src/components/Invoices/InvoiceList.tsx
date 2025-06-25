import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Edit, Trash2, FileText, DollarSign } from 'lucide-react';
import { supabase, Invoice, Customer, WorkOrder } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { getNextDocumentNumber, incrementDocumentNumber } from '../../lib/documentNumbering';

const InvoiceList: React.FC = () => {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [invoicesRes, customersRes, workOrdersRes] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            *,
            customers (id, first_name, last_name, email),
            work_orders (id, title)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('customers')
          .select('*')
          .eq('company_id', profile?.company_id),
        
        supabase
          .from('work_orders')
          .select('*')
          .eq('company_id', profile?.company_id)
          .eq('status', 'completed')
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (customersRes.error) throw customersRes.error;
      if (workOrdersRes.error) throw workOrdersRes.error;

      setInvoices(invoicesRes.data || []);
      setCustomers(customersRes.data || []);
      setWorkOrders(workOrdersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${invoice.customers?.first_name} ${invoice.customers?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.work_orders?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid' || !invoice.due_date) return false;
    return new Date(invoice.due_date) < new Date();
  };

  const handleAddInvoice = () => {
    setEditingInvoice(null);
    setShowModal(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowModal(true);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
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
          <h1 className="text-h1 text-primary">Invoices</h1>
          <p className="text-text-secondary mt-1">Manage customer invoices and payments</p>
        </div>
        <button
          onClick={handleAddInvoice}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search invoices..."
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
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInvoices.map((invoice) => (
          <div key={invoice.id} className="card p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Invoice #{invoice.invoice_number}
                </h3>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    isOverdue(invoice) && invoice.status !== 'paid' 
                      ? 'bg-red-100 text-red-800' 
                      : getStatusColor(invoice.status)
                  }`}>
                    {isOverdue(invoice) && invoice.status !== 'paid' ? 'Overdue' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => handleEditInvoice(invoice)}
                  className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-folioops transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteInvoice(invoice.id)}
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
                  {invoice.customers?.first_name} {invoice.customers?.last_name}
                </span>
              </div>
              
              {invoice.work_orders && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Work Order: {invoice.work_orders.title}
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-3 text-text-primary">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  Issue Date: {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                </span>
              </div>

              {invoice.due_date && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className={`text-sm ${isOverdue(invoice) && invoice.status !== 'paid' ? 'text-red-600 font-medium' : ''}`}>
                    Due Date: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}

              {invoice.payment_date && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    Paid: {format(new Date(invoice.payment_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {invoice.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-folioops">
                <p className="text-sm text-text-secondary">{invoice.notes}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <div className="text-text-secondary">
                  Subtotal: <span className="font-semibold">${invoice.subtotal}</span>
                </div>
                <div className="text-text-secondary">
                  Tax: <span className="font-semibold">${invoice.tax_amount}</span>
                </div>
                <div className="text-primary font-semibold">
                  Total: ${invoice.total_amount}
                </div>
              </div>
              {invoice.paid_amount > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  Paid: ${invoice.paid_amount} 
                  {invoice.paid_amount < invoice.total_amount && (
                    <span className="text-red-600 ml-2">
                      (Balance: ${invoice.total_amount - invoice.paid_amount})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No invoices found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Get started by creating your first invoice.'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={handleAddInvoice}
              className="mt-4 btn-primary"
            >
              Create Invoice
            </button>
          )}
        </div>
      )}

      {showModal && (
        <InvoiceModal
          invoice={editingInvoice}
          customers={customers}
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

// Invoice Modal Component
interface InvoiceModalProps {
  invoice: Invoice | null;
  customers: Customer[];
  workOrders: WorkOrder[];
  onClose: () => void;
  onSave: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ 
  invoice, 
  customers, 
  workOrders, 
  onClose, 
  onSave 
}) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    invoice_number: invoice?.invoice_number || '',
    customer_id: invoice?.customer_id || '',
    work_order_id: invoice?.work_order_id || '',
    status: invoice?.status || 'draft',
    issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || '',
    subtotal: invoice?.subtotal || 0,
    tax_rate: invoice?.tax_rate || 0,
    paid_amount: invoice?.paid_amount || 0,
    payment_date: invoice?.payment_date || '',
    notes: invoice?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invoice && profile?.company_id) {
      // Generate document number for new invoices
      getNextDocumentNumber(profile.company_id, 'invoice').then(number => {
        setFormData(prev => ({ ...prev, invoice_number: number }));
      });
    }
  }, [invoice, profile?.company_id]);

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
        paid_amount: Number(formData.paid_amount),
        work_order_id: formData.work_order_id || null,
        due_date: formData.due_date || null,
        payment_date: formData.payment_date || null,
      };

      if (invoice) {
        // Update invoice
        const { error } = await supabase
          .from('invoices')
          .update(submitData)
          .eq('id', invoice.id);
        if (error) throw error;
      } else {
        // Create invoice
        const { error } = await supabase
          .from('invoices')
          .insert({
            ...submitData,
            company_id: profile?.company_id,
          });
        if (error) throw error;

        // Increment the document number for next time
        if (profile?.company_id) {
          await incrementDocumentNumber(profile.company_id, 'invoice');
        }
      }
      onSave();
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">
            {invoice ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
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
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
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
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Paid Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="input-field"
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
              {loading ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceList;