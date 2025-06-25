/*
  # Create Projects Table

  1. New Table
    - `projects`
      - `id` (uuid, primary key)
      - `project_number` (text, unique, auto-generated)
      - `project_name` (text, required, max 100 chars)
      - `description` (text, optional)
      - `company_id` (uuid, foreign key to companies)
      - `customer_id` (uuid, foreign key to customers)
      - `project_manager` (uuid, foreign key to profiles)
      - `start_date` (date, optional)
      - `estimated_end_date` (date, optional)
      - `actual_end_date` (date, nullable)
      - `total_budget` (decimal(12,2), default 0)
      - `actual_cost` (decimal(12,2), default 0)
      - `status` (text, enum with constraints)
      - `priority` (text, enum with constraints)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `notes` (text, optional)

  2. Relationships
    - Link work orders to projects
    - Add project_id foreign key to work_orders table

  3. Security
    - Enable RLS on projects table
    - Add policies for company-based access control
    - Role-based permissions (admin/manager can manage, techs can view)

  4. Indexes
    - Performance indexes for common queries
    - Unique constraints for data integrity
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number text NOT NULL,
  project_name text NOT NULL CHECK (length(project_name) <= 100),
  description text,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  project_manager uuid REFERENCES profiles(id),
  start_date date,
  estimated_end_date date,
  actual_end_date date,
  total_budget decimal(12,2) DEFAULT 0 CHECK (total_budget >= 0),
  actual_cost decimal(12,2) DEFAULT 0 CHECK (actual_cost >= 0),
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text
);

-- Add project_id to work_orders table to link work orders to projects
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id);

-- Create unique constraint for project_number
ALTER TABLE projects ADD CONSTRAINT projects_project_number_unique UNIQUE (project_number);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS projects_company_id_idx ON projects(company_id);
CREATE INDEX IF NOT EXISTS projects_customer_id_idx ON projects(customer_id);
CREATE INDEX IF NOT EXISTS projects_project_manager_idx ON projects(project_manager);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS projects_priority_idx ON projects(priority);
CREATE INDEX IF NOT EXISTS projects_start_date_idx ON projects(start_date);
CREATE INDEX IF NOT EXISTS projects_estimated_end_date_idx ON projects(estimated_end_date);
CREATE INDEX IF NOT EXISTS projects_actual_end_date_idx ON projects(actual_end_date);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at);
CREATE INDEX IF NOT EXISTS projects_project_number_idx ON projects(project_number);

-- Add index for work_orders project_id foreign key
CREATE INDEX IF NOT EXISTS work_orders_project_id_idx ON work_orders(project_id);

-- Add constraint to ensure estimated_end_date is after start_date
ALTER TABLE projects ADD CONSTRAINT projects_date_logic_check 
  CHECK (estimated_end_date IS NULL OR start_date IS NULL OR estimated_end_date >= start_date);

-- Add constraint to ensure actual_end_date is after start_date
ALTER TABLE projects ADD CONSTRAINT projects_actual_date_logic_check 
  CHECK (actual_end_date IS NULL OR start_date IS NULL OR actual_end_date >= start_date);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
CREATE POLICY "Users can view projects in their company"
  ON projects
  FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Admins and managers can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  ));

-- Create a function to auto-generate project numbers
CREATE OR REPLACE FUNCTION generate_project_number(company_uuid uuid)
RETURNS text AS $$
DECLARE
  current_year integer;
  next_number integer;
  project_number text;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get the next sequential number for this year and company
  SELECT COALESCE(MAX(
    CASE 
      WHEN project_number ~ ('^PROJ-' || current_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(project_number FROM '[0-9]+$') AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM projects
  WHERE company_id = company_uuid;
  
  project_number := 'PROJ-' || current_year || '-' || LPAD(next_number::text, 4, '0');
  
  RETURN project_number;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-generate project numbers
CREATE OR REPLACE FUNCTION set_project_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number := generate_project_number(NEW.company_id);
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_project_number ON projects;
CREATE TRIGGER trigger_set_project_number
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_project_number();

-- Create a function to calculate project progress
CREATE OR REPLACE FUNCTION calculate_project_progress(project_uuid uuid)
RETURNS decimal AS $$
DECLARE
  total_work_orders integer;
  completed_work_orders integer;
  progress decimal;
BEGIN
  -- Count total work orders for this project
  SELECT COUNT(*) INTO total_work_orders
  FROM work_orders
  WHERE project_id = project_uuid;
  
  -- Count completed work orders
  SELECT COUNT(*) INTO completed_work_orders
  FROM work_orders
  WHERE project_id = project_uuid AND status = 'completed';
  
  -- Calculate progress percentage
  IF total_work_orders = 0 THEN
    progress := 0;
  ELSE
    progress := (completed_work_orders::decimal / total_work_orders::decimal) * 100;
  END IF;
  
  RETURN ROUND(progress, 2);
END;
$$ LANGUAGE plpgsql;

-- Create a view for project summary with calculated fields
CREATE OR REPLACE VIEW project_summary AS
SELECT 
  p.*,
  c.first_name || ' ' || c.last_name AS customer_name,
  c.customer_type,
  pm.first_name || ' ' || pm.last_name AS project_manager_name,
  pm.email AS project_manager_email,
  calculate_project_progress(p.id) AS progress_percentage,
  (
    SELECT COUNT(*)
    FROM work_orders wo
    WHERE wo.project_id = p.id
  ) AS total_work_orders,
  (
    SELECT COUNT(*)
    FROM work_orders wo
    WHERE wo.project_id = p.id AND wo.status = 'completed'
  ) AS completed_work_orders,
  (
    SELECT COUNT(*)
    FROM work_orders wo
    WHERE wo.project_id = p.id AND wo.status IN ('scheduled', 'in_progress')
  ) AS active_work_orders,
  (
    SELECT COALESCE(SUM(wo.total_cost), 0)
    FROM work_orders wo
    WHERE wo.project_id = p.id
  ) AS total_work_order_cost,
  CASE 
    WHEN p.total_budget > 0 THEN 
      ROUND(((p.actual_cost / p.total_budget) * 100), 2)
    ELSE 0
  END AS budget_utilization_percentage,
  CASE
    WHEN p.actual_end_date IS NOT NULL THEN 'completed'
    WHEN p.estimated_end_date < CURRENT_DATE AND p.status != 'completed' THEN 'overdue'
    WHEN p.estimated_end_date <= CURRENT_DATE + INTERVAL '7 days' AND p.status != 'completed' THEN 'due_soon'
    ELSE 'on_track'
  END AS schedule_status
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN profiles pm ON p.project_manager = pm.id;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_project_number TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_project_progress TO authenticated;
GRANT SELECT ON project_summary TO authenticated;

-- Add some sample data constraints and business rules
COMMENT ON TABLE projects IS 'Large-scale projects that can contain multiple work orders';
COMMENT ON COLUMN projects.project_number IS 'Auto-generated unique project identifier (e.g., PROJ-2024-0001)';
COMMENT ON COLUMN projects.project_name IS 'Human-readable project name (max 100 characters)';
COMMENT ON COLUMN projects.total_budget IS 'Total approved budget for the project';
COMMENT ON COLUMN projects.actual_cost IS 'Actual costs incurred so far';
COMMENT ON COLUMN projects.status IS 'Current project status: planning, in_progress, on_hold, completed, cancelled';
COMMENT ON COLUMN projects.priority IS 'Project priority level: low, medium, high, urgent';
COMMENT ON VIEW project_summary IS 'Comprehensive project view with calculated metrics and related data';