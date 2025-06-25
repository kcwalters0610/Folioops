/*
  # Fix Photo Upload Policies for work_order_photos table

  This migration fixes the RLS policies for the work_order_photos table to ensure
  proper photo upload functionality.

  ## Changes
  1. Update work_order_photos table policies for better compatibility
  2. Ensure proper INSERT, SELECT, and DELETE policies exist
*/

-- Drop existing policies on work_order_photos table
DROP POLICY IF EXISTS "Users can upload photos for work orders in their company" ON work_order_photos;
DROP POLICY IF EXISTS "Users can view photos in their company" ON work_order_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON work_order_photos;

-- Create simplified INSERT policy for work_order_photos
CREATE POLICY "Users can upload photos for work orders in their company"
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
    SELECT wo.id
    FROM work_orders wo
    JOIN profiles p ON p.company_id = wo.company_id
    WHERE p.id = auth.uid()
  )
);

-- Create SELECT policy for work_order_photos
CREATE POLICY "Users can view photos in their company"
ON work_order_photos
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Create DELETE policy for work_order_photos
CREATE POLICY "Users can delete their own photos"
ON work_order_photos
FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid() AND
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);