import { getAdminSupabase } from './supabase';
import { getComplianceInstances } from './compliance-logic';

const DEFAULT_CATEGORIES = [
  { name: 'Income Tax', color: '#dc2626' },
  { name: 'GST', color: '#16a34a' },
  { name: 'MCA (RoC)', color: '#2563eb' },
  { name: 'TDS/TCS', color: '#d97706' },
  { name: 'Labour Law', color: '#7c3aed' },
  { name: 'RBI/FEMA', color: '#0891b2' },
  { name: 'EPFO/ESIC', color: '#db2777' },
];

// Real companies from the Sarahogi Group compliance sheet
const REAL_COMPANIES = [
  { name: 'Saraogi Builders Ltd.',            entity_type: 'Public Limited',      color: '#1e40af' },
  { name: 'International Green Scapes Ltd.',  entity_type: 'Public Limited',      color: '#0f766e' },
  { name: 'KBS Smart Homes Pvt. Ltd.',        entity_type: 'Private Limited',     color: '#7c3aed' },
  { name: 'Harpat Holdings Pvt. Ltd.',        entity_type: 'Private Limited',     color: '#b45309' },
  { name: 'Vij Vij Properties Pvt. Ltd.',     entity_type: 'Private Limited',     color: '#be185d' },
  { name: 'Prashan Commotrade Pvt. Ltd.',     entity_type: 'Private Limited',     color: '#15803d' },
  { name: 'Saraogi Constructions Co. Pvt. Ltd.', entity_type: 'Private Limited', color: '#c2410c' },
  { name: 'KBS Infrastructure Pvt. Ltd.',     entity_type: 'Private Limited',     color: '#6d28d9' },
  { name: 'Sangha Fabtrade Pvt. Ltd.',        entity_type: 'Private Limited',     color: '#0891b2' },
  { name: 'Bhatinda Sales Pvt. Ltd.',         entity_type: 'Private Limited',     color: '#1d4ed8' },
  { name: 'Saraogi Infrastructure',           entity_type: 'Partnership',         color: '#065f46' },
  { name: 'SBL - HARYANA',                   entity_type: 'Private Limited',     color: '#1e1b4b' },
  { name: 'SBL - ANDHRA',                    entity_type: 'Private Limited',     color: '#312e81' },
  { name: 'SBL - TN',                        entity_type: 'Private Limited',     color: '#4338ca' },
  { name: 'SBL - Assam',                     entity_type: 'Private Limited',     color: '#4f46e5' },
  { name: 'Kul Bhushan Saraogi',             entity_type: 'Individual',          color: '#374151' },
  { name: 'Kamlesh Saraogi',                 entity_type: 'Individual',          color: '#374151' },
  { name: 'Jainender Saraogi',               entity_type: 'Individual',          color: '#374151' },
  { name: 'Paras Saraogi',                   entity_type: 'Individual',          color: '#374151' },
  { name: 'Vasu Saraogi',                    entity_type: 'Individual',          color: '#374151' },
  { name: 'Padam Saraogi',                   entity_type: 'Individual',          color: '#374151' },
  { name: 'Hitesh Saraogi',                  entity_type: 'Individual',          color: '#374151' },
  { name: 'Urmila Gupta',                    entity_type: 'Individual',          color: '#374151' },
  { name: 'Kul Bhushan Saraogi HUF',        entity_type: 'HUF',                 color: '#92400e' },
  { name: 'Jainender Saraogi HUF',           entity_type: 'HUF',                 color: '#92400e' },
  { name: 'Paras Saraogi HUF',               entity_type: 'HUF',                 color: '#92400e' },
  { name: 'S.K. Saraogi HUF',               entity_type: 'HUF',                 color: '#92400e' },
];

