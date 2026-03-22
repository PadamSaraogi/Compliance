-- Migration: Ensure UNIQUE constraints for Upsert operations

-- 1. Ensure companies table exists and has unique name
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entity_type text NOT NULL,
  pan text, gstin text, cin text,
  is_active boolean DEFAULT true,
  color text DEFAULT '#0f1f3d',
  created_at timestamptz DEFAULT now()
);

-- Delete any existing duplicates before adding constraint to be safe
DELETE FROM companies a USING companies b WHERE a.id < b.id AND a.name = b.name;
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_name_key;
ALTER TABLE companies ADD CONSTRAINT companies_name_key UNIQUE (name);

-- 2. Update companies entity_type constraint
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_entity_type_check;
ALTER TABLE companies ADD CONSTRAINT companies_entity_type_check 
  CHECK (entity_type IN ('Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship', 'Individual', 'HUF', 'SBL Subsidiary', 'SBL SUB'));

-- 3. Ensure master_filings has unique name for rules sync
DELETE FROM master_filings a USING master_filings b WHERE a.id < b.id AND a.name = b.name;
ALTER TABLE master_filings DROP CONSTRAINT IF EXISTS master_filings_name_key;
ALTER TABLE master_filings ADD CONSTRAINT master_filings_name_key UNIQUE (name);

-- 4. Link filings
ALTER TABLE company_filings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- 5. Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
