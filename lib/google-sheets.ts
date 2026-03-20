import { google } from 'googleapis';
import { getAdminSupabase } from './supabase';

const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const sheetId = process.env.GOOGLE_SHEET_ID;

let auth: any = null;
if (clientEmail && privateKey) {
  auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const sheets = auth ? google.sheets({ version: 'v4', auth }) : null;

export async function syncMasterFilings() {
  if (!sheets || !sheetId) return { success: false, error: 'Google Sheets not configured.' };

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'MasterFilings!A2:K', // Using a specific sheet name
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return { success: true, count: 0 };

    const supabase = getAdminSupabase();
    const { data: categories } = await supabase.from('compliance_categories').select('*');
    const catMap = new Map((categories || []).map((c: any) => [c.name, c.id]));

    const payloads = rows.map((row: any) => {
      const [name, categoryName, applicableToStr, frequency, dueDateRule, dueDateFormula, governingLaw, penaltyDesc, penaltyFormula, notes, isActiveStr] = row;
      if (!name) return null;
      let catId = catMap.get(categoryName) || null;
      return {
        name,
        category_id: catId,
        applicable_to: applicableToStr ? applicableToStr.split(',').map((s: string) => s.trim()) : [],
        frequency,
        due_date_rule: dueDateRule,
        due_date_formula: dueDateFormula,
        governing_law: governingLaw,
        penalty_description: penaltyDesc,
        penalty_formula: penaltyFormula,
        notes,
        is_active: isActiveStr?.trim().toLowerCase() !== 'false',
        synced_from_sheet: true,
        last_synced_at: new Date().toISOString()
      };
    }).filter(p => p !== null);

    const { error } = await supabase.from('master_filings').upsert(payloads, { onConflict: 'name' });
    if (error) throw error;

    // AUTOMATICALLY APPLY RULES TO ALL COMPANIES
    const applyResult = await applyMasterRulesToCompanies();

    return { 
      success: true, 
      count: payloads.length,
      message: `Synced ${payloads.length} rules. ${applyResult.count || 0} filings generated/updated across all companies.`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Iterates through all companies and master filing rules to ensure all applicable filings exist
 */
import { getComplianceInstances } from './compliance-logic';

export async function applyMasterRulesToCompanies() {
  const supabase = getAdminSupabase();
  
  // 1. Fetch data
  const { data: companies } = await supabase.from('companies').select('*');
  const { data: masters } = await supabase.from('master_filings').select('*').eq('is_active', true);
  
  if (!companies || !masters) return { count: 0 };

  const allNewFilings: any[] = [];

  // 2. Cross-reference
  for (const company of companies) {
    for (const rule of masters) {
      // Check if applicable (matches entity type or 'all')
      const applicableCodes = rule.applicable_to || [];
      const isMatch = applicableCodes.length === 0 || 
                      applicableCodes.includes('all') || 
                      applicableCodes.some((code: string) => {
                        const standardEntity = code.trim().toUpperCase();
                        // Handle both full names and codes
                        return company.entity_type.startsWith(standardEntity) || 
                               (standardEntity === 'PVT' && company.entity_type === 'Private Limited') ||
                               (standardEntity === 'PUB' && company.entity_type === 'Public Limited') ||
                               (standardEntity === 'INDIV' && company.entity_type === 'Individual') ||
                               (standardEntity === 'HUF' && company.entity_type === 'HUF');
                      });

      if (isMatch) {
        const instances = getComplianceInstances(rule.name, rule.frequency, rule.due_date_rule);
        for (const inst of instances) {
          allNewFilings.push({
            company_id: company.id,
            master_filing_id: rule.id,
            title: inst.title,
            deadline: inst.deadline,
            status: inst.status,
            period: inst.period || null,
          });
        }
      }
    }
  }

  // 3. Batch Upsert to avoid duplicates (unique constraint on company_id, master_filing_id, title)
  // Note: We need a unique constraint for this to be perfect, but for now we'll just insert if possible
  // or use a smart check. To be safe and simple, we'll try to insert.
  if (allNewFilings.length > 0) {
    const { error } = await supabase.from('company_filings').upsert(allNewFilings, { 
      onConflict: 'company_id, title' // We should ensure this constraint exists
    });
    if (error) {
      console.warn('Upsert failed, falling back to batch insert', error);
      // Fallback: just insert and ignore errors for duplicates
      await supabase.from('company_filings').insert(allNewFilings);
    }
    return { count: allNewFilings.length };
  }

  return { count: 0 };
}

export async function syncCompaniesFromSheet() {
  if (!sheets || !sheetId) return { success: false, error: 'Google Sheets not configured.' };
  try {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Companies!A2:F' });
    const rows = response.data.values;
    if (!rows || rows.length === 0) return { success: true, count: 0 };

    const supabase = getAdminSupabase();
    const payloads = rows.map((row: any) => {
      const [name, entityType, pan, gstin, cin, color] = row;
      if (!name) return null;
      return { name, entity_type: entityType, pan, gstin, cin, color: color || '#0f1f3d' };
    }).filter(p => p !== null);

    const { error } = await supabase.from('companies').upsert(payloads, { onConflict: 'name' });
    if (error) throw error;
    return { success: true, count: payloads.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncFilingsFromSheet() {
  if (!sheets || !sheetId) return { success: false, error: 'Google Sheets not configured.' };
  try {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Filings!A2:F' });
    const rows = response.data.values;
    if (!rows || rows.length === 0) return { success: true, count: 0 };

    const supabase = getAdminSupabase();
    const { data: companies } = await supabase.from('companies').select('id, name');
    const { data: masters } = await supabase.from('master_filings').select('id, name');
    
    const companyMap = new Map((companies || []).map((c: any) => [c.name, c.id]));
    const masterMap = new Map((masters || []).map((m: any) => [m.name, m.id]));

    const filings = rows.map((row: any) => {
      const [companyName, title, deadline, status, categoryName, period] = row;
      const companyId = companyMap.get(companyName);
      if (!companyId || !title || !deadline) return null;

      // Try to find a master filing by name
      const masterId = masterMap.get(title) || null;

      return {
        company_id: companyId,
        master_filing_id: masterId,
        title,
        deadline,
        status: status || 'Pending',
        period,
        updated_at: new Date().toISOString()
      };
    }).filter(f => f !== null);

    if (filings.length === 0) return { success: true, count: 0 };

    // Grouping by company for clearer upsert? No, just batch insert/upsert
    // Note: We don't have a unique constraint on title/deadline yet, so we insert or handle intelligently
    const { error } = await supabase.from('company_filings').insert(filings);
    if (error) throw error;
    return { success: true, count: filings.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

