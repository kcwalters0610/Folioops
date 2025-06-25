/*
  # Add Estimate to Project Conversion

  1. Database Changes
    - Add estimate_id foreign key to projects table
    - Create function to convert approved estimates to projects
    - Add trigger to auto-update estimate status when converted

  2. Business Logic
    - Only approved estimates can be converted to projects
    - Conversion copies relevant data from estimate to project
    - Original estimate is marked as converted
    - Project inherits customer, budget, and description from estimate

  3. Security
    - Maintain existing RLS policies
    - Only admins and managers can convert estimates to projects
*/

-- Add estimate_id to projects table to track conversion source
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimate_id uuid REFERENCES estimates(id);

-- Add index for estimate_id lookups
CREATE INDEX IF NOT EXISTS projects_estimate_id_idx ON projects(estimate_id);

-- Add converted status to estimates
DO $$
BEGIN
  -- Check if 'converted' is already in the status constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'estimates_status_check' 
    AND check_clause LIKE '%converted%'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_status_check;
    
    -- Add the new constraint with 'converted' status
    ALTER TABLE estimates ADD CONSTRAINT estimates_status_check 
      CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted'));
  END IF;
END $$;

-- Function to convert an approved estimate to a project
CREATE OR REPLACE FUNCTION convert_estimate_to_project(
  estimate_uuid uuid,
  project_name_override text DEFAULT NULL,
  project_manager_id uuid DEFAULT NULL,
  start_date_override date DEFAULT NULL,
  estimated_end_date_override date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  estimate_record estimates%ROWTYPE;
  new_project_id uuid;
  current_user_company uuid;
  current_user_role text;
  result json;
BEGIN
  -- Check if current user is admin or manager
  SELECT company_id, role INTO current_user_company, current_user_role
  FROM profiles
  WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('admin', 'manager') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only admins and managers can convert estimates to projects'
    );
  END IF;
  
  -- Get the estimate record
  SELECT * INTO estimate_record
  FROM estimates
  WHERE id = estimate_uuid
    AND company_id = current_user_company;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Estimate not found or access denied'
    );
  END IF;
  
  -- Check if estimate is approved
  IF estimate_record.status != 'approved' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only approved estimates can be converted to projects'
    );
  END IF;
  
  -- Check if estimate is already converted
  IF EXISTS (SELECT 1 FROM projects WHERE estimate_id = estimate_uuid) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This estimate has already been converted to a project'
    );
  END IF;
  
  -- Create the project
  INSERT INTO projects (
    company_id,
    customer_id,
    estimate_id,
    project_name,
    description,
    project_manager,
    start_date,
    estimated_end_date,
    total_budget,
    status,
    priority,
    notes
  ) VALUES (
    estimate_record.company_id,
    estimate_record.customer_id,
    estimate_uuid,
    COALESCE(project_name_override, estimate_record.title),
    estimate_record.description,
    project_manager_id,
    start_date_override,
    estimated_end_date_override,
    estimate_record.total_amount,
    'planning',
    'medium',
    'Project created from estimate #' || estimate_record.estimate_number
  )
  RETURNING id INTO new_project_id;
  
  -- Update estimate status to converted
  UPDATE estimates
  SET status = 'converted',
      updated_at = now()
  WHERE id = estimate_uuid;
  
  RETURN json_build_object(
    'success', true,
    'project_id', new_project_id,
    'estimate_id', estimate_uuid,
    'message', 'Estimate successfully converted to project'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Function to check if an estimate can be converted
CREATE OR REPLACE FUNCTION can_convert_estimate_to_project(estimate_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  estimate_status text;
  already_converted boolean;
BEGIN
  -- Get estimate status
  SELECT status INTO estimate_status
  FROM estimates
  WHERE id = estimate_uuid
    AND company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    );
  
  -- Check if already converted
  SELECT EXISTS(
    SELECT 1 FROM projects WHERE estimate_id = estimate_uuid
  ) INTO already_converted;
  
  -- Can convert if approved and not already converted
  RETURN estimate_status = 'approved' AND NOT already_converted;
END;
$$;

-- Update the project_summary view to include estimate information
DROP VIEW IF EXISTS project_summary;
CREATE OR REPLACE VIEW project_summary AS
SELECT 
  p.*,
  c.first_name || ' ' || c.last_name AS customer_name,
  c.customer_type,
  pm.first_name || ' ' || pm.last_name AS project_manager_name,
  pm.email AS project_manager_email,
  e.estimate_number AS source_estimate_number,
  e.title AS source_estimate_title,
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
LEFT JOIN profiles pm ON p.project_manager = pm.id
LEFT JOIN estimates e ON p.estimate_id = e.id;

-- Grant permissions
GRANT EXECUTE ON FUNCTION convert_estimate_to_project TO authenticated;
GRANT EXECUTE ON FUNCTION can_convert_estimate_to_project TO authenticated;
GRANT SELECT ON project_summary TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN projects.estimate_id IS 'Reference to the estimate that was converted to create this project';
COMMENT ON FUNCTION convert_estimate_to_project IS 'Converts an approved estimate into a project with inherited data';
COMMENT ON FUNCTION can_convert_estimate_to_project IS 'Checks if an estimate is eligible for conversion to a project';