import React, { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, Edit, Trash2, UserPlus, Building, Calendar, Target } from 'lucide-react';
import { supabase, Lead, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const LeadList: React.FC = () => {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [leadsRes, employeesRes] = await Promise.all([
        supabase
          .from('leads')
          .select(`
            *,
            assigned_profile:profiles!assigned_to (id, first_name, last_name)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('profiles')
          .select('*')
          .eq('company_id', profile?.company_id)
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setLeads(leadsRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'unqualified':
        return 'bg-red-100 text-red-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddLead = () => {
    setEditingLead(null);
    setShowModal(true);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setShowModal(true);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting lead:', error);
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
          <h1 className="text-h1 text-primary">Leads</h1>
          <p className="text-text-secondary mt-1">Manage your sales leads and prospects</p>
        </div>
        <button
          onClick={handleAddLead}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Lead</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search leads..."
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
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="unqualified">Unqualified</option>
          <option value="converted">Converted</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Sources</option>
          <option value="website">Website</option>
          <option value="referral">Referral</option>
          <option value="cold_call">Cold Call</option>
          <option value="social_media">Social Media</option>
          <option value="advertisement">Advertisement</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="card p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  {lead.first_name} {lead.last_name}
                </h3>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                    {lead.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(lead.priority)}`}>
                    {lead.priority.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => handleEditLead(lead)}
                  className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-folioops transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteLead(lead.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-folioops transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {lead.company && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{lead.company}</span>
                </div>
              )}
              
              {lead.email && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{lead.email}</span>
                </div>
              )}
              
              {lead.phone && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{lead.phone}</span>
                </div>
              )}

              {lead.assigned_profile && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <UserPlus className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Assigned to: {lead.assigned_profile.first_name} {lead.assigned_profile.last_name}
                  </span>
                </div>
              )}

              {lead.next_follow_up && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Follow up: {format(new Date(lead.next_follow_up), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}

              {lead.estimated_value && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Target className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Est. Value: ${lead.estimated_value.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {lead.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-folioops">
                <p className="text-sm text-text-secondary">{lead.notes}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">
                  Source: {lead.source.replace('_', ' ')}
                </span>
                <span className="text-text-secondary">
                  {format(new Date(lead.created_at), 'MMM dd')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No leads found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' 
              ? 'Try adjusting your filters.' 
              : 'Get started by adding your first lead.'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && sourceFilter === 'all' && (
            <button
              onClick={handleAddLead}
              className="mt-4 btn-primary"
            >
              Add Lead
            </button>
          )}
        </div>
      )}

      {showModal && (
        <LeadModal
          lead={editingLead}
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

// Lead Modal Component
interface LeadModalProps {
  lead: Lead | null;
  employees: Profile[];
  onClose: () => void;
  onSave: () => void;
}

const LeadModal: React.FC<LeadModalProps> = ({ lead, employees, onClose, onSave }) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    first_name: lead?.first_name || '',
    last_name: lead?.last_name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    company: lead?.company || '',
    address: lead?.address || '',
    city: lead?.city || '',
    state: lead?.state || '',
    zip_code: lead?.zip_code || '',
    source: lead?.source || 'website',
    status: lead?.status || 'new',
    priority: lead?.priority || 'medium',
    assigned_to: lead?.assigned_to || '',
    estimated_value: lead?.estimated_value || '',
    notes: lead?.notes || '',
    next_follow_up: lead?.next_follow_up ? new Date(lead.next_follow_up).toISOString().split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
        assigned_to: formData.assigned_to || null,
        next_follow_up: formData.next_follow_up || null,
      };

      if (lead) {
        // Update lead
        const { error } = await supabase
          .from('leads')
          .update(submitData)
          .eq('id', lead.id);
        if (error) throw error;
      } else {
        // Create lead
        const { error } = await supabase
          .from('leads')
          .insert({
            ...submitData,
            company_id: profile?.company_id,
          });
        if (error) throw error;
      }
      onSave();
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">
            {lead ? 'Edit Lead' : 'Add New Lead'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Company
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Source
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="input-field"
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="cold_call">Cold Call</option>
                <option value="social_media">Social Media</option>
                <option value="advertisement">Advertisement</option>
                <option value="other">Other</option>
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
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="unqualified">Unqualified</option>
                <option value="converted">Converted</option>
              </select>
            </div>
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
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Estimated Value ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Next Follow-up Date
            </label>
            <input
              type="date"
              value={formData.next_follow_up}
              onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Notes
            </label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              placeholder="Additional notes about this lead..."
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
              {loading ? 'Saving...' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadList;