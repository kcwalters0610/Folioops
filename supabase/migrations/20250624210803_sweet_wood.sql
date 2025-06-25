/*
  # Fix work_order_photos table RLS policies

  This migration fixes the RLS policies for the work_order_photos table to allow proper photo uploads.
  
  1. Table Updates
    - Drop existing problematic policies
    - Create new policies for INSERT, SELECT, and DELETE operations
    - Ensure users can only access photos from their company
    - Ensure users can only upload photos they own
*/

-- Ensure RLS is enabled on work_order_photos table
ALTER TABLE work_order_photos ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can upload photos for work orders in their company" ON work_order_photos;
DROP POLICY IF EXISTS "Users can view photos in their company" ON work_order_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON work_order_photos;
DROP POLICY IF EXISTS "Users can upload photos for company work orders" ON work_order_photos;

-- Create INSERT policy - users can upload photos for work orders in their company
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
      SELECT wo.id 
      FROM work_orders wo
      JOIN profiles p ON p.company_id = wo.company_id
      WHERE p.id = auth.uid()
    )
  );

-- Create SELECT policy - users can view photos in their company
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

-- Create DELETE policy - users can delete their own photos
CREATE POLICY "Users can delete their own photos"
  ON work_order_photos
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    AND company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );