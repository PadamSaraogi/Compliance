-- Migration: Add companies table and link to company_filings
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship')),
  pan text,
  gstin text,
  cin text,
  is_active boolean DEFAULT true,
  color text DEFAULT '#0f1f3d',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE company_filings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
