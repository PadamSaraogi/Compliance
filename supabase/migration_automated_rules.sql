-- Migration: Support Automated Filings & Upsert

-- 1. Ensure company_filings has a unique identifier for upserting rules
-- We use (company_id, title) to uniquely identify a filing instance (e.g. "GSTR-1 - Jan 2026" for Company X)
DELETE FROM company_filings a USING company_filings b WHERE a.id < b.id AND a.company_id = b.company_id AND a.title = b.title;
ALTER TABLE company_filings DROP CONSTRAINT IF EXISTS company_filings_unique_title;
ALTER TABLE company_filings ADD CONSTRAINT company_filings_unique_title UNIQUE (company_id, title);

-- 2. Ensure master_filings has columns for sheet sync metadata
ALTER TABLE master_filings ADD COLUMN IF NOT EXISTS synced_from_sheet boolean DEFAULT false;
ALTER TABLE master_filings ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
