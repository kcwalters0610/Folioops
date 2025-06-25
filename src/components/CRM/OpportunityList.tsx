import React, { useState, useEffect } from 'react';
import { Plus, Search, Target, Edit, Trash2, DollarSign, Calendar, User, TrendingUp } from 'lucide-react';
import { supabase, Opportunity, Lead, Customer, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const OpportunityList: React.FC = () => {
  const { profile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [opportunitiesRes, leadsRes, customersRes, employeesRes] = await Promise.all([
        supabase
          .from('opportunities')
          .select(`
            *,
            leads (id, first_name, last_name, company),
            customers (id, first_name, last_name),
            assigned_profile:profiles!assigned_to (id, first_name, last_name)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('leads')
          .select('*')
          .eq('company_id', profile?.company_id)
          .eq('status', 'qualified'),
        
        supabase
          .from('customers')
          .select('*')
          .eq('company_id', profile?.company_id),
        
        supabase
          .from('profiles')
          .select('*')
          .eq('company_id', profile?.company_id)
      ]);

      if (opportunitiesRes.error) throw opportunitiesRes.error;
      if (leadsRes.error) throw leadsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setOpportunities(opportunitiesRes.data || []);
      setLeads(leadsRes.data || []);
      setCustomers(customersRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.leads?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || opportunity.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'prospecting':
        return 'bg-blue-100 text-blue-800';
      case 'qualification':
        return 'bg-yellow-100 text-yellow-800';
      case 'proposal':
        return 'bg-orange-100 text-orange-800';
      case 'negotiation':
        return 'bg-purple-100 text-purple-800';
      case 'closed_won':
        return 'bg-green-100 text-green-800';
      case 'closed_lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddOpportunity = () => {
    setEditingOpportunity(null);
    setShowModal(true);
  };

  const handleEditOpportunity = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setShowModal(true);
  };

  const handleDeleteOpportunity = async (opportunityId: string) => {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opportunityId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
    }
  };

  const totalValue = filteredOpportunities.reduce((sum, opp) => sum + opp.value, 0);
  const weightedValue = filteredOpportunities.reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0);

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
          <h1 className="text-h1 text-primary">Opportunities</h1>
          <p className="text-text-secondary mt-1">Track your sales opportunities and pipeline</p>
        </div>
        <button
          onClick={handleAddOpportunity}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Opportunity</span>
        </button>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Total Pipeline</p>
              <p className="text-2xl font-bold text-primary">${totalValue.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-folioops flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Weighted Pipeline</p>
              <p className="text-2xl font-bold text-primary">${weightedValue.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-accent/10 rounded-folioops flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Open Opportunities</p>
              <p className="text-2xl font-bold text-primary">
                {filteredOpportunities.filter(opp => !['closed_won', 'closed_lost'].includes(opp.stage)).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-hover/10 rounded-folioops flex items-center justify-center">
              <Target className="h-5 w-5 text-hover" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Stages</option>
          <option value="prospecting">Prospecting</option>
          <option value="qualification">Qualification</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="closed_won">Closed Won</option>
          <option value="closed_lost">Closed Lost</option>
        </select>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOpportunities.map((opportunity) => (
          <div key={opportunity.id} className="card p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  {opportunity.title}
                </h3>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStageColor(opportunity.stage)}`}>
                    {opportunity.stage.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {opportunity.probability}% probability
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => handleEditOpportunity(opportunity)}
                  className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-folioops transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteOpportunity(opportunity.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-folioops transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Value:</span>
                <span className="text-lg font-semibold text-green-600">
                  ${opportunity.value.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Weighted Value:</span>
                <span className="text-sm font-medium text-primary">
                  ${((opportunity.value * opportunity.probability) / 100).toLocaleString()}
                </span>
              </div>

              {(opportunity.leads || opportunity.customers) && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {opportunity.leads 
                      ? `${opportunity.leads.first_name} ${opportunity.leads.last_name}${opportunity.leads.company ? ` (${opportunity.leads.company})` : ''}`
                      : `${opportunity.customers?.first_name} ${opportunity.customers?.last_name}`
                    }
                  </span>
                </div>
              )}

              {opportunity.assigned_profile && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Assigned to: {opportunity.assigned_profile.first_name} {opportunity.assigned_profile.last_name}
                  </span>
                </div>
              )}

              {opportunity.expected_close_date && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Expected close: {format(new Date(opportunity.expected_close_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {opportunity.description && (
              <div className="mt-4 p-3 bg-gray-50 rounded-folioops">
                <p className="text-sm text-text-secondary">{opportunity.description}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">
                  Source: {opportunity.source.replace('_', ' ')}
                </span>
                <span className="text-text-secondary">
                  Created: {format(new Date(opportunity.created_at), 'MMM dd')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOpportunities.length === 0 && (
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No opportunities found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchTerm || stageFilter !== 'all' 
              ? 'Try adjusting your filters.' 
              : 'Get started by adding your first opportunity.'
            }
          </p>
          {!searchTerm && stageFilter === 'all' && (
            <button
              onClick={handleAddOpportunity}
              className="mt-4 btn-primary"
            >
              Add Opportunity
            </button>
          )}
        </div>
      )}

      {showModal && (
        <OpportunityModal
          opportunity={editingOpportunity}
          leads={leads}
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

// Opportunity Modal Component
interface OpportunityModalProps {
  opportunity: Opportunity | null;
  leads: Lead[];
  customers: Customer[];
  employees: Profile[];
  onClose: () => void;
  onSave: () => void;
}

const OpportunityModal: React.FC<OpportunityModalProps> = ({ 
  opportunity, 
  leads, 
  customers, 
  employees, 
  onClose, 
  onSave 
}) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    title: opportunity?.title || '',
    description: opportunity?.description || '',
    value: opportunity?.value || '',
    probability: opportunity?.probability || 50,
    stage: opportunity?.stage || 'prospecting',
    source: opportunity?.source || 'website',
    lead_id: opportunity?.lead_id || '',
    customer_id: opportunity?.customer_id || '',
    assigned_to: opportunity?.assigned_to || '',
    expected_close_date: opportunity?.expected_close_date ? new Date(opportunity.expected_close_date).toISOString().split('T')[0] : '',
    notes: opportunity?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        value: Number(formData.value),
        lead_id: formData.lead_id || null,
        customer_id: formData.customer_id || null,
        assigned_to: formData.assigned_to || null,
        expected_close_date: formData.expected_close_date || null,
      };

      if (opportunity) {
        // Update opportunity
        const { error } = await supabase
          .from('opportunities')
          .update(submitData)
          .eq('id', opportunity.id);
        if (error) throw error;
      } else {
        // Create opportunity
        const { error } = await supabase
          .from('opportunities')
          .insert({
            ...submitData,
            company_id: profile?.company_id,
          });
        if (error) throw error;
      }
      onSave();
    } catch (error) {
      console.error('Error saving opportunity:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">
            {opportunity ? 'Edit Opportunity' : 'Add New Opportunity'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              placeholder="Detailed description of the opportunity..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Value ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="input-field"
              >
                <option value="prospecting">Prospecting</option>
                <option value="qualification">Qualification</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Related Lead
              </label>
              <select
                value={formData.lead_id}
                onChange={(e) => setFormData({ ...formData, lead_id: e.target.value, customer_id: '' })}
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
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, lead_id: '' })}
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
                Expected Close Date
              </label>
              <input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
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
              placeholder="Additional notes about this opportunity..."
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
              {loading ? 'Saving...' : 'Save Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpportunityList;