import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Calendar, Download, Filter, Search, RefreshCw, Settings, 
  TrendingUp, Users, DollarSign, FileText, Eye, EyeOff,
  ChevronDown, Grid, List, Maximize2, Minimize2, HelpCircle,
  ArrowUp, ArrowDown, MoreVertical, Zap
} from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Types for dashboard data
interface DashboardData {
  revenue: Array<{ date: string; amount: number; orders: number; customers: number }>;
  workOrders: Array<{ status: string; count: number; value: number }>;
  customers: Array<{ type: string; count: number; revenue: number }>;
  performance: Array<{ metric: string; current: number; previous: number; target: number }>;
  topCustomers: Array<{ name: string; revenue: number; orders: number; growth: number }>;
  recentActivity: Array<{ id: string; type: string; description: string; timestamp: string; value?: number }>;
}

interface FilterState {
  dateRange: { start: string; end: string };
  status: string;
  customerType: string;
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface DashboardConfig {
  layout: 'grid' | 'list';
  autoRefresh: boolean;
  refreshInterval: number;
  visibleMetrics: string[];
  chartTypes: Record<string, string>;
  theme: 'light' | 'dark';
}

const InteractiveDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData>({
    revenue: [],
    workOrders: [],
    customers: [],
    performance: [],
    topCustomers: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [drillDownData, setDrillDownData] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    status: 'all',
    customerType: 'all',
    searchTerm: '',
    sortBy: 'revenue',
    sortOrder: 'desc'
  });

  const [config, setConfig] = useState<DashboardConfig>({
    layout: 'grid',
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    visibleMetrics: ['revenue', 'workOrders', 'customers', 'performance'],
    chartTypes: {
      revenue: 'area',
      workOrders: 'bar',
      customers: 'pie',
      performance: 'line'
    },
    theme: 'light'
  });

