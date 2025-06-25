/*
  # Fix RLS policy for work order photo uploads

  1. Security Policy Updates
    - Drop existing restrictive INSERT policy for work_order_photos
    - Create new INSERT policy that allows users to upload photos for work orders in their company
    - Ensure the policy checks both user authentication and company membership

  2. Policy Details
    - Users can insert photos if they are the uploader (uploaded_by = auth.uid())
    - Users can only upload photos for work orders in their own company
    - The company_id must match the user's company_id from their profile
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can upload photos for work orders in their company" ON work_order_photos;

-- Create a new INSERT policy that properly allows photo uploads
CREATE POLICY "Users can upload photos for work orders in their company"
  ON work_order_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (uploaded_by = auth.uid()) 
    AND 
    (company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    ))
    AND
    (work_order_id IN (
      SELECT wo.id 
      FROM work_orders wo
      INNER JOIN profiles p ON p.company_id = wo.company_id
      WHERE p.id = auth.uid()
    ))
  );

-- Also ensure there's a proper SELECT policy for viewing photos
DROP POLICY IF EXISTS "Users can view photos in their company" ON work_order_photos;

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

-- Add a DELETE policy so users can delete their own photos if needed
CREATE POLICY "Users can delete their own photos"
  ON work_order_photos
  FOR DELETE
  TO authenticated
  USING (
    (uploaded_by = auth.uid())
    AND
    (company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    ))
  );