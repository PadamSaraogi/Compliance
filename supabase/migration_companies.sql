-- Migration: Add/Update companies table and link to company_filings
-- This script handles existing tables correctly

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entity_type text NOT NULL,
  pan text,
  gstin text,
  cin text,
  is_active boolean DEFAULT true,
  color text DEFAULT '#0f1f3d',
  created_at timestamptz DEFAULT now()
);

-- 2. Update the CHECK constraint to include HUF and Individual
-- We drop it first to avoid "already exists" errors or stale values
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_entity_type_check;
ALTER TABLE companies ADD CONSTRAINT companies_entity_type_check 
  CHECK (entity_type IN (
    'Private Limited', 'Public Limited', 'LLP', 'Partnership',
    'Sole Proprietorship', 'Individual', 'HUF'
  ));

-- 3. Link filings to companies if not already linked
ALTER TABLE company_filings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- 4. Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