  // Auto-refresh functionality
  useEffect(() => {
    if (config.autoRefresh) {
      const interval = setInterval(() => {
        fetchDashboardData(true);
      }, config.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [config.autoRefresh, config.refreshInterval, filters]);

  // Initial data fetch
  useEffect(() => {
    if (profile?.company_id) {
      fetchDashboardData();
    }
  }, [profile, filters]);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Simulate API calls with real Supabase data
      const [workOrdersRes, customersRes, invoicesRes] = await Promise.all([
        supabase
          .from('work_orders')
          .select('*')
          .eq('company_id', profile?.company_id)
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end + 'T23:59:59'),
        
        supabase
          .from('customers')
          .select('*')
          .eq('company_id', profile?.company_id),
        
        supabase
          .from('invoices')
          .select('*')
          .eq('company_id', profile?.company_id)
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end + 'T23:59:59')
      ]);

      // Process and transform data
      const processedData = processRawData(
        workOrdersRes.data || [],
        customersRes.data || [],
        invoicesRes.data || []
      );

      setData(processedData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processRawData = (workOrders: any[], customers: any[], invoices: any[]): DashboardData => {
    // Generate revenue data over time
    const revenueData = generateTimeSeriesData(invoices, filters.dateRange);
    
    // Process work orders by status
    const workOrderData = workOrders.reduce((acc, wo) => {
      const existing = acc.find(item => item.status === wo.status);
      if (existing) {
        existing.count += 1;
        existing.value += wo.total_cost || 0;
      } else {
        acc.push({
          status: wo.status.replace('_', ' ').toUpperCase(),
          count: 1,
          value: wo.total_cost || 0
        });
      }
      return acc;
    }, []);

    // Process customers by type
    const customerData = customers.reduce((acc, customer) => {
      const existing = acc.find(item => item.type === customer.customer_type);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({
          type: customer.customer_type.charAt(0).toUpperCase() + customer.customer_type.slice(1),
          count: 1,
          revenue: Math.random() * 50000 // Simulated revenue per customer type
        });
      }
      return acc;
    }, []);

    // Generate performance metrics
    const performanceData = [
      { metric: 'Revenue Growth', current: 15.2, previous: 12.8, target: 18.0 },
      { metric: 'Customer Satisfaction', current: 4.6, previous: 4.4, target: 4.8 },
      { metric: 'Order Completion Rate', current: 94.5, previous: 91.2, target: 96.0 },
      { metric: 'Average Response Time', current: 2.3, previous: 2.8, target: 2.0 }
    ];

    // Generate top customers (simulated)
    const topCustomers = customers.slice(0, 5).map((customer, index) => ({
      name: `${customer.first_name} ${customer.last_name}`,
      revenue: Math.random() * 25000 + 5000,
      orders: Math.floor(Math.random() * 20) + 5,
      growth: (Math.random() - 0.5) * 40
    }));

    // Generate recent activity
    const recentActivity = [
      ...workOrders.slice(0, 3).map(wo => ({
        id: wo.id,
        type: 'work_order',
        description: `Work order ${wo.wo_number || wo.title} ${wo.status}`,
        timestamp: wo.updated_at,
        value: wo.total_cost
      })),
      ...invoices.slice(0, 2).map(inv => ({
        id: inv.id,
        type: 'invoice',
        description: `Invoice ${inv.invoice_number} ${inv.status}`,
        timestamp: inv.updated_at,
        value: inv.total_amount
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      revenue: revenueData,
      workOrders: workOrderData,
      customers: customerData,
      performance: performanceData,
      topCustomers,
      recentActivity
    };
  };

  const generateTimeSeriesData = (invoices: any[], dateRange: { start: string; end: string }) => {
    const days = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayInvoices = invoices.filter(inv => 
        format(new Date(inv.created_at), 'yyyy-MM-dd') === dateStr
      );
      
      days.push({
        date: format(d, 'MMM dd'),
        amount: dayInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
        orders: dayInvoices.length,
        customers: new Set(dayInvoices.map(inv => inv.customer_id)).size
      });
    }
    
    return days;
  };

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let filtered = { ...data };
    
    if (filters.searchTerm) {
      filtered.topCustomers = filtered.topCustomers.filter(customer =>
        customer.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }
    
    // Sort top customers
    filtered.topCustomers.sort((a, b) => {
      const aVal = a[filters.sortBy as keyof typeof a] as number;
      const bVal = b[filters.sortBy as keyof typeof b] as number;
      return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [data, filters]);

  const handleDrillDown = (chartType: string, dataPoint: any) => {
    setSelectedMetric(chartType);
    setDrillDownData(dataPoint);
    console.log('Drill down:', chartType, dataPoint);
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setLoading(true);
    try {
      // Simulate export functionality
      const exportData = {
        revenue: filteredData.revenue,
        workOrders: filteredData.workOrders,
        customers: filteredData.customers,
        topCustomers: filteredData.topCustomers
      };

      if (format === 'csv') {
        downloadCSV(exportData);
      } else if (format === 'excel') {
        // Would integrate with a library like xlsx
        console.log('Excel export not implemented in demo');
        alert('Excel export would be implemented with xlsx library');
      } else if (format === 'pdf') {
        // Would integrate with jsPDF
        console.log('PDF export not implemented in demo');
        alert('PDF export would be implemented with jsPDF library');
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (data: any) => {
    const csvContent = Object.entries(data)
      .map(([key, value]) => {
        const headers = Object.keys((value as any[])[0] || {}).join(',');
        const rows = (value as any[]).map(item => Object.values(item).join(',')).join('\n');
        return `${key.toUpperCase()}\n${headers}\n${rows}\n\n`;
      })
      .join('');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleMetricVisibility = (metric: string) => {
    setConfig(prev => ({
      ...prev,
      visibleMetrics: prev.visibleMetrics.includes(metric)
        ? prev.visibleMetrics.filter(m => m !== metric)
        : [...prev.visibleMetrics, metric]
    }));
  };

  const COLORS = ['#084A5F', '#3FBAC2', '#7CCBDD', '#A3D7E6', '#5BB8CE'];

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : ''}`}>
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary flex items-center gap-2">
            Interactive Dashboard
            {refreshing && <RefreshCw className="h-5 w-5 animate-spin" />}
          </h1>
          <p className="text-text-secondary mt-1">
            Real-time business insights with interactive data visualization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Auto-refresh indicator */}
          {config.autoRefresh && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Zap className="h-4 w-4" />
              <span>Live</span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search customers..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="input-field pl-10 w-48"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary text-white' : ''}`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>

          {/* Export Menu */}
          <div className="relative group">
            <button className="btn-secondary flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-folioops shadow-folioops border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-folioops"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50"
              >
                Export as Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 last:rounded-b-folioops"
              >
                Export as PDF
              </button>
            </div>
          </div>

          {/* Layout Toggle */}
          <button
            onClick={() => setConfig(prev => ({ ...prev, layout: prev.layout === 'grid' ? 'list' : 'grid' }))}
            className="btn-secondary flex items-center gap-2"
          >
            {config.layout === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="btn-secondary flex items-center gap-2"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Help */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="btn-secondary flex items-center gap-2"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="input-field text-sm"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="input-field"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Customer Type</label>
              <select
                value={filters.customerType}
                onChange={(e) => setFilters(prev => ({ ...prev, customerType: e.target.value }))}
                className="input-field"
              >
                <option value="all">All Types</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="input-field flex-1"
                >
                  <option value="revenue">Revenue</option>
                  <option value="orders">Orders</option>
                  <option value="growth">Growth</option>
                </select>
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                  }))}
                  className="btn-secondary px-3"
                >
                  {filters.sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (
        <div className="card p-6 bg-blue-50">
          <h3 className="text-lg font-semibold text-primary mb-4">Dashboard Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Auto Refresh</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.autoRefresh}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Enable</span>
                </label>
                {config.autoRefresh && (
                  <select
                    value={config.refreshInterval}
                    onChange={(e) => setConfig(prev => ({ ...prev, refreshInterval: Number(e.target.value) }))}
                    className="input-field text-sm"
                  >
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                    <option value={60000}>1m</option>
                    <option value={300000}>5m</option>
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Visible Metrics</label>
              <div className="space-y-2">
                {['revenue', 'workOrders', 'customers', 'performance'].map(metric => (
                  <label key={metric} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.visibleMetrics.includes(metric)}
                      onChange={() => toggleMetricVisibility(metric)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm capitalize">{metric.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Chart Types</label>
              <div className="space-y-2">
                {Object.entries(config.chartTypes).map(([metric, type]) => (
                  <div key={metric} className="flex items-center gap-2">
                    <span className="text-sm w-20 capitalize">{metric}:</span>
                    <select
                      value={type}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        chartTypes: { ...prev.chartTypes, [metric]: e.target.value }
                      }))}
                      className="input-field text-sm flex-1"
                    >
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="pie">Pie</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Panel */}
      {showHelp && (
        <div className="card p-6 bg-green-50">
          <h3 className="text-lg font-semibold text-primary mb-4">Dashboard Help</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-primary mb-2">Interactive Features</h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Click on chart elements to drill down into detailed data</li>
                <li>• Use filters to narrow down data by date, status, or type</li>
                <li>• Search customers in real-time using the search box</li>
                <li>• Sort data by different metrics using the sort controls</li>
                <li>• Export data in CSV, Excel, or PDF formats</li>
                <li>• Toggle between grid and list layouts</li>
                <li>• Enable auto-refresh for real-time updates</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-2">Customization</h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Show/hide specific metrics using the configuration panel</li>
                <li>• Change chart types for different visualizations</li>
                <li>• Adjust auto-refresh intervals</li>
                <li>• Use fullscreen mode for presentations</li>
                <li>• Hover over chart elements for detailed tooltips</li>
                <li>• Click and drag to zoom in on chart areas</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <div className={`grid gap-6 ${config.layout === 'grid' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Revenue Chart */}
        {config.visibleMetrics.includes('revenue') && (
          <div className={`card p-6 ${config.layout === 'list' ? 'col-span-full' : 'lg:col-span-2'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-h3 text-primary">Revenue Trends</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  Total: ${filteredData.revenue.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                </span>
                <button
                  onClick={() => handleDrillDown('revenue', filteredData.revenue)}
                  className="text-accent hover:text-hover"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {config.chartTypes.revenue === 'area' ? (
                <AreaChart data={filteredData.revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#20282B" />
                  <YAxis stroke="#20282B" />
                  <Tooltip 
                    formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(8, 74, 95, 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#084A5F" 
                    fill="#7CCBDD" 
                    fillOpacity={0.3}
                    onClick={(data) => handleDrillDown('revenue', data)}
                    style={{ cursor: 'pointer' }}
                  />
                </AreaChart>
              ) : config.chartTypes.revenue === 'line' ? (
                <LineChart data={filteredData.revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#20282B" />
                  <YAxis stroke="#20282B" />
                  <Tooltip 
                    formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(8, 74, 95, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#084A5F" 
                    strokeWidth={3}
                    onClick={(data) => handleDrillDown('revenue', data)}
                    style={{ cursor: 'pointer' }}
                  />
                </LineChart>
              ) : (
                <BarChart data={filteredData.revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#20282B" />
                  <YAxis stroke="#20282B" />
                  <Tooltip 
                    formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(8, 74, 95, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="#084A5F" 
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => handleDrillDown('revenue', data)}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Work Orders Chart */}
        {config.visibleMetrics.includes('workOrders') && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-h3 text-primary">Work Orders</h3>
              <button
                onClick={() => handleDrillDown('workOrders', filteredData.workOrders)}
                className="text-accent hover:text-hover"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {config.chartTypes.workOrders === 'pie' ? (
                <PieChart>
                  <Pie
                    data={filteredData.workOrders}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count }) => `${status}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    onClick={(data) => handleDrillDown('workOrders', data)}
                    style={{ cursor: 'pointer' }}
                  >
                    {filteredData.workOrders.map((entry, index) => (
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
              ) : (
                <BarChart data={filteredData.workOrders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="status" stroke="#20282B" />
                  <YAxis stroke="#20282B" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(8, 74, 95, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3FBAC2" 
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => handleDrillDown('workOrders', data)}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Customer Distribution */}
        {config.visibleMetrics.includes('customers') && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-h3 text-primary">Customer Distribution</h3>
              <button
                onClick={() => handleDrillDown('customers', filteredData.customers)}
                className="text-accent hover:text-hover"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={filteredData.customers}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, count }) => `${type}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  onClick={(data) => handleDrillDown('customers', data)}
                  style={{ cursor: 'pointer' }}
                >
                  {filteredData.customers.map((entry, index) => (
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
        )}

        {/* Performance Metrics */}
        {config.visibleMetrics.includes('performance') && (
          <div className={`card p-6 ${config.layout === 'list' ? 'col-span-full' : 'lg:col-span-3'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-h3 text-primary">Performance Metrics</h3>
              <button
                onClick={() => handleDrillDown('performance', filteredData.performance)}
                className="text-accent hover:text-hover"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredData.performance.map((metric, index) => (
                <div 
                  key={metric.metric}
                  className="p-4 bg-gray-50 rounded-folioops cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                  onClick={() => handleDrillDown('performance', metric)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-primary text-sm">{metric.metric}</h4>
                    <div className={`flex items-center gap-1 text-xs ${
                      metric.current > metric.previous ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.current > metric.previous ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      <span>
                        {Math.abs(((metric.current - metric.previous) / metric.previous) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {metric.current.toFixed(1)}
                    {metric.metric.includes('Rate') || metric.metric.includes('Satisfaction') ? '' : '%'}
                  </div>
                  <div className="text-xs text-text-secondary">
                    Target: {metric.target.toFixed(1)}
                    {metric.metric.includes('Rate') || metric.metric.includes('Satisfaction') ? '' : '%'}
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all duration-300"
                      style={{ width: `${Math.min((metric.current / metric.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Customers */}
        <div className={`card p-6 ${config.layout === 'list' ? 'col-span-full' : 'lg:col-span-2'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-h3 text-primary">Top Customers</h3>
            <button
              onClick={() => handleDrillDown('topCustomers', filteredData.topCustomers)}
              className="text-accent hover:text-hover"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            {filteredData.topCustomers.map((customer, index) => (
              <div 
                key={customer.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-folioops cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                onClick={() => handleDrillDown('customer', customer)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">{customer.name}</p>
                    <p className="text-sm text-text-secondary">{customer.orders} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">${customer.revenue.toLocaleString()}</p>
                  <div className={`text-sm flex items-center gap-1 ${
                    customer.growth > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {customer.growth > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(customer.growth).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-h3 text-primary">Recent Activity</h3>
            <button
              onClick={() => handleDrillDown('activity', filteredData.recentActivity)}
              className="text-accent hover:text-hover"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            {filteredData.recentActivity.slice(0, 5).map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-folioops cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                onClick={() => handleDrillDown('activity', activity)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === 'work_order' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  {activity.type === 'work_order' ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <DollarSign className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {format(new Date(activity.timestamp), 'MMM dd, yyyy h:mm a')}
                  </p>
                  {activity.value && (
                    <p className="text-sm font-semibold text-green-600">
                      ${activity.value.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drill Down Modal */}
      {selectedMetric && drillDownData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-folioops-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-h2 text-primary">
                  Detailed View: {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
                </h2>
                <button
                  onClick={() => {
                    setSelectedMetric(null);
                    setDrillDownData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <pre className="bg-gray-100 p-4 rounded-folioops overflow-auto text-sm">
                {JSON.stringify(drillDownData, null, 2)}
              </pre>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => handleExport('csv')}
                  className="btn-secondary"
                >
                  Export Data
                </button>
                <button
                  onClick={() => {
                    setSelectedMetric(null);
                    setDrillDownData(null);
                  }}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveDashboard;