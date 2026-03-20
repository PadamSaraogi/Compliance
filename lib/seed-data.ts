import { getAdminSupabase } from './supabase';

const DEFAULT_CATEGORIES = [
  { name: 'Income Tax', color: '#dc2626' },
  { name: 'GST', color: '#16a34a' },
  { name: 'MCA (RoC)', color: '#2563eb' },
  { name: 'TDS/TCS', color: '#d97706' },
  { name: 'Labour Law', color: '#7c3aed' },
  { name: 'RBI/FEMA', color: '#0891b2' },
  { name: 'EPFO/ESIC', color: '#db2777' },
];

// 10 demo companies across all entity types
const DEMO_COMPANIES = [
  { name: 'Saraogi Industries Pvt Ltd',    entity_type: 'Private Limited',   pan: 'AABCS1429B', gstin: '27AABCS1429B1Z5', cin: 'U74999MH2010PTC123456', color: '#1e40af' },
  { name: 'Pinnacle Solutions Pvt Ltd',    entity_type: 'Private Limited',   pan: 'AACCP8765D', gstin: '07AACCP8765D1Z3', cin: 'U72200DL2015PTC234567', color: '#7c3aed' },
  { name: 'Meridian Global Ltd',           entity_type: 'Public Limited',    pan: 'AADCM4321F', gstin: '19AADCM4321F1Z8', cin: 'L65910WB2005PLC345678', color: '#0f766e' },
  { name: 'Vertex Capital LLP',            entity_type: 'LLP',               pan: 'AAJFV2222Q', gstin: '06AAJFV2222Q1ZA', cin: 'AAA-1234',               color: '#b45309' },
  { name: 'NexGen Tech LLP',               entity_type: 'LLP',               pan: 'AABFN3333R', gstin: '29AABFN3333R1Z2', cin: 'AAB-5678',               color: '#0891b2' },
  { name: 'Arjun & Sons Trading Co',       entity_type: 'Partnership',       pan: 'AACFA4444S', gstin: '24AACFA4444S1Z7', cin: '',                       color: '#be185d' },
  { name: 'Riya Enterprises',             entity_type: 'Partnership',       pan: 'AADRE5555T', gstin: '33AADRE5555T1Z4', cin: '',                       color: '#15803d' },
  { name: 'Kapoor Consultants',           entity_type: 'Sole Proprietorship', pan: 'BVZPK1234A', gstin: '09BVZPK1234A1Z6', cin: '',                     color: '#c2410c' },
  { name: 'Sharma Logistics',             entity_type: 'Sole Proprietorship', pan: 'CQYPS5678B', gstin: '08CQYPS5678B1Z1', cin: '',                     color: '#6d28d9' },
  { name: 'Bharat Infrastructure Pvt Ltd', entity_type: 'Private Limited',   pan: 'AABIB9999C', gstin: '36AABIB9999C1Z9', cin: 'U45200TG2018PTC456789', color: '#1d4ed8' },
];

