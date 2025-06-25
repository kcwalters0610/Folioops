/*
  # Add WO Number to Work Orders

  1. Changes
    - Add wo_number column to work_orders table
    - Create index for better performance
    - Update existing work orders with generated WO numbers

  2. Security
    - No changes to RLS policies needed
*/

-- Add wo_number column to work_orders table
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS wo_number text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS work_orders_wo_number_idx ON work_orders(wo_number);

-- Update existing work orders with generated WO numbers using a different approach
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 1;
    current_year INTEGER;
BEGIN
    -- Get all work orders that need WO numbers, ordered by creation date
    FOR rec IN 
        SELECT id, created_at 
        FROM work_orders 
        WHERE wo_number IS NULL 
        ORDER BY created_at
    LOOP
        current_year := EXTRACT(YEAR FROM rec.created_at);
        
        UPDATE work_orders 
        SET wo_number = 'WO-' || current_year || '-' || LPAD(counter::text, 4, '0')
        WHERE id = rec.id;
        
        counter := counter + 1;
    END LOOP;
END $$;

-- Make wo_number NOT NULL for future records (existing records now have values)
ALTER TABLE work_orders ALTER COLUMN wo_number SET NOT NULL;

-- Add unique constraint to prevent duplicate WO numbers
ALTER TABLE work_orders ADD CONSTRAINT work_orders_wo_number_unique UNIQUE (wo_number);