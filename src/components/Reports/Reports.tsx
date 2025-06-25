import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, Users, FileText, BarChart3, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportData {
  totalRevenue: number;
  totalWorkOrders: number;
  totalCustomers: number;
  totalInvoices: number;
  monthlyRevenue: Array<{ month: string; revenue: number; workOrders: number }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  customerTypes: Array<{ name: string; value: number }>;
  topCustomers: Array<{ name: string; revenue: number; orders: number }>;
}

const Reports: React.FC = () => {
  const { profile } = useAuth();
  const [reportData, setReportData] = useState<ReportData>({
    totalRevenue: 0,
    totalWorkOrders: 0,
    totalCustomers: 0,
    totalInvoices: 0,
    monthlyRevenue: [],
    statusBreakdown: [],
    customerTypes: [],
    topCustomers: [],
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 11), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (profile?.company_id) {
      fetchReportData();
    }
  }, [profile, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        workOrdersRes,
        invoicesRes,
        customersRes,
        estimatesRes
      ] = await Promise.all([
        supabase
          .from('work_orders')
          .select(`
            *,
            customers (id, first_name, last_name, customer_type)
          `)
          .eq('company_id', profile?.company_id)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end + 'T23:59:59'),

        supabase
          .from('invoices')
          .select(`
            *,
            customers (id, first_name, last_name)
          `)
          .eq('company_id', profile?.company_id)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end + 'T23:59:59'),

        supabase
          .from('customers')
          .select('*')
          .eq('company_id', profile?.company_id),

        supabase
          .from('estimates')
          .select('*')
          .eq('company_id', profile?.company_id)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end + 'T23:59:59')
      ]);

      if (workOrdersRes.error) throw workOrdersRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (customersRes.error) throw customersRes.error;
      if (estimatesRes.error) throw estimatesRes.error;

      const workOrders = workOrdersRes.data || [];
      const invoices = invoicesRes.data || [];
      const customers = customersRes.data || [];
      const estimates = estimatesRes.data || [];

      // Calculate totals
      const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total_amount, 0);

      // Generate monthly data
      const monthlyData = [];
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const monthWorkOrders = workOrders.filter(wo => {
          const woDate = new Date(wo.created_at);
          return woDate >= monthStart && woDate <= monthEnd;
        });

        const monthInvoices = invoices.filter(inv => {
          const invDate = new Date(inv.created_at);
          return invDate >= monthStart && invDate <= monthEnd && inv.status === 'paid';
        });

        monthlyData.push({
          month: format(date, 'MMM yyyy'),
          revenue: monthInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
          workOrders: monthWorkOrders.length,
        });
      }

      // Work order status breakdown
      const statusCounts = workOrders.reduce((acc, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
      }));

      // Customer type breakdown
      const customerTypeCounts = customers.reduce((acc, customer) => {
        acc[customer.customer_type] = (acc[customer.customer_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const customerTypes = Object.entries(customerTypeCounts).map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
      }));

      // Top customers by revenue
      const customerRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((acc, inv) => {
          const customerId = inv.customer_id;
          if (!acc[customerId]) {
            acc[customerId] = {
              revenue: 0,
              orders: 0,
              customer: inv.customers,
            };
          }
          acc[customerId].revenue += inv.total_amount;
          acc[customerId].orders += 1;
          return acc;
        }, {} as Record<string, any>);

      const topCustomers = Object.values(customerRevenue)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((item: any) => ({
          name: `${item.customer?.first_name} ${item.customer?.last_name}`,
          revenue: item.revenue,
          orders: item.orders,
        }));

      setReportData({
        totalRevenue,
        totalWorkOrders: workOrders.length,
        totalCustomers: customers.length,
        totalInvoices: invoices.length,
        monthlyRevenue: monthlyData,
        statusBreakdown,
        customerTypes,
        topCustomers,
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Set up colors
      const primaryColor = [8, 74, 95]; // #084A5F
      const accentColor = [124, 203, 221]; // #7CCBDD
      const textColor = [32, 40, 43]; // #20282B
      
      // Add header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Folioops Business Report', 20, 20);
      
      // Add company info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`, 20, 40);
      doc.text(`Date Range: ${format(new Date(dateRange.start), 'MMM dd, yyyy')} - ${format(new Date(dateRange.end), 'MMM dd, yyyy')}`, 20, 50);
      
      // Reset text color for content
      doc.setTextColor(...textColor);
      
      let yPosition = 70;
      
      // Summary Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Executive Summary', 20, yPosition);
      yPosition += 15;
      
      // Summary table
      const summaryData = [
        ['Total Revenue', `$${reportData.totalRevenue.toLocaleString()}`],
        ['Total Work Orders', reportData.totalWorkOrders.toString()],
        ['Total Customers', reportData.totalCustomers.toString()],
        ['Total Invoices', reportData.totalInvoices.toString()],
      ];
      
      doc.autoTable({
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 11,
          cellPadding: 5
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right' }
        }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
      
      // Monthly Revenue Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Monthly Revenue & Work Orders', 20, yPosition);
      yPosition += 10;
      
      const monthlyData = reportData.monthlyRevenue.map(month => [
        month.month,
        `$${month.revenue.toLocaleString()}`,
        month.workOrders.toString()
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Month', 'Revenue', 'Work Orders']],
        body: monthlyData,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 10,
          cellPadding: 4
        },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'center' }
        }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Work Order Status Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Work Order Status Breakdown', 20, yPosition);
      yPosition += 10;
      
      const statusData = reportData.statusBreakdown.map(status => [
        status.name,
        status.value.toString(),
        `${((status.value / reportData.totalWorkOrders) * 100).toFixed(1)}%`
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Status', 'Count', 'Percentage']],
        body: statusData,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 11,
          cellPadding: 5
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' }
        }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
      
      // Customer Types Section
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Customer Type Distribution', 20, yPosition);
      yPosition += 10;
      
      const customerTypeData = reportData.customerTypes.map(type => [
        type.name,
        type.value.toString(),
        `${((type.value / reportData.totalCustomers) * 100).toFixed(1)}%`
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Customer Type', 'Count', 'Percentage']],
        body: customerTypeData,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 11,
          cellPadding: 5
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' }
        }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
      
      // Top Customers Section
      if (reportData.topCustomers.length > 0) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('Top Customers by Revenue', 20, yPosition);
        yPosition += 10;
        
        const topCustomersData = reportData.topCustomers.map((customer, index) => [
          (index + 1).toString(),
          customer.name,
          `$${customer.revenue.toLocaleString()}`,
          customer.orders.toString()
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Rank', 'Customer Name', 'Revenue', 'Orders']],
          body: topCustomersData,
          theme: 'grid',
          headStyles: { 
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 11,
            cellPadding: 5
          },
          columnStyles: {
            0: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'center' }
          }
        });
      }
      
      // Add footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${pageCount}`, 20, 285);
        doc.text('Generated by Folioops Field Service Management', 105, 285, { align: 'center' });
        doc.text(format(new Date(), 'MMM dd, yyyy'), 190, 285, { align: 'right' });
      }
      
      // Save the PDF
      const fileName = `folioops-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      // Show success message
      alert('PDF report exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF report:', error);
      alert('Failed to export PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const COLORS = ['#084A5F', '#3FBAC2', '#7CCBDD', '#A3D7E6', '#5BB8CE'];

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
          <h1 className="text-h1 text-primary">Reports & Analytics</h1>
          <p className="text-text-secondary mt-1">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-primary">From:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="input-field text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-primary">To:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="input-field text-sm"
            />
          </div>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{exporting ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-primary">${reportData.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">+12% from last period</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-folioops flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Work Orders</p>
              <p className="text-3xl font-bold text-primary">{reportData.totalWorkOrders}</p>
              <p className="text-xs text-green-600 mt-1">+8% from last period</p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-folioops flex items-center justify-center">
              <FileText className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-primary">{reportData.totalCustomers}</p>
              <p className="text-xs text-green-600 mt-1">+15% from last period</p>
            </div>
            <div className="w-12 h-12 bg-hover/10 rounded-folioops flex items-center justify-center">
              <Users className="h-6 w-6 text-hover" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Total Invoices</p>
              <p className="text-3xl font-bold text-primary">{reportData.totalInvoices}</p>
              <p className="text-xs text-green-600 mt-1">+10% from last period</p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-folioops flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue Trend */}
        <div className="card p-6">
          <h3 className="text-h3 text-primary mb-6">Monthly Revenue & Work Orders</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#20282B" />
              <YAxis yAxisId="left" stroke="#20282B" />
              <YAxis yAxisId="right" orientation="right" stroke="#20282B" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? `$${value.toLocaleString()}` : value,
                  name === 'revenue' ? 'Revenue' : 'Work Orders'
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(8, 74, 95, 0.1)'
                }}
              />
              <Bar yAxisId="left" dataKey="revenue" fill="#084A5F" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="workOrders" stroke="#3FBAC2" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Work Order Status Breakdown */}
        <div className="card p-6">
          <h3 className="text-h3 text-primary mb-6">Work Order Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.statusBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.statusBreakdown.map((entry, index) => (
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

        {/* Customer Types */}
        <div className="card p-6">
          <h3 className="text-h3 text-primary mb-6">Customer Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.customerTypes}>
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
              <Bar dataKey="value" fill="#7CCBDD" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Customers */}
        <div className="card p-6">
          <h3 className="text-h3 text-primary mb-6">Top Customers by Revenue</h3>
          <div className="space-y-4">
            {reportData.topCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-folioops">
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
                </div>
              </div>
            ))}
            {reportData.topCustomers.length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                No customer data available for the selected period
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;