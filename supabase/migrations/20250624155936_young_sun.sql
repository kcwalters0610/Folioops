/*
  # Fix Profile Setup Issues

  1. Database Structure
    - Create missing auth.users reference handling
    - Ensure proper foreign key relationships
    - Add better error handling

  2. Security
    - Maintain RLS policies
    - Ensure proper user permissions
*/

-- First, let's make sure we can handle the auth.users reference properly
-- The profiles table should reference auth.users, not a separate users table

-- Drop the existing foreign key constraint that might be causing issues
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a function to help with profile creation that includes better error handling
CREATE OR REPLACE FUNCTION create_user_profile_safe(
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
BEGIN
  -- Start transaction
  BEGIN
    -- Create company first
    INSERT INTO companies (name, email, industry, subscription_plan)
    VALUES (company_name, company_email, industry, 'basic')
    RETURNING id INTO company_uuid;
    
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
    
    -- Return success
    result := json_build_object(
      'success', true,
      'company_id', company_uuid,
      'message', 'Profile created successfully'
    );
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Return error details
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    
    RETURN result;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile_safe TO authenticated;