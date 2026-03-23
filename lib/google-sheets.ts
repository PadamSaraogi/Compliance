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
    console.log('Syncing Master Filings from Sheet ID:', sheetId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'MasterFilings!A2:K', 
    });

    const rows = response.data.values;
    console.log('Master Filings raw rows count:', rows?.length || 0);

    if (!rows || rows.length === 0) {
      console.warn('No rows found in MasterFilings!A2:K. Please check if tab name is EXACTLY "MasterFilings"');
      return { success: true, count: 0 };
    }

    const supabase = getAdminSupabase();

    // 1. COLLECT AND UPSERT CATEGORIES FIRST
    const uniqueCategoryNames = Array.from(new Set(rows.map(row => row[1]).filter(Boolean)));
    if (uniqueCategoryNames.length > 0) {
      const catUpserts = uniqueCategoryNames.map(name => ({ name }));
      await supabase.from('compliance_categories').upsert(catUpserts, { onConflict: 'name' });
    }

    // 2. Fetch fresh categories for mapping
    const { data: categories } = await supabase.from('compliance_categories').select('*');
    const catMap = new Map((categories || []).map((c: any) => [c.name, c.id]));

    const payloads = rows.map((row: any, idx: number) => {
      const [name, categoryName, applicableToStr, frequency, dueDateRule, governingLaw, penaltyDesc, penaltyFormula, notes] = row;
      if (!name) {
        console.log(`Row ${idx + 2} skipped: No name found.`);
        return null;
      }
      let catId = catMap.get(categoryName) || null;
      return {
        name,
        category_id: catId,
        applicable_to: applicableToStr ? applicableToStr.split(',').map((s: string) => s.trim()) : [],
        frequency,
        due_date_rule: dueDateRule,
        due_date_formula: '', 
        governing_law: governingLaw,
        penalty_description: penaltyDesc,
        penalty_formula: penaltyFormula,
        notes,
        is_active: true,
        synced_from_sheet: true,
        last_synced_at: new Date().toISOString()
      };
    }).filter(p => p !== null);

    // DEDUPLICATE BY NAME TO AVOID SUPABASE ERR_21000 (ON CONFLICT DO UPDATE cannot affect row twice)
    const uniquePayloads = Array.from(
      payloads.reduce((map, p) => map.set(p.name, p), new Map<string, any>()).values()
    );

    console.log(`Generated ${uniquePayloads.length} unique payloads for Master Filings (from ${payloads.length} total).`);

    const { error } = await supabase.from('master_filings').upsert(uniquePayloads, { onConflict: 'name' });
    if (error) {
      console.error('Supabase Upsert Error (Master Filings):', error);
      throw error;
    }
    console.log('Successfully upserted Master Filings to Supabase.');

    // FULL SYNC: Remove master filings not in the sheet (only if they were synced from sheet before)
    const sheetFilingNamesSet = new Set(uniquePayloads.map(p => p.name.trim().toUpperCase()));
    const { data: dbMasters } = await supabase.from('master_filings').select('id, name').eq('synced_from_sheet', true);
    const mastersToDelete = (dbMasters || []).filter(m => !sheetFilingNamesSet.has(m.name.trim().toUpperCase()));

    if (mastersToDelete.length > 0) {
      console.log(`[FULL SYNC] Deleting ${mastersToDelete.length} master filings no longer in sheet:`, mastersToDelete.map(m => m.name));
      const deleteMasterIds = mastersToDelete.map(m => m.id);
      
      // We will NO LONGER delete company_filings here. 
      // Instead, we let the master record deletion handle it if CASCADE is on, 
      // or we just delete the master filing itself and its instances.
      
      // Cleanup audit logs for filings that WILL be orphaned/deleted
      const { data: filings } = await supabase.from('company_filings').select('id').in('master_filing_id', deleteMasterIds);
      const filingIds = (filings || []).map(f => f.id);
      if (filingIds.length > 0) {
        await supabase.from('audit_log').delete().in('company_filing_id', filingIds);
      }
      
      // Delete associated filings first to avoid FK constraint issues
      await supabase.from('company_filings').delete().in('master_filing_id', deleteMasterIds);

      const { error: delError } = await supabase.from('master_filings').delete().in('id', deleteMasterIds);
      if (delError) console.error('Error deleting master filings:', delError.message);
    }

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
  
  if (!companies || !masters) {
    console.warn(`No companies (${companies?.length || 0}) or rules (${masters?.length || 0}) found to apply.`);
    return { count: 0 };
  }

  console.log(`Applying ${masters.length} rules to ${companies.length} companies...`);
  const allNewFilings: any[] = [];

  // 2. Cross-reference
  console.log(`Analyzing matches for ${masters.length} rules...`);
  for (const rule of masters) {
    let matchCount = 0;
    const applicableCodes = (rule.applicable_to || []).map((c: string) => c.trim().toUpperCase());
    const isAll = applicableCodes.length === 0 || applicableCodes.includes('ALL');

    for (const company of companies) {
      const companyName = company.name.toUpperCase();
      const companyType = company.entity_type.trim().toUpperCase();
      
      let isMatch = isAll;
      
      if (!isMatch) {
        isMatch = applicableCodes.some((code: string) => {
          // 1. Direct Name Match
          if (companyName === code) return true;

          // 2. Entity Type Match (Aliases)
          if (code === 'INDIV' || code === 'INDIVIDUAL' || code === 'IND') return companyType === 'INDIVIDUAL';
          if (code === 'PVT' || code === 'PRIVATE LIMITED' || code === 'PRIVATE') return companyType === 'PRIVATE LIMITED';
          if (code === 'PUB' || code === 'PUBLIC LIMITED' || code === 'PUBLIC') return companyType === 'PUBLIC LIMITED';
          if (code === 'LLP' || code === 'LIMITED LIABILITY PARTNERSHIP') return companyType === 'LLP';
          if (code === 'HUF' || code === 'HINDU UNDIVIDED FAMILY') return companyType === 'HUF';
          if (code === 'PART' || code === 'PARTNERSHIP') return companyType === 'PARTNERSHIP';
          if (code === 'SOLE' || code === 'SOLE PROPRIETORSHIP' || code === 'SOLE') return companyType === 'SOLE PROPRIETORSHIP';
          if (code === 'SBL SUB' || code === 'SBL SUBSIDIARY') return companyType === 'SBL SUBSIDIARY';

          return companyType.includes(code) || companyType.startsWith(code);
        });
      }

      if (isMatch) {
        matchCount++;
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
    if (matchCount > 0) {
      console.log(`Rule "${rule.name}" matched ${matchCount} companies.`);
    }
  }

  console.log(`Total filings to upsert: ${allNewFilings.length}`);

  if (allNewFilings.length > 0) {
    const { error } = await supabase.from('company_filings').upsert(allNewFilings, { 
      onConflict: 'company_id, title' 
    });
    if (error) {
      console.warn('Upsert failed for company_filings:', error.message);
      // Fallback: just insert and ignore errors for duplicates
      await supabase.from('company_filings').insert(allNewFilings);
    }
    console.log(`Successfully synced ${allNewFilings.length} filings to database.`);
    return { count: allNewFilings.length };
  }

  console.warn('No filing instances were generated. Check entity type matches or frequency rules.');
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
      const [name, entityTypeRaw, pan, gstin, cin, color] = row;
      if (!name) return null;

      // Map common codes to full names for DB constraints
      const typeMap: Record<string, string> = {
        'PVT': 'Private Limited',
        'PUB': 'Public Limited',
        'LLP': 'LLP',
        'INDIV': 'Individual',
        'HUF': 'HUF',
        'PART': 'Partnership',
        'SOLE': 'Sole Proprietorship',
        'SBL SUB': 'SBL Subsidiary'
      };
      
      const entityType = typeMap[entityTypeRaw?.trim().toUpperCase()] || entityTypeRaw;

      return { name, entity_type: entityType, pan, gstin, cin, color: color || '#0f1f3d' };
    }).filter(p => p !== null);

    const { error } = await supabase.from('companies').upsert(payloads, { onConflict: 'name' });
    if (error) {
      console.error('Supabase Upsert Error (Companies):', error);
      throw error;
    }
    console.log(`Successfully synced ${payloads.length} companies to database.`);

    // FULL SYNC: Remove companies not in the sheet
    const sheetNamesSet = new Set(payloads.map(p => p.name.trim().toUpperCase()));
    const { data: dbCompanies } = await supabase.from('companies').select('id, name');
    const companiesToDelete = (dbCompanies || []).filter(c => !sheetNamesSet.has(c.name.trim().toUpperCase()));

    if (companiesToDelete.length > 0) {
      console.log(`[FULL SYNC] Deleting ${companiesToDelete.length} companies not in sheet:`, companiesToDelete.map(c => c.name));
      const deleteIds = companiesToDelete.map(c => c.id);

      // 0. Get filing IDs to clean up audit logs
      const { data: filings } = await supabase.from('company_filings').select('id').in('company_id', deleteIds);
      const filingIds = (filings || []).map(f => f.id);

      if (filingIds.length > 0) {
        // 1a. Delete from audit_log
        await supabase.from('audit_log').delete().in('company_filing_id', filingIds);
      }

      // 1b. Delete associated company filings first
      await supabase.from('company_filings').delete().in('company_id', deleteIds);
      
      // 2. Delete the companies themselves
      const { error: delError } = await supabase.from('companies').delete().in('id', deleteIds);
      if (delError) console.error('Error deleting companies:', delError.message);
    }

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

    // Use upsert to avoid duplicates, or handle manual full sync for this tab too?
    // Given the user wants "Full Sync", let's clear existing manual filings for these companies before inserting?
    // Actually, upsert is better if we have a constraint. 
    // Since we might not have a database constraint yet, we'll use a safer approach:
    // Delete existing filings for the companies in the sheet that match title + period before inserting.
    
    // For now, let's just use insert but warn that a constraint is needed for true upsert.
    // Or, we can do a smart upsert:
    const { error } = await supabase.from('company_filings').upsert(filings, { onConflict: 'company_id, title, period' });
    
    if (error) {
      console.warn('Upsert failed for company_filings (likely missing constraint):', error.message);
      // Fallback to simple insert
      const { error: insError } = await supabase.from('company_filings').insert(filings);
      if (insError) throw insError;
    }
    return { success: true, count: filings.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function appendMasterFilingToSheet(data: {
  name: string;
  categoryName: string;
  frequency: string;
  dueDateRule: string;
  notes?: string;
  applicableTo?: string[];
}) {
  if (!sheets || !sheetId) return { success: false, error: 'Google Sheets not configured.' };

  try {
    const row = [
      data.name,
      data.categoryName,
      data.applicableTo?.join(', ') || 'all',
      data.frequency,
      data.dueDateRule,
      '', // dueDateFormula (empty for now)
      '', // governingLaw
      '', // penaltyDesc
      '', // penaltyFormula
      data.notes || '',
      'TRUE' // isActive
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'MasterFilings!A:K',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error appending to sheet:', error);
    return { success: false, error: error.message };
  }
}
