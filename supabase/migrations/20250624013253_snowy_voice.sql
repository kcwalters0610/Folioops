/*
  # Field Service Management Schema

  1. New Tables
    - `companies` - Multi-tenant company data
    - `profiles` - User profiles linked to companies
    - `customers` - Customer database per company
    - `vendors` - Vendor database per company
    - `work_orders` - Work order management
    - `purchase_orders` - Purchase order management
    - `work_order_photos` - Photo attachments for work orders
    - `invoices` - Invoice generation and tracking
    - `estimates` - Estimate creation and management

  2. Security
    - Enable RLS on all tables
    - Add policies for company-based data isolation
    - Role-based access control policies

  3. Features
    - Multi-tenant architecture
    - Role-based permissions (admin, manager, tech)
    - Photo upload support
    - Status tracking workflows
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (tenants)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  industry text DEFAULT 'HVAC',
  settings jsonb DEFAULT '{}',
  subscription_plan text DEFAULT 'basic',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User profiles linked to companies
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'tech')),
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  notes text,
  customer_type text DEFAULT 'residential' CHECK (customer_type IN ('residential', 'commercial')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  vendor_type text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Work orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date timestamptz,
  completed_date timestamptz,
  estimated_hours decimal,
  actual_hours decimal,
  labor_cost decimal DEFAULT 0,
  material_cost decimal DEFAULT 0,
  total_cost decimal DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  work_order_id uuid REFERENCES work_orders(id),
  po_number text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'received', 'cancelled')),
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery date,
  subtotal decimal DEFAULT 0,
  tax_amount decimal DEFAULT 0,
  total_amount decimal DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Work order photos table
CREATE TABLE IF NOT EXISTS work_order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  caption text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  work_order_id uuid REFERENCES work_orders(id),
  invoice_number text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  subtotal decimal DEFAULT 0,
  tax_rate decimal DEFAULT 0,
  tax_amount decimal DEFAULT 0,
  total_amount decimal DEFAULT 0,
  paid_amount decimal DEFAULT 0,
  payment_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  estimate_number text NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
  issue_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  subtotal decimal DEFAULT 0,
  tax_rate decimal DEFAULT 0,
  tax_amount decimal DEFAULT 0,
  total_amount decimal DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Only admins can update company info"
  ON companies FOR UPDATE
  TO authenticated
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Profiles policies
CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins and managers can manage profiles in their company"
  ON profiles FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Customers policies
CREATE POLICY "Users can view customers in their company"
  ON customers FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage customers in their company"
  ON customers FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Vendors policies
CREATE POLICY "Users can view vendors in their company"
  ON vendors FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins and managers can manage vendors"
  ON vendors FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Work orders policies
CREATE POLICY "Users can view work orders in their company"
  ON work_orders FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage work orders in their company"
  ON work_orders FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Purchase orders policies
CREATE POLICY "Users can view purchase orders in their company"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins and managers can manage purchase orders"
  ON purchase_orders FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Work order photos policies
CREATE POLICY "Users can view photos in their company"
  ON work_order_photos FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can upload photos in their company"
  ON work_order_photos FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Invoices policies
CREATE POLICY "Users can view invoices in their company"
  ON invoices FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins and managers can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Estimates policies
CREATE POLICY "Users can view estimates in their company"
  ON estimates FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage estimates in their company"
  ON estimates FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_company_id_idx ON profiles(company_id);
CREATE INDEX IF NOT EXISTS customers_company_id_idx ON customers(company_id);
CREATE INDEX IF NOT EXISTS vendors_company_id_idx ON vendors(company_id);
CREATE INDEX IF NOT EXISTS work_orders_company_id_idx ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS work_orders_customer_id_idx ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS work_orders_assigned_to_idx ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS purchase_orders_company_id_idx ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS work_order_photos_work_order_id_idx ON work_order_photos(work_order_id);
CREATE INDEX IF NOT EXISTS invoices_company_id_idx ON invoices(company_id);
CREATE INDEX IF NOT EXISTS estimates_company_id_idx ON estimates(company_id);