import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  industry?: string;
  settings?: any;
  subscription_plan?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'tech';
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  companies?: Company;
}

export interface Customer {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  customer_type: 'residential' | 'commercial';
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  company_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  vendor_type?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  company_id: string;
  customer_id: string;
  assigned_to?: string;
  wo_number?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  labor_cost: number;
  material_cost: number;
  total_cost: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  customers?: Customer;
  profiles?: Profile;
}

export interface PurchaseOrder {
  id: string;
  company_id: string;
  vendor_id: string;
  work_order_id?: string;
  po_number: string;
  status: 'draft' | 'sent' | 'approved' | 'received' | 'cancelled';
  order_date: string;
  expected_delivery?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  vendors?: Vendor;
  work_orders?: WorkOrder;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  work_order_id?: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customers?: Customer;
  work_orders?: WorkOrder;
}

export interface Estimate {
  id: string;
  company_id: string;
  customer_id: string;
  estimate_number: string;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  issue_date: string;
  expiry_date?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  customers?: Customer;
}

// CRM Types
export interface Lead {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  source: 'website' | 'referral' | 'cold_call' | 'social_media' | 'advertisement' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  priority: 'low' | 'medium' | 'high';
  assigned_to?: string;
  estimated_value?: number;
  notes?: string;
  last_contact_date?: string;
  next_follow_up?: string;
  created_at: string;
  updated_at: string;
  assigned_profile?: Profile;
}

export interface Opportunity {
  id: string;
  company_id: string;
  lead_id?: string;
  customer_id?: string;
  title: string;
  description?: string;
  value: number;
  probability: number;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  source: 'website' | 'referral' | 'cold_call' | 'social_media' | 'advertisement' | 'other';
  assigned_to?: string;
  expected_close_date?: string;
  actual_close_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  leads?: Lead;
  customers?: Customer;
  assigned_profile?: Profile;
}

export interface Communication {
  id: string;
  company_id: string;
  lead_id?: string;
  customer_id?: string;
  opportunity_id?: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'sms';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  duration?: number;
  outcome?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  leads?: Lead;
  customers?: Customer;
  opportunities?: Opportunity;
  created_profile?: Profile;
}