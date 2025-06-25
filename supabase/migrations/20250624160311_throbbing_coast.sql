/*
  # Fix Profile Setup Permissions and RLS Issues

  1. Security Updates
    - Temporarily disable RLS for profile creation
    - Add proper policies for profile creation
    - Fix function permissions

  2. Debugging
    - Add logging function to track issues
    - Improve error handling
*/

-- First, let's create a logging table to help debug issues
CREATE TABLE IF NOT EXISTS debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  operation text,
  details jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create an improved profile creation function with better error handling
CREATE OR REPLACE FUNCTION create_user_profile_with_debug(
  user_id uuid,
  user_email text,
  first_name text,
  last_name text,
  company_name text,
  company_email text,
  industry text DEFAULT 'HVAC'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_uuid uuid;
  result json;
  current_user_id uuid;
BEGIN
  -- Log the attempt
  INSERT INTO debug_logs (user_id, operation, details)
  VALUES (user_id, 'profile_creation_start', jsonb_build_object(
    'user_email', user_email,
    'first_name', first_name,
    'last_name', last_name,
    'company_name', company_name
  ));

  -- Get current user context
  current_user_id := auth.uid();
  
  -- Log current user context
  INSERT INTO debug_logs (user_id, operation, details)
  VALUES (user_id, 'auth_context', jsonb_build_object(
    'auth_uid', current_user_id,
    'provided_user_id', user_id,
    'match', current_user_id = user_id
  ));

  BEGIN
    -- Create company first
    INSERT INTO companies (name, email, industry, subscription_plan)
    VALUES (company_name, company_email, industry, 'basic')
    RETURNING id INTO company_uuid;
    
    -- Log company creation success
    INSERT INTO debug_logs (user_id, operation, details)
    VALUES (user_id, 'company_created', jsonb_build_object('company_id', company_uuid));
    
    -- Create profile
    INSERT INTO profiles (
      id,
      company_id,
      email,
      first_name,
      last_name,
      role,
      is_active
    ) VALUES (
      user_id,
      company_uuid,
      user_email,
      first_name,
      last_name,
      'admin',
      true
    );
    
    -- Log profile creation success
    INSERT INTO debug_logs (user_id, operation, details)
    VALUES (user_id, 'profile_created', jsonb_build_object('company_id', company_uuid));
    
    -- Return success
    result := json_build_object(
      'success', true,
      'company_id', company_uuid,
      'message', 'Profile created successfully'
    );
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error
    INSERT INTO debug_logs (user_id, operation, error_message, details)
    VALUES (user_id, 'profile_creation_error', SQLERRM, jsonb_build_object(
      'error_code', SQLSTATE,
      'company_name', company_name,
      'user_email', user_email
    ));
    
    -- Return error details
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'details', 'Check debug_logs table for more information'
    );
    
    RETURN result;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile_with_debug TO authenticated;

-- Temporarily allow profile creation by disabling RLS for the setup process
-- We'll create a special policy for profile creation during setup

-- Add a policy that allows users to create their own profile
DO $$
BEGIN
  -- Drop existing policies that might be too restrictive
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
  DROP POLICY IF EXISTS "Admins and managers can manage profiles in their company" ON profiles;
  
  -- Create new policies
  CREATE POLICY "Users can create their own profile"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
    
  CREATE POLICY "Users can update their own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
    
  CREATE POLICY "Users can view profiles in their company"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    );
    
  CREATE POLICY "Admins and managers can manage profiles in their company"
    ON profiles
    FOR ALL
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
      )
    );
END $$;

-- Also ensure companies can be created by authenticated users during setup
DO $$
BEGIN
  -- Drop existing restrictive policies
  DROP POLICY IF EXISTS "Only admins can update company info" ON companies;
  DROP POLICY IF EXISTS "Users can view their own company" ON companies;
  
  -- Create new policies
  CREATE POLICY "Authenticated users can create companies during setup"
    ON companies
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
    
  CREATE POLICY "Users can view their own company"
    ON companies
    FOR SELECT
    TO authenticated
    USING (
      id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    );
    
  CREATE POLICY "Admins can update company info"
    ON companies
    FOR UPDATE
    TO authenticated
    USING (
      id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    )
    WITH CHECK (
      id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    );
END $$;

-- Grant access to debug_logs for authenticated users (for debugging only)
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own debug logs"
  ON debug_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert debug logs"
  ON debug_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);