// Master compliance list with real-world data
const MASTER_COMPLIANCES = [
  // GST
  { name: 'GSTR-1 (Monthly Outward Supplies)',  category: 'GST',        frequency: 'Monthly',   due_date_rule: '11th of succeeding month', governing_law: 'CGST Act, 2017 - Section 37', penalty_description: 'Rs 50/day (Rs 20 for Nil return); max Rs 10,000', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
  { name: 'GSTR-3B (Monthly Summary Return)',   category: 'GST',        frequency: 'Monthly',   due_date_rule: '20th of succeeding month', governing_law: 'CGST Act, 2017 - Section 39', penalty_description: 'Rs 50/day (Rs 20 for Nil) + Interest @ 18% p.a. on tax', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
  { name: 'GSTR-9 (Annual Return)',             category: 'GST',        frequency: 'Annual',    due_date_rule: '31st December', governing_law: 'CGST Act, 2017 - Section 44', penalty_description: 'Rs 200/day (100 CGST + 100 SGST) up to 0.5% of turnover', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
  { name: 'GSTR-9C (Reconciliation Statement)', category: 'GST',        frequency: 'Annual',    due_date_rule: '31st December', governing_law: 'CGST Act, 2017 - Section 35(5)', penalty_description: 'Rs 200/day up to 0.5% of turnover (if audit required)', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership'] },

  // TDS/TCS
  { name: 'TDS Payment (All Sections)',         category: 'TDS/TCS',    frequency: 'Monthly',   due_date_rule: '7th of succeeding month (March: 30th April)', governing_law: 'Income Tax Act, 1961 - Section 200', penalty_description: 'Interest @ 1.5% per month from deduction to deposit date', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
  { name: 'TDS Return Form 26Q (Non-Salary)',   category: 'TDS/TCS',    frequency: 'Quarterly', due_date_rule: 'Q1: 31 Jul | Q2: 31 Oct | Q3: 31 Jan | Q4: 31 May', governing_law: 'Income Tax Act, 1961 - Section 200', penalty_description: 'Rs 200/day u/s 234E, max up to TDS amount; plus u/s 271H fine Rs 10K–1L', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
  { name: 'TDS Return Form 24Q (Salary)',       category: 'TDS/TCS',    frequency: 'Quarterly', due_date_rule: 'Q1: 31 Jul | Q2: 31 Oct | Q3: 31 Jan | Q4: 31 May', governing_law: 'Income Tax Act, 1961 - Section 192', penalty_description: 'Rs 200/day u/s 234E, max up to TDS amount', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership'] },

  // Income Tax
  { name: 'Income Tax Return (Audit Cases)',    category: 'Income Tax', frequency: 'Annual',    due_date_rule: '31st October', governing_law: 'Income Tax Act, 1961 - Section 139(1)', penalty_description: 'Late fee u/s 234F: Rs 5,000 (income > 5L) or Rs 1,000. Interest @ 1% p.m. u/s 234A', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership'] },
  { name: 'Income Tax Return (Non-Audit)',      category: 'Income Tax', frequency: 'Annual',    due_date_rule: '31st July', governing_law: 'Income Tax Act, 1961 - Section 139(1)', penalty_description: 'Late fee u/s 234F: Rs 5,000 (income > 5L) or Rs 1,000', applicable_to: ['Sole Proprietorship'] },
  { name: 'Tax Audit Report (Form 3CA/3CB)',    category: 'Income Tax', frequency: 'Annual',    due_date_rule: '30th September', governing_law: 'Income Tax Act, 1961 - Section 44AB', penalty_description: 'Penalty u/s 271B: 0.5% of turnover, max Rs 1,50,000', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership'] },
  { name: 'Advance Tax Payment (Q1)',           category: 'Income Tax', frequency: 'Annual',    due_date_rule: '15th June', governing_law: 'Income Tax Act, 1961 - Section 208', penalty_description: 'Interest @ 1% p.m. u/s 234B & 234C for shortfall', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
  { name: 'Advance Tax Payment (Q2)',           category: 'Income Tax', frequency: 'Annual',    due_date_rule: '15th September', governing_law: 'Income Tax Act, 1961 - Section 208', penalty_description: 'Interest @ 1% p.m. u/s 234B & 234C for shortfall', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
  { name: 'Advance Tax Payment (Q3)',           category: 'Income Tax', frequency: 'Annual',    due_date_rule: '15th December', governing_law: 'Income Tax Act, 1961 - Section 208', penalty_description: 'Interest @ 1% p.m. u/s 234B & 234C for shortfall', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
  { name: 'Advance Tax Payment (Q4)',           category: 'Income Tax', frequency: 'Annual',    due_date_rule: '15th March', governing_law: 'Income Tax Act, 1961 - Section 208', penalty_description: 'Interest @ 1% p.m. u/s 234B & 234C for shortfall', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },

  // MCA (RoC)
  { name: 'AOC-4 (Annual Financial Statements)', category: 'MCA (RoC)', frequency: 'Annual',   due_date_rule: '30 days after AGM (i.e. by 29th October for Sept AGM)', governing_law: 'Companies Act, 2013 - Section 137', penalty_description: 'Rs 100/day of default; officers liable to fine up to Rs 5 lakh', applicable_to: ['Private Limited', 'Public Limited'] },
  { name: 'MGT-7/7A (Annual Return)',           category: 'MCA (RoC)', frequency: 'Annual',    due_date_rule: '60 days after AGM (i.e. by 28th November for Sept AGM)', governing_law: 'Companies Act, 2013 - Section 92', penalty_description: 'Rs 100/day of default; company and officers in default liable to penalty', applicable_to: ['Private Limited', 'Public Limited'] },
  { name: 'Form 11 (LLP Annual Return)',         category: 'MCA (RoC)', frequency: 'Annual',    due_date_rule: '30th May', governing_law: 'LLP Act, 2008 - Rule 25', penalty_description: 'Rs 100/day of default per partner', applicable_to: ['LLP'] },
  { name: 'Form 8 (LLP Statement of Accounts)', category: 'MCA (RoC)', frequency: 'Annual',    due_date_rule: '30th October', governing_law: 'LLP Act, 2008 - Rule 24', penalty_description: 'Rs 100/day of default per partner', applicable_to: ['LLP'] },
  { name: 'DIR-3 KYC (Director KYC)',           category: 'MCA (RoC)', frequency: 'Annual',    due_date_rule: '30th September', governing_law: 'Companies Act, 2013 - Rule 12A', penalty_description: 'Rs 5,000 late fee; DIN deactivated until compliance', applicable_to: ['Private Limited', 'Public Limited'] },
  { name: 'DPT-3 (Return of Deposits)',         category: 'MCA (RoC)', frequency: 'Annual',    due_date_rule: '30th June', governing_law: 'Companies Act, 2013 - Section 73', penalty_description: 'Company and officers liable to a fine up to Rs 5 crore', applicable_to: ['Private Limited', 'Public Limited'] },
  { name: 'MSME-1 (MSME Payment Return)',       category: 'MCA (RoC)', frequency: 'Annual',    due_date_rule: 'Apr-Sep: 31st Oct | Oct-Mar: 30th Apr', governing_law: 'Companies Act, 2013 - Section 405', penalty_description: 'Rs 25,000 fine on company and officer in default', applicable_to: ['Private Limited', 'Public Limited'] },

  // EPFO / ESIC
  { name: 'PF Monthly Payment & ECR Filing',   category: 'EPFO/ESIC', frequency: 'Monthly',   due_date_rule: '15th of succeeding month', governing_law: 'EPF & MP Act, 1952 - Section 6', penalty_description: 'Damages 5%-25% of dues + Interest @ 12% p.a. + Prosecution', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
  { name: 'ESIC Monthly Contribution',         category: 'EPFO/ESIC', frequency: 'Monthly',   due_date_rule: '15th of succeeding month', governing_law: 'ESI Act, 1948 - Section 40', penalty_description: 'Interest @ 12% p.a. + Damages up to 25% of amount due', applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'] },
];

// Real FY 2025-26 deadline dates (April 2025 – March 2026)
function getRealDeadlines(compliance: typeof MASTER_COMPLIANCES[0]) {
  const deadlines: Array<{ title: string; deadline: string; status: string }> = [];
  const now = new Date();

  if (compliance.frequency === 'Monthly') {
    // Generate for every month Apr 2025 – Mar 2026
    const months = [
      { month: 'Apr 2025', gstr1: '2025-05-11', gstr3b: '2025-05-20', tds: '2025-05-07', pf: '2025-05-15' },
      { month: 'May 2025', gstr1: '2025-06-11', gstr3b: '2025-06-20', tds: '2025-06-07', pf: '2025-06-15' },
      { month: 'Jun 2025', gstr1: '2025-07-11', gstr3b: '2025-07-20', tds: '2025-07-07', pf: '2025-07-15' },
      { month: 'Jul 2025', gstr1: '2025-08-11', gstr3b: '2025-08-20', tds: '2025-08-07', pf: '2025-08-15' },
      { month: 'Aug 2025', gstr1: '2025-09-11', gstr3b: '2025-09-20', tds: '2025-09-07', pf: '2025-09-15' },
      { month: 'Sep 2025', gstr1: '2025-10-11', gstr3b: '2025-10-20', tds: '2025-10-07', pf: '2025-10-15' },
      { month: 'Oct 2025', gstr1: '2025-11-11', gstr3b: '2025-11-20', tds: '2025-11-07', pf: '2025-11-15' },
      { month: 'Nov 2025', gstr1: '2025-12-11', gstr3b: '2025-12-20', tds: '2025-12-07', pf: '2025-12-15' },
      { month: 'Dec 2025', gstr1: '2026-01-11', gstr3b: '2026-01-20', tds: '2026-01-07', pf: '2026-01-15' },
      { month: 'Jan 2026', gstr1: '2026-02-11', gstr3b: '2026-02-20', tds: '2026-02-07', pf: '2026-02-15' },
      { month: 'Feb 2026', gstr1: '2026-03-11', gstr3b: '2026-03-20', tds: '2026-03-07', pf: '2026-03-15' },
      { month: 'Mar 2026', gstr1: '2026-04-11', gstr3b: '2026-04-20', tds: '2026-04-30', pf: '2026-04-15' },
    ];

    for (const m of months) {
      let deadline = '';
      if (compliance.name.includes('GSTR-1')) deadline = m.gstr1;
      else if (compliance.name.includes('GSTR-3B')) deadline = m.gstr3b;
      else if (compliance.name.includes('TDS Payment')) deadline = m.tds;
      else if (compliance.name.includes('PF Monthly') || compliance.name.includes('ESIC')) deadline = m.pf;
      else deadline = m.pf; // fallback

      if (!deadline) continue;
      const deadlineDate = new Date(deadline);
      const status = deadlineDate < now
        ? (Math.random() > 0.3 ? 'Done' : 'Overdue')
        : 'Pending';
      deadlines.push({ title: `${compliance.name} — ${m.month}`, deadline, status });
    }
  } else if (compliance.frequency === 'Quarterly') {
    const quarters = [
      { label: 'Q1 (Apr–Jun 2025)', deadline: '2025-07-31' },
      { label: 'Q2 (Jul–Sep 2025)', deadline: '2025-10-31' },
      { label: 'Q3 (Oct–Dec 2025)', deadline: '2026-01-31' },
      { label: 'Q4 (Jan–Mar 2026)', deadline: '2026-05-31' },
    ];
    for (const q of quarters) {
      const deadlineDate = new Date(q.deadline);
      const status = deadlineDate < now ? (Math.random() > 0.3 ? 'Done' : 'Overdue') : 'Pending';
      deadlines.push({ title: `${compliance.name} — ${q.label}`, deadline: q.deadline, status });
    }
  } else {
    // Annual — map by specific due_date_rule
    const annualMap: Record<string, string> = {
      '31st October':         '2025-10-31',
      '31st July':            '2025-07-31',
      '30th September':       '2025-09-30',
      '15th June':            '2025-06-15',
      '15th September':       '2025-09-15',
      '15th December':        '2025-12-15',
      '15th March':           '2026-03-15',
      '30th May':             '2025-05-30',
      '30th October':         '2025-10-30',
      '30th June':            '2025-06-30',
      '31st December':        '2025-12-31',
    };
    // Find best match
    let deadline = '';
    for (const [key, date] of Object.entries(annualMap)) {
      if (compliance.due_date_rule.includes(key.replace('th ', ' ').replace('st ', ' '))) {
        deadline = date;
        break;
      }
    }
    // Fallback: try to match first keyword in rule
    if (!deadline) {
      if (compliance.due_date_rule.includes('October') || compliance.due_date_rule.includes('AGM')) deadline = '2025-10-29';
      else if (compliance.due_date_rule.includes('November')) deadline = '2025-11-28';
      else if (compliance.due_date_rule.includes('December')) deadline = '2025-12-31';
      else if (compliance.due_date_rule.includes('June')) deadline = '2025-06-30';
      else if (compliance.due_date_rule.includes('July')) deadline = '2025-07-31';
      else if (compliance.due_date_rule.includes('May')) deadline = '2025-05-30';
      else deadline = '2025-10-31';
    }

    const deadlineDate = new Date(deadline);
    const status = deadlineDate < now ? (Math.random() > 0.3 ? 'Done' : 'Overdue') : 'Pending';
    deadlines.push({ title: `${compliance.name} — FY 2025-26`, deadline, status });
  }

  return deadlines;
}

export async function seedDatabase() {
  const supabase = getAdminSupabase();

  // 1. Entity types
  await supabase.from('entity_types').upsert([
    { name: 'Private Limited' }, { name: 'Public Limited' }, { name: 'LLP' },
    { name: 'Partnership' }, { name: 'Sole Proprietorship' },
  ], { onConflict: 'name' });

  // 2. Categories
  const { data: insertedCats } = await supabase.from('compliance_categories')
    .upsert(DEFAULT_CATEGORIES, { onConflict: 'name' }).select();
  const catMap = new Map((insertedCats || []).map(c => [c.name, c.id]));

  // 3. Master filings
  const masterPayloads = MASTER_COMPLIANCES.map(c => ({
    name: c.name,
    category_id: catMap.get(c.category),
    frequency: c.frequency,
    due_date_rule: c.due_date_rule,
    governing_law: c.governing_law,
    penalty_description: c.penalty_description,
    applicable_to: c.applicable_to,
    is_active: true,
  }));
  const { data: insertedMaster } = await supabase.from('master_filings')
    .upsert(masterPayloads, { onConflict: 'name' }).select();
  const masterMap = new Map((insertedMaster || []).map(m => [m.name, m]));

  // 4. Companies
  const { data: existingCompanies } = await supabase.from('companies').select('name');
  const existingNames = new Set((existingCompanies || []).map(c => c.name));
  const newCompanies = DEMO_COMPANIES.filter(c => !existingNames.has(c.name));
  let companies: any[] = existingCompanies || [];

  if (newCompanies.length > 0) {
    const { data: created } = await supabase.from('companies').insert(newCompanies).select();
    companies = [...companies, ...(created || [])];
  } else {
    const { data: allCos } = await supabase.from('companies').select('*');
    companies = allCos || [];
  }

  // 5. Company filings
  const { count: existingFilings } = await supabase
    .from('company_filings').select('*', { count: 'exact', head: true });

  if ((existingFilings || 0) === 0) {
    const allFilings: any[] = [];

    for (const company of companies) {
      const demoCompany = DEMO_COMPANIES.find(d => d.name === company.name);
      if (!demoCompany) continue;

      const relevantCompliances = MASTER_COMPLIANCES.filter(c =>
        c.applicable_to.includes(demoCompany.entity_type)
      );

      for (const compliance of relevantCompliances) {
        const master = masterMap.get(compliance.name);
        if (!master) continue;
        const instances = getRealDeadlines(compliance);
        for (const inst of instances) {
          allFilings.push({
            company_id: company.id,
            master_filing_id: master.id,
            title: inst.title,
            deadline: inst.deadline,
            status: inst.status,
            completed_at: inst.status === 'Done' ? new Date(new Date(inst.deadline).getTime() - 1000 * 60 * 60 * 24 * 2).toISOString() : null,
          });
        }
      }
    }

    // Insert in batches of 200
    for (let i = 0; i < allFilings.length; i += 200) {
      await supabase.from('company_filings').insert(allFilings.slice(i, i + 200));
    }
  }

  return { success: true, message: `Database seeded with ${companies.length} companies and real FY 2025-26 compliance deadlines!` };
}
