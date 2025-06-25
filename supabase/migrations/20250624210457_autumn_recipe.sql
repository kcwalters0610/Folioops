/*
  # Fix work order photos RLS policy

  1. Security Changes
    - Drop problematic INSERT policy on work_order_photos
    - Create simplified INSERT policy for authenticated users
    - Ensure proper SELECT policy exists for viewing photos

  2. Policy Details
    - Users can upload photos for work orders in their company
    - Users can view photos from their company
    - All policies check company membership through profiles table
*/

-- Drop the existing INSERT policy that's causing issues
DROP POLICY IF EXISTS "Users can upload photos for company work orders" ON work_order_photos;

-- Drop existing SELECT policy to recreate it properly
DROP POLICY IF EXISTS "Users can view photos in their company" ON work_order_photos;

-- Create a new, simpler INSERT policy
CREATE POLICY "Users can upload photos for work orders in their company"
  ON work_order_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() 
    AND company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    AND work_order_id IN (
      SELECT id 
      FROM work_orders 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Create a proper SELECT policy for viewing photos
CREATE POLICY "Users can view photos in their company"
  ON work_order_photos
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );