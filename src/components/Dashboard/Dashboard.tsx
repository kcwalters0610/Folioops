import React, { useState, useEffect } from 'react';
import {
  Users,
  ClipboardList,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalCustomers: number;
  activeWorkOrders: number;
  totalInvoices: number;
  monthlyRevenue: number;
  completedOrders: number;
  pendingOrders: number;
  overdueInvoices: number;
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeWorkOrders: 0,
    totalInvoices: 0,
    monthlyRevenue: 0,
    completedOrders: 0,
    pendingOrders: 0,
    overdueInvoices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile?.company_id) return;

    try {
      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);

      // Fetch work orders
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('status, total_cost')
        .eq('company_id', profile.company_id);

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, total_amount, due_date')
        .eq('company_id', profile.company_id);

      const activeWorkOrders = workOrders?.filter(wo => wo.status !== 'completed').length || 0;
      const completedOrders = workOrders?.filter(wo => wo.status === 'completed').length || 0;
      const pendingOrders = workOrders?.filter(wo => wo.status === 'scheduled' || wo.status === 'in_progress').length || 0;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = invoices
        ?.filter(inv => {
          const invoiceDate = new Date(inv.due_date || '');
          return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + inv.total_amount, 0) || 0;

      const overdueInvoices = invoices?.filter(inv => {
        if (inv.status === 'paid') return false;
        const dueDate = new Date(inv.due_date || '');
        return dueDate < new Date();
      }).length || 0;

      setStats({
        totalCustomers: customersCount || 0,
        activeWorkOrders,
        totalInvoices: invoices?.length || 0,
        monthlyRevenue,
        completedOrders,
        pendingOrders,
        overdueInvoices,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Completed', value: stats.completedOrders },
    { name: 'Pending', value: stats.pendingOrders },
    { name: 'Cancelled', value: 2 },
  ];

  const monthlyData = [
    { month: 'Jan', revenue: 15000 },
    { month: 'Feb', revenue: 18000 },
    { month: 'Mar', revenue: 22000 },
    { month: 'Apr', revenue: 19000 },
    { month: 'May', revenue: 25000 },
    { month: 'Jun', revenue: stats.monthlyRevenue },
  ];

  const COLORS = ['#3FBAC2', '#7CCBDD', '#084A5F'];

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
          <h1 className="text-h1 text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Welcome back, {profile?.first_name}!</p>
        </div>
        <div className="text-sm text-text-muted">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-primary">{stats.totalCustomers}</p>
              <p className="text-xs text-hover mt-1">+12% from last month</p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-folioops flex items-center justify-center">
              <Users className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="card p-6 hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Active Work Orders</p>
              <p className="text-3xl font-bold text-primary">{stats.activeWorkOrders}</p>
              <p className="text-xs text-hover mt-1">+5% from last week</p>
            </div>
            <div className="w-12 h-12 bg-hover/10 rounded-folioops flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-hover" />
            </div>
          </div>
        </div>

        <div className="card p-6 hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Total Invoices</p>
              <p className="text-3xl font-bold text-primary">{stats.totalInvoices}</p>
              <p className="text-xs text-hover mt-1">+8% from last month</p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-folioops flex items-center justify-center">
              <FileText className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="card p-6 hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Monthly Revenue</p>
              <p className="text-3xl font-bold text-primary">
                ${stats.monthlyRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-hover mt-1">+15% from last month</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-folioops flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gradient-accent rounded-folioops-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Completed Today</p>
              <p className="text-3xl font-bold">{stats.completedOrders}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-white/80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-hover to-accent rounded-folioops-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Pending Orders</p>
              <p className="text-3xl font-bold">{stats.pendingOrders}</p>
            </div>
            <Calendar className="h-8 w-8 text-white/80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-folioops-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Overdue Invoices</p>
              <p className="text-3xl font-bold">{stats.overdueInvoices}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-white/80" />
          </div>
        </div>

        <div className="gradient-primary rounded-folioops-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Growth Rate</p>
              <p className="text-3xl font-bold">+12%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-white/80" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h3 className="text-h3 text-primary mb-6">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#20282B" />
              <YAxis stroke="#20282B" />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(8, 74, 95, 0.1)'
                }}
              />
              <Bar dataKey="revenue" fill="#084A5F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-h3 text-primary mb-6">Work Order Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(8, 74, 95, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;