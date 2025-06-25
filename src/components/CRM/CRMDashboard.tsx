import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Plus,
  ArrowRight,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import { supabase, Lead, Opportunity, Communication } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CRMStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalOpportunities: number;
  openOpportunities: number;
  wonOpportunities: number;
  totalOpportunityValue: number;
  avgDealSize: number;
  conversionRate: number;
  recentCommunications: number;
}

const CRMDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<CRMStats>({
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    totalOpportunities: 0,
    openOpportunities: 0,
    wonOpportunities: 0,
    totalOpportunityValue: 0,
    avgDealSize: 0,
    conversionRate: 0,
    recentCommunications: 0,
  });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [recentOpportunities, setRecentOpportunities] = useState<Opportunity[]>([]);
  const [recentCommunications, setRecentCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      fetchCRMData();
    }
  }, [profile]);

  const fetchCRMData = async () => {
    try {
      const [leadsRes, opportunitiesRes, communicationsRes] = await Promise.all([
        supabase
          .from('leads')
          .select(`
            *,
            assigned_profile:profiles!assigned_to (first_name, last_name)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('opportunities')
          .select(`
            *,
            leads (first_name, last_name),
            customers (first_name, last_name),
            assigned_profile:profiles!assigned_to (first_name, last_name)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('communications')
          .select(`
            *,
            leads (first_name, last_name),
            customers (first_name, last_name),
            opportunities (title),
            created_profile:profiles!created_by (first_name, last_name)
          `)
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (opportunitiesRes.error) throw opportunitiesRes.error;
      if (communicationsRes.error) throw communicationsRes.error;

      const leads = leadsRes.data || [];
      const opportunities = opportunitiesRes.data || [];
      const communications = communicationsRes.data || [];

      // Calculate stats
      const newLeads = leads.filter(lead => lead.status === 'new').length;
      const qualifiedLeads = leads.filter(lead => lead.status === 'qualified').length;
      const convertedLeads = leads.filter(lead => lead.status === 'converted').length;
      
      const openOpportunities = opportunities.filter(opp => 
        !['closed_won', 'closed_lost'].includes(opp.stage)
      ).length;
      const wonOpportunities = opportunities.filter(opp => opp.stage === 'closed_won').length;
      
      const totalOpportunityValue = opportunities
        .filter(opp => opp.stage !== 'closed_lost')
        .reduce((sum, opp) => sum + opp.value, 0);
      
      const avgDealSize = wonOpportunities > 0 
        ? opportunities
            .filter(opp => opp.stage === 'closed_won')
            .reduce((sum, opp) => sum + opp.value, 0) / wonOpportunities
        : 0;
      
      const conversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentCommunications = communications.filter(comm => 
        new Date(comm.created_at) >= oneWeekAgo
      ).length;

      setStats({
        totalLeads: leads.length,
        newLeads,
        qualifiedLeads,
        convertedLeads,
        totalOpportunities: opportunities.length,
        openOpportunities,
        wonOpportunities,
        totalOpportunityValue,
        avgDealSize,
        conversionRate,
        recentCommunications,
      });

      setRecentLeads(leads.slice(0, 5));
      setRecentOpportunities(opportunities.slice(0, 5));
      setRecentCommunications(communications);

    } catch (error) {
      console.error('Error fetching CRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const leadStatusData = [
    { name: 'New', value: stats.newLeads, color: '#3FBAC2' },
    { name: 'Qualified', value: stats.qualifiedLeads, color: '#7CCBDD' },
    { name: 'Converted', value: stats.convertedLeads, color: '#084A5F' },
  ];

  const opportunityStageData = [
    { name: 'Open', value: stats.openOpportunities },
    { name: 'Won', value: stats.wonOpportunities },
    { name: 'Lost', value: stats.totalOpportunities - stats.openOpportunities - stats.wonOpportunities },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-primary">CRM Dashboard</h1>
          <p className="text-text-secondary mt-1">Manage your sales pipeline and customer relationships</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/crm/leads" className="btn-secondary flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Add Lead</span>
          </Link>
          <Link to="/crm/opportunities" className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Opportunity</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Total Leads</p>
              <p className="text-3xl font-bold text-primary">{stats.totalLeads}</p>
              <p className="text-xs text-green-600 mt-1">
                {stats.newLeads} new this month
              </p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-folioops flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="card p-6 hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Open Opportunities</p>
              <p className="text-3xl font-bold text-primary">{stats.openOpportunities}</p>
              <p className="text-xs text-hover mt-1">
                ${stats.totalOpportunityValue.toLocaleString()} potential
              </p>
            </div>
            <div className="w-12 h-12 bg-hover/10 rounded-folioops flex items-center justify-center">
              <Target className="h-6 w-6 text-hover" />
            </div>
          </div>
        </div>

        <div className="card p-6 hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Avg Deal Size</p>
              <p className="text-3xl font-bold text-primary">
                ${stats.avgDealSize.toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {stats.wonOpportunities} deals won
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-folioops flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="card p-6 hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-primary">
                {stats.conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-hover mt-1">
                {stats.recentCommunications} recent activities
              </p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-folioops flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h3 className="text-h3 text-primary mb-6">Lead Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {leadStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-h3 text-primary mb-6">Opportunity Pipeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={opportunityStageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#20282B" />
              <YAxis stroke="#20282B" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(8, 74, 95, 0.1)'
                }}
              />
              <Bar dataKey="value" fill="#084A5F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Leads */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-h3 text-primary">Recent Leads</h3>
            <Link 
              to="/crm/leads" 
              className="text-accent hover:text-hover flex items-center space-x-1 text-sm font-medium"
            >
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-folioops">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {lead.first_name.charAt(0)}{lead.last_name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {lead.first_name} {lead.last_name}
                  </p>
                  <p className="text-xs text-text-secondary">{lead.company || 'No company'}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                    lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
            {recentLeads.length === 0 && (
              <p className="text-text-secondary text-sm text-center py-4">No recent leads</p>
            )}
          </div>
        </div>

        {/* Recent Opportunities */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-h3 text-primary">Recent Opportunities</h3>
            <Link 
              to="/crm/opportunities" 
              className="text-accent hover:text-hover flex items-center space-x-1 text-sm font-medium"
            >
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="p-3 bg-gray-50 rounded-folioops">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-primary truncate">
                    {opportunity.title}
                  </p>
                  <span className="text-sm font-semibold text-green-600">
                    ${opportunity.value.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    opportunity.stage === 'prospecting' ? 'bg-blue-100 text-blue-800' :
                    opportunity.stage === 'qualification' ? 'bg-yellow-100 text-yellow-800' :
                    opportunity.stage === 'proposal' ? 'bg-orange-100 text-orange-800' :
                    opportunity.stage === 'negotiation' ? 'bg-purple-100 text-purple-800' :
                    opportunity.stage === 'closed_won' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {opportunity.stage.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {opportunity.probability}% probability
                  </span>
                </div>
              </div>
            ))}
            {recentOpportunities.length === 0 && (
              <p className="text-text-secondary text-sm text-center py-4">No recent opportunities</p>
            )}
          </div>
        </div>

        {/* Recent Communications */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-h3 text-primary">Recent Activity</h3>
            <Link 
              to="/crm/communications" 
              className="text-accent hover:text-hover flex items-center space-x-1 text-sm font-medium"
            >
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentCommunications.slice(0, 5).map((comm) => (
              <div key={comm.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-folioops">
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                  {comm.type === 'call' && <Phone className="h-4 w-4 text-white" />}
                  {comm.type === 'email' && <Mail className="h-4 w-4 text-white" />}
                  {comm.type === 'meeting' && <Calendar className="h-4 w-4 text-white" />}
                  {comm.type === 'note' && <MessageSquare className="h-4 w-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {comm.subject || `${comm.type.charAt(0).toUpperCase() + comm.type.slice(1)} activity`}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {comm.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(comm.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {recentCommunications.length === 0 && (
              <p className="text-text-secondary text-sm text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;