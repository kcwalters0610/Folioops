/*
  # Fix photo upload RLS policy

  1. Security Updates
    - Update INSERT policy for work_order_photos table
    - Ensure uploaded_by field matches authenticated user
    - Maintain company_id validation for security

  2. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy with proper uploaded_by validation
    - Ensure users can only upload photos for their own company's work orders
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can upload photos in their company" ON work_order_photos;

-- Create a new INSERT policy that properly validates both company_id and uploaded_by
CREATE POLICY "Users can upload photos for company work orders"
  ON work_order_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    company_id IN (
      SELECT profiles.company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    ) AND
    work_order_id IN (
      SELECT work_orders.id 
      FROM work_orders 
      WHERE work_orders.company_id IN (
        SELECT profiles.company_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );