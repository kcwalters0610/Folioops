-- Drop existing functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS get_user_company_info() CASCADE;
DROP FUNCTION IF EXISTS is_admin_or_manager() CASCADE;
DROP FUNCTION IF EXISTS create_user_for_company(text, text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS generate_random_password(integer) CASCADE;

-- Helper function to get user company info
CREATE OR REPLACE FUNCTION get_user_company_info()
RETURNS TABLE(company_id uuid, role text) AS $$
BEGIN
  RETURN QUERY
  SELECT profiles.company_id, profiles.role
  FROM profiles
  WHERE profiles.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin or manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT profiles.role INTO user_role
  FROM profiles
  WHERE profiles.id = auth.uid();
  
  RETURN user_role IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a user for a company (admin only)
CREATE OR REPLACE FUNCTION create_user_for_company(
  user_email text,
  user_password text,
  first_name text,
  last_name text,
  user_role text DEFAULT 'tech',
  phone_number text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  new_user_id uuid;
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
      'error', 'Only admins and managers can create users'
    );
  END IF;
  
  -- Validate role
  IF user_role NOT IN ('admin', 'manager', 'tech') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role specified'
    );
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User with this email already exists'
    );
  END IF;
  
  -- Generate new user ID
  new_user_id := gen_random_uuid();
  
  -- Create the auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmation_token,
    recovery_sent_at,
    recovery_token,
    email_change_sent_at,
    email_change,
    email_change_token_new,
    email_change_token_current,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(), -- Email confirmed immediately
    now(),
    '',
    null,
    '',
    null,
    '',
    '',
    '',
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    null,
    phone_number,
    CASE WHEN phone_number IS NOT NULL THEN now() ELSE null END,
    '',
    '',
    null,
    0,
    null,
    '',
    null,
    false,
    null
  );
  
  -- Create the profile
  INSERT INTO profiles (
    id,
    company_id,
    email,
    first_name,
    last_name,
    role,
    phone,
    is_active
  ) VALUES (
    new_user_id,
    current_user_company,
    user_email,
    first_name,
    last_name,
    user_role,
    phone_number,
    true
  );
  
  -- Create identity record
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    email
  ) VALUES (
    new_user_id,
    new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id::text, user_email)::jsonb,
    'email',
    null,
    now(),
    now(),
    user_email
  );
  
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'User created successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate a random password
CREATE OR REPLACE FUNCTION generate_random_password(length integer DEFAULT 12)
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Recreate the policies that depend on get_user_company_info()
-- These were dropped with CASCADE, so we need to recreate them

-- Profiles policies
DROP POLICY IF EXISTS "Admins can read company profiles" ON profiles;
CREATE POLICY "Admins can read company profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING ((auth.uid() <> id) AND (is_admin_or_manager() = true) AND (company_id IN ( SELECT (get_user_company_info()).company_id AS company_id)));

DROP POLICY IF EXISTS "Admins can insert company profiles" ON profiles;
CREATE POLICY "Admins can insert company profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() <> id) AND (is_admin_or_manager() = true) AND (company_id IN ( SELECT (get_user_company_info()).company_id AS company_id)));

DROP POLICY IF EXISTS "Admins can update company profiles" ON profiles;
CREATE POLICY "Admins can update company profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() <> id) AND (is_admin_or_manager() = true) AND (company_id IN ( SELECT (get_user_company_info()).company_id AS company_id)))
  WITH CHECK ((auth.uid() <> id) AND (is_admin_or_manager() = true) AND (company_id IN ( SELECT (get_user_company_info()).company_id AS company_id)));

DROP POLICY IF EXISTS "Admins can delete company profiles" ON profiles;
CREATE POLICY "Admins can delete company profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING ((auth.uid() <> id) AND (is_admin_or_manager() = true) AND (company_id IN ( SELECT (get_user_company_info()).company_id AS company_id)));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_for_company TO authenticated;
GRANT EXECUTE ON FUNCTION generate_random_password TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_info TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_manager TO authenticated;