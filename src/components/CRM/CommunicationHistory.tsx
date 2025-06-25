import React, { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, Calendar, MessageSquare, Edit, Trash2, User, Clock } from 'lucide-react';
import { supabase, Communication, Lead, Customer, Opportunity, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const CommunicationHistory: React.FC = () => {
  const { profile } = useAuth();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [communicationsRes, leadsRes, customersRes, opportunitiesRes, employeesRes] = await Promise.all([
        supabase
          .from('communications')
          .select(`
            *,
            leads (id, first_name, last_name, company),
            customers (id, first_name, last_name),
            opportunities (id, title),
            created_profile:profiles!created_by (id, first_name, last_name)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('leads')
          .select('*')
          .eq('company_id', profile?.company_id),
        
        supabase
          .from('customers')
          .select('*')
          .eq('company_id', profile?.company_id),
        
        supabase
          .from('opportunities')
          .select('*')
          .eq('company_id', profile?.company_id),
        
        supabase
          .from('profiles')
          .select('*')
          .eq('company_id', profile?.company_id)
      ]);

      if (communicationsRes.error) throw communicationsRes.error;
      if (leadsRes.error) throw leadsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (opportunitiesRes.error) throw opportunitiesRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setCommunications(communicationsRes.data || []);
      setLeads(leadsRes.data || []);
      setCustomers(customersRes.data || []);
      setOpportunities(opportunitiesRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.leads?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.opportunities?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || comm.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'note':
        return <MessageSquare className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'call':
        return 'bg-blue-100 text-blue-800';
      case 'email':
        return 'bg-green-100 text-green-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'note':
        return 'bg-gray-100 text-gray-800';
      case 'sms':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'inbound' ? 'text-green-600' : 'text-blue-600';
  };

  const handleAddCommunication = () => {
    setEditingCommunication(null);
    setShowModal(true);
  };

  const handleEditCommunication = (communication: Communication) => {
    setEditingCommunication(communication);
    setShowModal(true);
  };

  const handleDeleteCommunication = async (communicationId: string) => {
    if (!confirm('Are you sure you want to delete this communication?')) return;

    try {
      const { error } = await supabase
        .from('communications')
        .delete()
        .eq('id', communicationId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting communication:', error);
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
          <h1 className="text-h1 text-primary">Communication History</h1>
          <p className="text-text-secondary mt-1">Track all customer and lead interactions</p>
        </div>
        <button
          onClick={handleAddCommunication}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Log Communication</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search communications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Types</option>
          <option value="call">Calls</option>
          <option value="email">Emails</option>
          <option value="meeting">Meetings</option>
          <option value="note">Notes</option>
          <option value="sms">SMS</option>
        </select>
      </div>

      {/* Communications List */}
      <div className="space-y-4">
        {filteredCommunications.map((comm) => (
          <div key={comm.id} className="card p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(comm.type)}`}>
                  {getTypeIcon(comm.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-primary">
                      {comm.subject || `${comm.type.charAt(0).toUpperCase() + comm.type.slice(1)} Communication`}
                    </h3>
                    <span className={`text-sm font-medium ${getDirectionColor(comm.direction)}`}>
                      {comm.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-text-secondary mb-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(comm.created_at), 'MMM dd, yyyy h:mm a')}</span>
                    </div>
                    
                    {comm.duration && (
                      <span>{comm.duration} minutes</span>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>
                        {comm.created_profile?.first_name} {comm.created_profile?.last_name}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Related entities */}
                    <div className="flex flex-wrap gap-2">
                      {comm.leads && (
                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Lead: {comm.leads.first_name} {comm.leads.last_name}
                          {comm.leads.company && ` (${comm.leads.company})`}
                        </span>
                      )}
                      {comm.customers && (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Customer: {comm.customers.first_name} {comm.customers.last_name}
                        </span>
                      )}
                      {comm.opportunities && (
                        <span className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                          Opportunity: {comm.opportunities.title}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="bg-gray-50 rounded-folioops p-4">
                      <p className="text-sm text-text-primary">{comm.content}</p>
                    </div>

                    {/* Outcome and follow-up */}
                    {(comm.outcome || comm.follow_up_required) && (
                      <div className="flex items-center justify-between text-sm">
                        {comm.outcome && (
                          <span className="text-text-secondary">
                            <strong>Outcome:</strong> {comm.outcome}
                          </span>
                        )}
                        {comm.follow_up_required && comm.follow_up_date && (
                          <span className="text-orange-600 font-medium">
                            Follow-up: {format(new Date(comm.follow_up_date), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => handleEditCommunication(comm)}
                  className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-folioops transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteCommunication(comm.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-folioops transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCommunications.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No communications found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchTerm || typeFilter !== 'all' 
              ? 'Try adjusting your filters.' 
              : 'Get started by logging your first communication.'
            }
          </p>
          {!searchTerm && typeFilter === 'all' && (
            <button
              onClick={handleAddCommunication}
              className="mt-4 btn-primary"
            >
              Log Communication
            </button>
          )}
        </div>
      )}

      {showModal && (
        <CommunicationModal
          communication={editingCommunication}
          leads={leads}
          customers={customers}
          opportunities={opportunities}
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

// Communication Modal Component
interface CommunicationModalProps {
  communication: Communication | null;
  leads: Lead[];
  customers: Customer[];
  opportunities: Opportunity[];
  onClose: () => void;
  onSave: () => void;
}

const CommunicationModal: React.FC<CommunicationModalProps> = ({ 
  communication, 
  leads, 
  customers, 
  opportunities, 
  onClose, 
  onSave 
}) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    type: communication?.type || 'call',
    direction: communication?.direction || 'outbound',
    subject: communication?.subject || '',
    content: communication?.content || '',
    duration: communication?.duration || '',
    outcome: communication?.outcome || '',
    follow_up_required: communication?.follow_up_required || false,
    follow_up_date: communication?.follow_up_date ? new Date(communication.follow_up_date).toISOString().split('T')[0] : '',
    lead_id: communication?.lead_id || '',
    customer_id: communication?.customer_id || '',
    opportunity_id: communication?.opportunity_id || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        duration: formData.duration ? Number(formData.duration) : null,
        lead_id: formData.lead_id || null,
        customer_id: formData.customer_id || null,
        opportunity_id: formData.opportunity_id || null,
        follow_up_date: formData.follow_up_required && formData.follow_up_date ? formData.follow_up_date : null,
        created_by: profile?.id,
      };

      if (communication) {
        // Update communication
        const { error } = await supabase
          .from('communications')
          .update(submitData)
          .eq('id', communication.id);
        if (error) throw error;
      } else {
        // Create communication
        const { error } = await supabase
          .from('communications')
          .insert({
            ...submitData,
            company_id: profile?.company_id,
          });
        if (error) throw error;
      }
      onSave();
    } catch (error) {
      console.error('Error saving communication:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">
            {communication ? 'Edit Communication' : 'Log New Communication'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input-field"
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Note</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Direction
              </label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                className="input-field"
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="input-field"
                placeholder="30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="input-field"
              placeholder="Brief subject or title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Content *
            </label>
            <textarea
              rows={4}
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input-field"
              placeholder="Detailed description of the communication..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Related Lead
              </label>
              <select
                value={formData.lead_id}
                onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select Lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.first_name} {lead.last_name} {lead.company && `(${lead.company})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Related Customer
              </label>
              <select
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
                Related Opportunity
              </label>
              <select
                value={formData.opportunity_id}
                onChange={(e) => setFormData({ ...formData, opportunity_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select Opportunity</option>
                {opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    {opportunity.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Outcome
            </label>
            <input
              type="text"
              value={formData.outcome}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              className="input-field"
              placeholder="What was the result of this communication?"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.follow_up_required}
                  onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-primary">Follow-up Required</span>
              </label>
            </div>

            {formData.follow_up_required && (
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="input-field"
                />
              </div>
            )}
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
              {loading ? 'Saving...' : 'Save Communication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommunicationHistory;