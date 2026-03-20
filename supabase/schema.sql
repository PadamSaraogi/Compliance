-- Create extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- tables: users, entity_types, compliance_categories, master_filings, company_filings, filing_documents, reminder_log, audit_log, app_settings

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'ceo', 'accountant')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

CREATE TABLE entity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

CREATE TABLE compliance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text,
  icon text
);

CREATE TABLE master_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES compliance_categories(id),
  applicable_to text[],
  frequency text,
  due_date_rule text,
  due_date_formula text,
  governing_law text,
  penalty_description text,
  penalty_formula text,
  is_active boolean DEFAULT true,
  notes text,
  synced_from_sheet boolean DEFAULT false,
  last_synced_at timestamptz
);

CREATE TABLE company_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_filing_id uuid REFERENCES master_filings(id),
  title text NOT NULL,
  period text,
  deadline date NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Done', 'Overdue', 'NA')),
  assigned_to uuid REFERENCES users(id),
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id),
  notes text,
  gdrive_folder_id text,
  gdrive_folder_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE filing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_filing_id uuid REFERENCES company_filings(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  gdrive_file_id text NOT NULL,
  gdrive_view_url text NOT NULL,
  gdrive_download_url text,
  file_type text,
  file_size_kb integer,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now(),
  description text
);

CREATE TABLE reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_filing_id uuid REFERENCES company_filings(id) ON DELETE CASCADE,
  sent_at timestamptz DEFAULT now(),
  sent_to text[],
  reminder_type text,
  email_subject text,
  success boolean,
  error_message text
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  company_filing_id uuid REFERENCES company_filings(id),
  action text,
  old_value jsonb,
  new_value jsonb,
  timestamp timestamptz DEFAULT now(),
  ip_address text
);

CREATE TABLE app_settings (
  key text PRIMARY KEY,
  value text
);

-- Enable RLS for all tables to ensure safety. Applications acting as server access using service_role key will bypass this.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