const MASTER_COMPLIANCES = [
  { name: 'GSTR-1', category: 'GST', frequency: 'Monthly', due_date_rule: '11th of Next Month', applicable_to: ['PVT', 'PUB', 'PART', 'INDIV', 'HUF'] },
  { name: 'GSTR-3B', category: 'GST', frequency: 'Monthly', due_date_rule: '20th of Next Month', applicable_to: ['PVT', 'PUB', 'PART', 'INDIV', 'HUF'] },
  { name: 'GSTR-9 Annual Return', category: 'GST', frequency: 'Annual', due_date_rule: '31st December', applicable_to: ['PVT', 'PUB', 'PART'] },
  { name: 'TDS Return', category: 'TDS/TCS', frequency: 'Quarterly', due_date_rule: '31st of Next Month', applicable_to: ['PVT', 'PUB', 'PART'] },
  { name: 'ITR Filing', category: 'Income Tax', frequency: 'Annual', due_date_rule: '31st July/Oct', applicable_to: ['all'] },
  { name: 'AOC-4', category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '31st December', applicable_to: ['PVT', 'PUB'] },
  { name: 'MGT-7', category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '31st December', applicable_to: ['PVT', 'PUB'] },
  { name: 'DPT-3', category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '30th June', applicable_to: ['PVT', 'PUB'] },
  { name: 'DIR-3 KYC', category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '30th September', applicable_to: ['INDIV'] },
];

export async function seedRealData(supabase: any, isFresh: boolean = false) {
  try {
    console.log('--- Starting Production Seed ---');

    // 1. Admin
    const { data: { users } } = await supabase.auth.admin.listUsers();
    let adminUser = users.find((u: any) => u.email === 'admin@saraogi.com');
    if (!adminUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: 'admin@saraogi.com', password: 'Admin123', email_confirm: true,
        user_metadata: { full_name: 'Saraogi Admin', role: 'Admin' }
      });
      if (error) throw error;
      adminUser = data.user;
    }

    // 2. Clean
    if (isFresh) {
      await supabase.from('company_filings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // 3. Companies
    await supabase.from('companies').upsert(REAL_COMPANIES, { onConflict: 'name' });
    const { data: dbCompanies } = await supabase.from('companies').select('*');

    // 4. Masters
    await supabase.from('compliance_categories').upsert(DEFAULT_CATEGORIES, { onConflict: 'name' });
    const { data: categories } = await supabase.from('compliance_categories').select('*');
    const catMap = new Map(categories?.map(c => [c.name, c.id]));

    const masterPayloads = MASTER_COMPLIANCES.map(m => ({
      name: m.name, category_id: catMap.get(m.category) || null,
      applicable_to: m.applicable_to, frequency: m.frequency,
      due_date_rule: m.due_date_rule, is_active: true
    }));
    await supabase.from('master_filings').upsert(masterPayloads, { onConflict: 'name' });
    const { data: dbMasters } = await supabase.from('master_filings').select('*');

    // 5. Filings
    const allFilings: any[] = [];
    for (const company of dbCompanies || []) {
      for (const rule of dbMasters || []) {
        const codes = rule.applicable_to || [];
        const isMatch = codes.length === 0 || codes.includes('all') || codes.some((code: string) => {
          const c = code.trim().toUpperCase();
          return company.entity_type.startsWith(c) || 
                 (c === 'PVT' && company.entity_type === 'Private Limited') ||
                 (c === 'PUB' && company.entity_type === 'Public Limited') ||
                 (c === 'INDIV' && company.entity_type === 'Individual') ||
                 (c === 'HUF' && company.entity_type === 'HUF');
        });

        if (isMatch) {
          const instances = getComplianceInstances(rule.name, rule.frequency, rule.due_date_rule);
          instances.forEach(inst => {
            allFilings.push({
              company_id: company.id, master_filing_id: rule.id,
              title: inst.title, deadline: inst.deadline, status: inst.status,
              period: inst.period || null, assigned_to: adminUser.id
            });
          });
        }
      }
    }

    if (allFilings.length > 0) {
      await supabase.from('company_filings').upsert(allFilings, { onConflict: 'company_id, title' });
    }

    return { success: true, count: allFilings.length };
  } catch (error: any) {
    console.error('Seed Failed:', error);
    return { success: false, error: error.message };
  }
}

export async function seedDatabase() {
  const supabase = getAdminSupabase();
  return seedRealData(supabase, false);
}
