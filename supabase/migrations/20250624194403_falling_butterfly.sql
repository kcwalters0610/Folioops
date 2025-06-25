/*
  # Create CRM Tables

  1. New Tables
    - `leads`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `first_name` (text, required)
      - `last_name` (text, required)
      - `email` (text, optional)
      - `phone` (text, optional)
      - `company` (text, optional)
      - `address` (text, optional)
      - `city` (text, optional)
      - `state` (text, optional)
      - `zip_code` (text, optional)
      - `source` (text, enum: website, referral, cold_call, social_media, advertisement, other)
      - `status` (text, enum: new, contacted, qualified, unqualified, converted)
      - `priority` (text, enum: low, medium, high)
      - `assigned_to` (uuid, foreign key to profiles)
      - `estimated_value` (numeric, optional)
      - `notes` (text, optional)
      - `last_contact_date` (timestamptz, optional)
      - `next_follow_up` (timestamptz, optional)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `opportunities`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `lead_id` (uuid, foreign key to leads, optional)
      - `customer_id` (uuid, foreign key to customers, optional)
      - `title` (text, required)
      - `description` (text, optional)
      - `value` (numeric, required)
      - `probability` (integer, default 50)
      - `stage` (text, enum: prospecting, qualification, proposal, negotiation, closed_won, closed_lost)
      - `source` (text, enum: website, referral, cold_call, social_media, advertisement, other)
      - `assigned_to` (uuid, foreign key to profiles)
      - `expected_close_date` (date, optional)
      - `actual_close_date` (date, optional)
      - `notes` (text, optional)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `communications`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `lead_id` (uuid, foreign key to leads, optional)
      - `customer_id` (uuid, foreign key to customers, optional)
      - `opportunity_id` (uuid, foreign key to opportunities, optional)
      - `type` (text, enum: call, email, meeting, note, sms)
      - `direction` (text, enum: inbound, outbound)
      - `subject` (text, optional)
      - `content` (text, required)
      - `duration` (integer, optional - in minutes)
      - `outcome` (text, optional)
      - `follow_up_required` (boolean, default false)
      - `follow_up_date` (date, optional)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for company-based access control
    - Users can only access CRM data for their company
    - Admins and managers can manage all CRM data
    - Techs can view but not modify CRM data
*/

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  company text,
  address text,
  city text,
  state text,
  zip_code text,
  source text NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'referral', 'cold_call', 'social_media', 'advertisement', 'other')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to uuid REFERENCES profiles(id),
  estimated_value numeric,
  notes text,
  last_contact_date timestamptz,
  next_follow_up timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id),
  customer_id uuid REFERENCES customers(id),
  title text NOT NULL,
  description text,
  value numeric NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  stage text NOT NULL DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  source text NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'referral', 'cold_call', 'social_media', 'advertisement', 'other')),
  assigned_to uuid REFERENCES profiles(id),
  expected_close_date date,
  actual_close_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create communications table
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id),
  customer_id uuid REFERENCES customers(id),
  opportunity_id uuid REFERENCES opportunities(id),
  type text NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'sms')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  content text NOT NULL,
  duration integer, -- in minutes
  outcome text,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS leads_company_id_idx ON leads(company_id);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads(source);
CREATE INDEX IF NOT EXISTS leads_next_follow_up_idx ON leads(next_follow_up);

CREATE INDEX IF NOT EXISTS opportunities_company_id_idx ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS opportunities_lead_id_idx ON opportunities(lead_id);
CREATE INDEX IF NOT EXISTS opportunities_customer_id_idx ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS opportunities_assigned_to_idx ON opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS opportunities_stage_idx ON opportunities(stage);
CREATE INDEX IF NOT EXISTS opportunities_expected_close_date_idx ON opportunities(expected_close_date);

CREATE INDEX IF NOT EXISTS communications_company_id_idx ON communications(company_id);
CREATE INDEX IF NOT EXISTS communications_lead_id_idx ON communications(lead_id);
CREATE INDEX IF NOT EXISTS communications_customer_id_idx ON communications(customer_id);
CREATE INDEX IF NOT EXISTS communications_opportunity_id_idx ON communications(opportunity_id);
CREATE INDEX IF NOT EXISTS communications_created_by_idx ON communications(created_by);
CREATE INDEX IF NOT EXISTS communications_type_idx ON communications(type);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leads
CREATE POLICY "Users can view leads in their company"
  ON leads
  FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Admins and managers can manage leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  ));

-- Create RLS policies for opportunities
CREATE POLICY "Users can view opportunities in their company"
  ON opportunities
  FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Admins and managers can manage opportunities"
  ON opportunities
  FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  ));

-- Create RLS policies for communications
CREATE POLICY "Users can view communications in their company"
  ON communications
  FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Users can create communications in their company"
  ON communications
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Users can update their own communications"
  ON communications
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins and managers can manage all communications"
  ON communications
  FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  ));

-- Add constraint to ensure either lead_id or customer_id is set for opportunities
ALTER TABLE opportunities ADD CONSTRAINT opportunities_lead_or_customer_check 
  CHECK ((lead_id IS NOT NULL AND customer_id IS NULL) OR (lead_id IS NULL AND customer_id IS NOT NULL) OR (lead_id IS NULL AND customer_id IS NULL));

-- Add constraint to ensure at least one entity is linked for communications
ALTER TABLE communications ADD CONSTRAINT communications_entity_check 
  CHECK (lead_id IS NOT NULL OR customer_id IS NOT NULL OR opportunity_id IS NOT NULL);