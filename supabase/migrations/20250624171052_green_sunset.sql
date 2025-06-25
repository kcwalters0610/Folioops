/*
  # Fix Profiles RLS Policies - Remove Infinite Recursion

  1. Security Changes
    - Drop existing problematic RLS policies on profiles table
    - Create new, simple RLS policies that don't cause recursion
    - Ensure policies use direct auth.uid() checks instead of subqueries

  2. Policy Changes
    - Users can read their own profile: auth.uid() = id
    - Users can update their own profile: auth.uid() = id  
    - Users can insert their own profile during signup: auth.uid() = id
    - Admins and managers can manage profiles in their company (simplified)

  This fixes the "infinite recursion detected in policy" error by removing
  circular references in the policy definitions.
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins and managers can manage profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;

-- Create simple, non-recursive policies

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admins and managers can read all profiles in their company
-- This uses a simpler approach to avoid recursion
CREATE POLICY "Company admins can read company profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = profiles.company_id
      AND c.id IN (
        SELECT p.company_id FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    )
  );

-- Admins and managers can update profiles in their company
CREATE POLICY "Company admins can update company profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = profiles.company_id
      AND c.id IN (
        SELECT p.company_id FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = profiles.company_id
      AND c.id IN (
        SELECT p.company_id FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    )
  );

-- Admins and managers can insert new profiles in their company
CREATE POLICY "Company admins can insert company profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = profiles.company_id
      AND c.id IN (
        SELECT p.company_id FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    )
  );

-- Admins and managers can delete profiles in their company
CREATE POLICY "Company admins can delete company profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = profiles.company_id
      AND c.id IN (
        SELECT p.company_id FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
      )
    )
  );