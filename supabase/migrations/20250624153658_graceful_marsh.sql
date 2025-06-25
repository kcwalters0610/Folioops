/*
  # Setup Demo Data and User Profile Helper

  1. New Data
    - Creates a demo company for testing
    - Provides helper function for profile creation

  2. Helper Function
    - `create_user_profile()` function to easily link auth users to profiles
    - Handles company creation and profile setup

  3. Usage Instructions
    - Use the helper function with your actual user ID from Supabase Auth
*/

-- First, create a sample company (you can modify this)
INSERT INTO companies (name, email, industry, subscription_plan)
VALUES (
  'Demo HVAC Company',
  'admin@demohvac.com',
  'HVAC',
  'basic'
)
ON CONFLICT DO NOTHING;

-- Create a function to help with profile setup
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id uuid,
  user_email text,
  first_name text,
  last_name text,
  company_name text DEFAULT 'Demo HVAC Company'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_uuid uuid;
BEGIN
  -- Get or create company
  SELECT id INTO company_uuid FROM companies WHERE name = company_name LIMIT 1;
  
  IF company_uuid IS NULL THEN
    INSERT INTO companies (name, email, industry, subscription_plan)
    VALUES (company_name, user_email, 'HVAC', 'basic')
    RETURNING id INTO company_uuid;
  END IF;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    -- Update existing profile
    UPDATE profiles SET
      company_id = company_uuid,
      email = user_email,
      first_name = first_name,
      last_name = last_name,
      role = 'admin',
      is_active = true,
      updated_at = now()
    WHERE id = user_id;
  ELSE
    -- Create new profile
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
  END IF;
END;
$$;