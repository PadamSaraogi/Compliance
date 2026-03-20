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
  if (!sheets || !sheetId) return { success: false, error: 'Google Sheets not configured. Please check environment variables or Admin Settings.' };

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A2:K', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return { success: true, newCount: 0, updatedCount: 0 };

    const supabase = getAdminSupabase();
    
    const { data: categories } = await supabase.from('compliance_categories').select('*');
    const catMap = new Map(categories?.map(c => [c.name, c.id]));

    let newCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const [
        name, categoryName, applicableToStr, frequency, 
        dueDateRule, dueDateFormula, governingLaw, 
        penaltyDesc, penaltyFormula, notes, isActiveStr
      ] = row;

      if (!name) continue;

      let catId = null;
      if (categoryName) {
        if (!catMap.has(categoryName)) {
          const { data: newCat } = await supabase.from('compliance_categories')
            .insert({ name: categoryName, color: '#cbd5e1' }).select().single();
          if (newCat) {
            catMap.set(categoryName, newCat.id);
            catId = newCat.id;
          }
        } else {
          catId = catMap.get(categoryName);
        }
      }

      const applicableTo = applicableToStr ? applicableToStr.split(',').map((s: string) => s.trim()) : [];
      const isActive = isActiveStr?.trim().toLowerCase() !== 'false';

      const payload = {
        name,
        category_id: catId,
        applicable_to: applicableTo,
        frequency,
        due_date_rule: dueDateRule,
        due_date_formula: dueDateFormula,
        governing_law: governingLaw,
        penalty_description: penaltyDesc,
        penalty_formula: penaltyFormula,
        notes,
        is_active: isActive,
        synced_from_sheet: true,
        last_synced_at: new Date().toISOString()
      };

      const { data: existing } = await supabase.from('master_filings').select('id').eq('name', name).maybeSingle();
      
      if (existing) {
        await supabase.from('master_filings').update(payload).eq('id', existing.id);
        updatedCount++;
      } else {
        await supabase.from('master_filings').insert(payload);
        newCount++;
      }
    }

    return { success: true, newCount, updatedCount };
  } catch (error: any) {
    console.error('Sheet sync error', error);
    return { success: false, error: error.message };
  }
}
