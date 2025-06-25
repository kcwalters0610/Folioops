/*
  # Fix Role Constraint Issue

  1. Database Updates
    - Update the profile creation function to properly handle role assignment
    - Ensure role defaults are properly set
    - Add better error handling for role validation

  2. Security
    - Maintain existing RLS policies
    - Ensure proper role assignment during setup
*/

-- Update the profile creation function to properly handle role assignment
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
  user_role text := 'admin'; -- Default role for new company creators
BEGIN
  -- Log the attempt
  INSERT INTO debug_logs (user_id, operation, details)
  VALUES (user_id, 'profile_creation_start', jsonb_build_object(
    'user_email', user_email,
    'first_name', first_name,
    'last_name', last_name,
    'company_name', company_name,
    'assigned_role', user_role
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

  -- Validate that we have a valid role
  IF user_role NOT IN ('admin', 'manager', 'tech') THEN
    user_role := 'admin'; -- Fallback to admin
  END IF;

  BEGIN
    -- Create company first
    INSERT INTO companies (name, email, industry, subscription_plan)
    VALUES (company_name, company_email, industry, 'basic')
    RETURNING id INTO company_uuid;
    
    -- Log company creation success
    INSERT INTO debug_logs (user_id, operation, details)
    VALUES (user_id, 'company_created', jsonb_build_object('company_id', company_uuid));
    
    -- Create profile with explicit role assignment
    INSERT INTO profiles (
      id,
      company_id,
      email,
      first_name,
      last_name,
      role,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      company_uuid,
      user_email,
      first_name,
      last_name,
      user_role, -- Explicitly set the role
      true,
      now(),
      now()
    );
    
    -- Log profile creation success
    INSERT INTO debug_logs (user_id, operation, details)
    VALUES (user_id, 'profile_created', jsonb_build_object(
      'company_id', company_uuid,
      'role_assigned', user_role
    ));
    
    -- Return success
    result := json_build_object(
      'success', true,
      'company_id', company_uuid,
      'role', user_role,
      'message', 'Profile created successfully'
    );
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error with more details
    INSERT INTO debug_logs (user_id, operation, error_message, details)
    VALUES (user_id, 'profile_creation_error', SQLERRM, jsonb_build_object(
      'error_code', SQLSTATE,
      'company_name', company_name,
      'user_email', user_email,
      'attempted_role', user_role,
      'constraint_detail', CASE 
        WHEN SQLSTATE = '23514' THEN 'Check constraint violation - invalid role value'
        WHEN SQLSTATE = '23502' THEN 'Not null constraint violation'
        ELSE 'Other database error'
      END
    ));
    
    -- Return error details
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'details', 'Check debug_logs table for more information',
      'attempted_role', user_role
    );
    
    RETURN result;
  END;
END;
$$;

-- Also ensure the profiles table has proper defaults
DO $$
BEGIN
  -- Check if we need to update the role column default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role' 
    AND column_default IS NOT NULL
  ) THEN
    -- Add a default value for role (though it should still be explicitly set)
    ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'tech';
  END IF;
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile_with_debug TO authenticated;