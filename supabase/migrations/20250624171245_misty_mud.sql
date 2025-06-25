/*
  # Fix RLS Policies for Profiles Table

  1. Problem
    - Infinite recursion in profiles table policies
    - Policies were querying profiles table within their own conditions

  2. Solution
    - Drop problematic policies
    - Create simplified policies that avoid recursion
    - Use direct auth.uid() checks where possible
    - Create safe helper functions in public schema
*/

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Company admins can read company profiles" ON profiles;
DROP POLICY IF EXISTS "Company admins can insert company profiles" ON profiles;
DROP POLICY IF EXISTS "Company admins can update company profiles" ON profiles;
DROP POLICY IF EXISTS "Company admins can delete company profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Admins and managers can manage profiles in their company" ON profiles;

-- Create a safe function to get user's company_id and role without recursion
-- This function uses SECURITY DEFINER to bypass RLS when checking user info
CREATE OR REPLACE FUNCTION get_user_company_info()
RETURNS TABLE(company_id uuid, user_role text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT p.company_id, p.role
  FROM profiles p
  WHERE p.id = auth.uid();
END;
$$;

-- Create a function to check if user is admin/manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- Policy 1: Users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users can always update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can insert their own profile (for initial setup)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 4: Admins and managers can read profiles in their company
-- This policy is separate from the "own profile" policy to avoid conflicts
CREATE POLICY "Admins can read company profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() != id  -- Not their own profile (handled by separate policy)
    AND
    is_admin_or_manager() = true
    AND
    company_id IN (
      SELECT (get_user_company_info()).company_id
    )
  );

-- Policy 5: Admins and managers can insert profiles in their company
CREATE POLICY "Admins can insert company profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() != id  -- Not their own profile (handled by separate policy)
    AND
    is_admin_or_manager() = true
    AND
    company_id IN (
      SELECT (get_user_company_info()).company_id
    )
  );

-- Policy 6: Admins and managers can update profiles in their company
CREATE POLICY "Admins can update company profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() != id  -- Not their own profile (handled by separate policy)
    AND
    is_admin_or_manager() = true
    AND
    company_id IN (
      SELECT (get_user_company_info()).company_id
    )
  )
  WITH CHECK (
    auth.uid() != id  -- Not their own profile (handled by separate policy)
    AND
    is_admin_or_manager() = true
    AND
    company_id IN (
      SELECT (get_user_company_info()).company_id
    )
  );

-- Policy 7: Admins and managers can delete profiles in their company
CREATE POLICY "Admins can delete company profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() != id  -- Cannot delete own profile
    AND
    is_admin_or_manager() = true
    AND
    company_id IN (
      SELECT (get_user_company_info()).company_id
    )
  );

-- Grant necessary permissions to the functions
GRANT EXECUTE ON FUNCTION get_user_company_info() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_manager() TO authenticated;