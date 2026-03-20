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

// Real companies from the Saraogi Group compliance sheet
const REAL_COMPANIES = [
  // Private Limited Companies
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
  // Individuals
  { name: 'Kul Bhushan Saraogi',             entity_type: 'Individual',          color: '#374151' },
  { name: 'Kamlesh Saraogi',                 entity_type: 'Individual',          color: '#374151' },
  { name: 'Jainender Saraogi',               entity_type: 'Individual',          color: '#374151' },
  { name: 'Paras Saraogi',                   entity_type: 'Individual',          color: '#374151' },
  { name: 'Vasu Saraogi',                    entity_type: 'Individual',          color: '#374151' },
  { name: 'Padam Saraogi',                   entity_type: 'Individual',          color: '#374151' },
  { name: 'Hitesh Saraogi',                  entity_type: 'Individual',          color: '#374151' },
  { name: 'Urmila Gupta',                    entity_type: 'Individual',          color: '#374151' },
  // HUFs
  { name: 'Kul Bhushan Saraogi HUF',        entity_type: 'HUF',                 color: '#92400e' },
  { name: 'Jainender Saraogi HUF',           entity_type: 'HUF',                 color: '#92400e' },
  { name: 'Paras Saraogi HUF',               entity_type: 'HUF',                 color: '#92400e' },
  { name: 'S.K. Saraogi HUF',               entity_type: 'HUF',                 color: '#92400e' },
];

// GST registrations - these companies have GST returns (GSTR-1, GSTR-3B)
// SBL has state-wise GST registrations
const GST_ENTITIES = [
  'SBL - Haryana',      // Saraogi Builders Ltd - Haryana GST
  'SBL - Andhra',       // Saraogi Builders Ltd - Andhra GST
  'SBL - TN',           // Saraogi Builders Ltd - Tamil Nadu GST  
  'SBL - Assam',        // Saraogi Builders Ltd - Assam GST
  'Kul Bhushan Saraogi',
  'Kamlesh Saraogi',
  'Jainender Saraogi',
  'Paras Saraogi',
];

// Master compliance templates
const MASTER_COMPLIANCES = [
  // GST
  { name: 'GSTR-1 (Monthly Outward Supplies)',  category: 'GST',        frequency: 'Monthly',   due_date_rule: '11th of succeeding month', governing_law: 'CGST Act, 2017 - Section 37', penalty_description: 'Rs 50/day (Rs 20 for Nil return); max Rs 10,000', applicable_to: ['Public Limited', 'Private Limited', 'Partnership', 'Individual', 'HUF'] },
  { name: 'GSTR-3B (Monthly Summary Return)',   category: 'GST',        frequency: 'Monthly',   due_date_rule: '20th of succeeding month', governing_law: 'CGST Act, 2017 - Section 39', penalty_description: 'Rs 50/day + Interest @ 18% p.a. on tax due', applicable_to: ['Public Limited', 'Private Limited', 'Partnership', 'Individual', 'HUF'] },
  { name: 'GSTR-9 Annual Return FY 2024-25',   category: 'GST',        frequency: 'Annual',    due_date_rule: '31st December 2025', governing_law: 'CGST Act, 2017 - Section 44', penalty_description: 'Rs 200/day (100 CGST + 100 SGST) up to 0.5% of turnover', applicable_to: ['Public Limited', 'Private Limited', 'Partnership'] },
  { name: 'GSTR-9C Reconciliation FY 2024-25', category: 'GST',        frequency: 'Annual',    due_date_rule: '31st December 2025', governing_law: 'CGST Act, 2017 - Section 35(5)', penalty_description: 'Rs 200/day up to 0.5% of turnover', applicable_to: ['Public Limited', 'Private Limited'] },

  // TDS
  { name: 'TDS Return Q1 (Apr–Jun 2025) Form 26Q', category: 'TDS/TCS', frequency: 'Quarterly', due_date_rule: '31st July 2025', governing_law: 'Income Tax Act, 1961 - Section 200', penalty_description: 'Rs 200/day u/s 234E, max up to TDS amount', applicable_to: ['Public Limited', 'Private Limited', 'Partnership'] },
  { name: 'TDS Return Q2 (Jul–Sep 2025) Form 26Q', category: 'TDS/TCS', frequency: 'Quarterly', due_date_rule: '31st October 2025', governing_law: 'Income Tax Act, 1961 - Section 200', penalty_description: 'Rs 200/day u/s 234E, max up to TDS amount', applicable_to: ['Public Limited', 'Private Limited', 'Partnership'] },
  { name: 'TDS Return Q3 (Oct–Dec 2025) Form 26Q', category: 'TDS/TCS', frequency: 'Quarterly', due_date_rule: '31st January 2026', governing_law: 'Income Tax Act, 1961 - Section 200', penalty_description: 'Rs 200/day u/s 234E, max up to TDS amount', applicable_to: ['Public Limited', 'Private Limited', 'Partnership'] },
  { name: 'TDS Return Q4 (Jan–Mar 2026) Form 26Q', category: 'TDS/TCS', frequency: 'Quarterly', due_date_rule: '31st May 2026', governing_law: 'Income Tax Act, 1961 - Section 200', penalty_description: 'Rs 200/day u/s 234E, max up to TDS amount', applicable_to: ['Public Limited', 'Private Limited', 'Partnership'] },

  // Income Tax
  { name: 'ITR Filing FY 2024-25 (Audit Cases)',   category: 'Income Tax', frequency: 'Annual', due_date_rule: '31st October 2025', governing_law: 'Income Tax Act, 1961 - Section 139(1)', penalty_description: 'Late fee u/s 234F: Rs 5,000 + Interest @ 1% p.m. u/s 234A', applicable_to: ['Public Limited', 'Private Limited', 'Partnership'] },
  { name: 'ITR Filing FY 2024-25 (Individuals & HUF)', category: 'Income Tax', frequency: 'Annual', due_date_rule: '15th September 2025 (extended)', governing_law: 'Income Tax Act, 1961 - Section 139(1)', penalty_description: 'Late fee u/s 234F: Rs 5,000. Interest @ 1% p.m. u/s 234A', applicable_to: ['Individual', 'HUF'] },
  { name: 'Tax Audit Report Form 3CA/3CB FY 2024-25', category: 'Income Tax', frequency: 'Annual', due_date_rule: '30th September 2025', governing_law: 'Income Tax Act, 1961 - Section 44AB', penalty_description: '0.5% of turnover, max Rs 1,50,000 u/s 271B', applicable_to: ['Public Limited', 'Private Limited', 'Partnership'] },
  { name: 'Advance Tax Q1 (15% by 15 Jun 2025)',   category: 'Income Tax', frequency: 'Annual', due_date_rule: '15th June 2025', governing_law: 'Income Tax Act, 1961 - Section 208', penalty_description: 'Interest @ 1% p.m. u/s 234B & 234C', applicable_to: ['Public Limited', 'Private Limited', 'Partnership', 'Individual', 'HUF'] },
  { name: 'Advance Tax Q2 (45% by 15 Sep 2025)',   category: 'Income Tax', frequency: 'Annual', due_date_rule: '15th September 2025', governing_law: 'Income Tax Act, 1961 - Section 208', penalty_description: 'Interest @ 1% p.m. u/s 234B & 234C', applicable_to: ['Public Limited', 'Private Limited', 'Partnership', 'Individual', 'HUF'] },
  { name: 'Advance Tax Q3 (75% by 15 Dec 2025)',   category: 'Income Tax', frequency: 'Annual', due_date_rule: '15th December 2025', governing_law: 'Income Tax Act, 1961 - Section 208', penalty_description: 'Interest @ 1% p.m. u/s 234B & 234C', applicable_to: ['Public Limited', 'Private Limited', 'Partnership', 'Individual', 'HUF'] },
  { name: 'Advance Tax Q4 (100% by 15 Mar 2026)', category: 'Income Tax', frequency: 'Annual', due_date_rule: '15th March 2026', governing_law: 'Income Tax Act, 1961 - Section 208', penalty_description: 'Interest @ 1% p.m. u/s 234B & 234C', applicable_to: ['Public Limited', 'Private Limited', 'Partnership', 'Individual', 'HUF'] },

  // MCA / RoC
  { name: 'AOC-4 Annual Financial Statements FY 2024-25',  category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '31st December 2025 (extended)', governing_law: 'Companies Act, 2013 - Section 137', penalty_description: 'Rs 100/day of default; officers in default liable to fine up to Rs 5 lakh', applicable_to: ['Public Limited', 'Private Limited'] },
  { name: 'MGT-7/7A Annual Return FY 2024-25',    category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '31st December 2025 (extended)', governing_law: 'Companies Act, 2013 - Section 92', penalty_description: 'Rs 100/day; officers in default liable', applicable_to: ['Public Limited', 'Private Limited'] },
  { name: 'MGT-14 Board Resolution Filing',        category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '30th September 2025', governing_law: 'Companies Act, 2013 - Section 117', penalty_description: 'Rs 5 lakh on company + Rs 1 lakh on every officer in default', applicable_to: ['Public Limited'] },
  { name: 'DPT-3 Return of Deposits FY 2024-25',  category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '30th June 2025', governing_law: 'Companies Act, 2013 - Section 73', penalty_description: 'Fine up to Rs 5 crore on company and officers', applicable_to: ['Public Limited', 'Private Limited'] },
  { name: 'PAS-6 Share Capital Reconciliation',    category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '29th November 2025 (H1) / 30th May 2026 (H2)', governing_law: 'Companies Act, 2013 - Rule 9A', penalty_description: 'Penalty on company and defaulting officers', applicable_to: ['Public Limited'] },
  { name: 'DIR-3 KYC Director KYC FY 2025-26',    category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '30th September 2025', governing_law: 'Companies Act, 2013 - Rule 12A', penalty_description: 'Rs 5,000 late fee; DIN deactivated', applicable_to: ['Public Limited', 'Private Limited'] },
  { name: 'MSME-1 Outstanding Payment Return H1',  category: 'MCA (RoC)', frequency: 'Annual', due_date_rule: '31st October 2025 (for Apr–Sep 2025)', governing_law: 'Companies Act, 2013 - Section 405', penalty_description: 'Rs 25,000 fine on company and officers', applicable_to: ['Public Limited', 'Private Limited'] },

  // EPFO/ESIC (monthly - for companies with employees)
  { name: 'PF Monthly Payment & ECR Filing',       category: 'EPFO/ESIC', frequency: 'Monthly', due_date_rule: '15th of succeeding month', governing_law: 'EPF & MP Act, 1952 - Section 6', penalty_description: 'Damages 5%-25% + Interest @ 12% p.a.', applicable_to: ['Public Limited', 'Private Limited', 'Partnership'] },
  { name: 'ESIC Monthly Contribution',             category: 'EPFO/ESIC', frequency: 'Monthly', due_date_rule: '15th of succeeding month', governing_law: 'ESI Act, 1948 - Section 40', penalty_description: 'Interest @ 12% p.a. + Damages up to 25%', applicable_to: ['Public Limited', 'Private Limited', 'Partnership'] },
];

// Real deadline dates extracted from the compliance sheet
function getComplianceFilings(masterName: string, masterDeadlineRule: string) {
  const filings: Array<{ title: string; deadline: string; status: string; period?: string }> = [];

  if (masterName.includes('GSTR-1') && masterName.includes('Monthly')) {
    const months = [
      { label: 'Apr 2025', deadline: '2025-05-11', done: true },
      { label: 'May 2025', deadline: '2025-06-11', done: true },
      { label: 'Jun 2025', deadline: '2025-07-11', done: true },
      { label: 'Jul 2025', deadline: '2025-08-11', done: true },
      { label: 'Aug 2025', deadline: '2025-09-11', done: true },
      { label: 'Sep 2025', deadline: '2025-10-11', done: true },
      { label: 'Oct 2025', deadline: '2025-11-11', done: true },
      { label: 'Nov 2025', deadline: '2025-12-11', done: true },
      { label: 'Dec 2025', deadline: '2026-01-11', done: true },
      { label: 'Jan 2026', deadline: '2026-02-11', done: true }, // Filed per sheet
      { label: 'Feb 2026', deadline: '2026-03-11', done: false },
      { label: 'Mar 2026', deadline: '2026-04-11', done: false },
    ];
    months.forEach(m => {
      filings.push({ title: `GSTR-1 — ${m.label}`, deadline: m.deadline, status: m.done ? 'Done' : 'Pending', period: m.label });
    });
  } else if (masterName.includes('GSTR-3B')) {
    const months = [
      { label: 'Apr 2025', deadline: '2025-05-20', done: true },
      { label: 'May 2025', deadline: '2025-06-20', done: true },
      { label: 'Jun 2025', deadline: '2025-07-20', done: true },
      { label: 'Jul 2025', deadline: '2025-08-20', done: true },
      { label: 'Aug 2025', deadline: '2025-09-20', done: true },
      { label: 'Sep 2025', deadline: '2025-10-20', done: true },
      { label: 'Oct 2025', deadline: '2025-11-20', done: true },
      { label: 'Nov 2025', deadline: '2025-12-20', done: true },
      { label: 'Dec 2025', deadline: '2026-01-20', done: true },
      { label: 'Jan 2026', deadline: '2026-02-20', done: true }, // Filed per sheet
      { label: 'Feb 2026', deadline: '2026-03-20', done: false },
      { label: 'Mar 2026', deadline: '2026-04-20', done: false },
    ];
    months.forEach(m => {
      filings.push({ title: `GSTR-3B — ${m.label}`, deadline: m.deadline, status: m.done ? 'Done' : 'Pending', period: m.label });
    });
  } else if (masterName.includes('GSTR-9 Annual')) {
    filings.push({ title: 'GSTR-9 Annual Return — FY 2024-25', deadline: '2025-12-31', status: 'Done' });
  } else if (masterName.includes('GSTR-9C')) {
    filings.push({ title: 'GSTR-9C Reconciliation — FY 2024-25', deadline: '2025-12-31', status: 'Done' });
  } else if (masterName.includes('TDS Return Q1')) {
    filings.push({ title: 'TDS Return Q1 FY 2025-26 (Apr–Jun 2025)', deadline: '2025-07-31', status: 'Done', period: 'Q1 FY 2025-26' });
  } else if (masterName.includes('TDS Return Q2')) {
    filings.push({ title: 'TDS Return Q2 FY 2025-26 (Jul–Sep 2025)', deadline: '2025-10-31', status: 'Done', period: 'Q2 FY 2025-26' });
  } else if (masterName.includes('TDS Return Q3')) {
    filings.push({ title: 'TDS Return Q3 FY 2025-26 (Oct–Dec 2025)', deadline: '2026-01-31', status: 'Done', period: 'Q3 FY 2025-26' });
  } else if (masterName.includes('TDS Return Q4')) {
    filings.push({ title: 'TDS Return Q4 FY 2025-26 (Jan–Mar 2026)', deadline: '2026-05-31', status: 'Pending', period: 'Q4 FY 2025-26' });
  } else if (masterName.includes('ITR Filing FY 2024-25 (Individuals')) {
    filings.push({ title: 'ITR FY 2024-25 (Individuals & HUF)', deadline: '2025-09-15', status: 'Done' });
  } else if (masterName.includes('ITR Filing FY 2024-25 (Audit')) {
    filings.push({ title: 'ITR FY 2024-25 (Audit)', deadline: '2025-10-31', status: 'Done' });
  } else if (masterName.includes('Tax Audit')) {
    filings.push({ title: 'Tax Audit Report Form 3CA/3CB — FY 2024-25', deadline: '2025-09-30', status: 'Done' });
  } else if (masterName.includes('Advance Tax Q1')) {
    filings.push({ title: 'Advance Tax Q1 FY 2025-26 (15%)', deadline: '2025-06-15', status: 'Done' });
  } else if (masterName.includes('Advance Tax Q2')) {
    filings.push({ title: 'Advance Tax Q2 FY 2025-26 (45%)', deadline: '2025-09-15', status: 'Done' });
  } else if (masterName.includes('Advance Tax Q3')) {
    filings.push({ title: 'Advance Tax Q3 FY 2025-26 (75%)', deadline: '2025-12-15', status: 'Done' });
  } else if (masterName.includes('Advance Tax Q4')) {
    filings.push({ title: 'Advance Tax Q4 FY 2025-26 (100%)', deadline: '2026-03-15', status: 'Pending' });
  } else if (masterName.includes('AOC-4')) {
    filings.push({ title: 'AOC-4 Annual Financial Statements — FY 2024-25', deadline: '2025-12-31', status: 'Done' });
  } else if (masterName.includes('MGT-7')) {
    filings.push({ title: 'MGT-7/7A Annual Return — FY 2024-25', deadline: '2025-12-31', status: 'Done' });
  } else if (masterName.includes('MGT-14')) {
    filings.push({ title: 'MGT-14 Board Resolution Filing', deadline: '2025-09-30', status: 'Done' });
  } else if (masterName.includes('DPT-3')) {
    filings.push({ title: 'DPT-3 Return of Deposits — FY 2024-25', deadline: '2025-06-30', status: 'Done' });
  } else if (masterName.includes('PAS-6')) {
    filings.push({ title: 'PAS-6 Share Capital Reconciliation H1 (Apr–Sep 2025)', deadline: '2025-11-29', status: 'Done' });
    filings.push({ title: 'PAS-6 Share Capital Reconciliation H2 (Oct 2025–Mar 2026)', deadline: '2026-05-30', status: 'Pending' });
  } else if (masterName.includes('DIR-3')) {
    filings.push({ title: 'DIR-3 KYC — FY 2025-26', deadline: '2025-09-30', status: 'Done' });
  } else if (masterName.includes('MSME-1')) {
    filings.push({ title: 'MSME-1 Outstanding Payments H1 2025', deadline: '2025-10-31', status: 'Done' });
    filings.push({ title: 'MSME-1 Outstanding Payments H2 2025', deadline: '2026-04-30', status: 'Pending' });
  } else if (masterName.includes('PF Monthly')) {
    const months = [
      { label: 'Apr 2025', deadline: '2025-05-15', done: true },
      { label: 'May 2025', deadline: '2025-06-15', done: true },
      { label: 'Jun 2025', deadline: '2025-07-15', done: true },
      { label: 'Jul 2025', deadline: '2025-08-15', done: true },
      { label: 'Aug 2025', deadline: '2025-09-15', done: true },
      { label: 'Sep 2025', deadline: '2025-10-15', done: true },
      { label: 'Oct 2025', deadline: '2025-11-15', done: true },
      { label: 'Nov 2025', deadline: '2025-12-15', done: true },
      { label: 'Dec 2025', deadline: '2026-01-15', done: true },
      { label: 'Jan 2026', deadline: '2026-02-15', done: true },
      { label: 'Feb 2026', deadline: '2026-03-15', done: false },
      { label: 'Mar 2026', deadline: '2026-04-15', done: false },
    ];
    months.forEach(m => {
      filings.push({ title: `PF Payment & ECR — ${m.label}`, deadline: m.deadline, status: m.done ? 'Done' : 'Pending' });
    });
  } else if (masterName.includes('ESIC')) {
    const months = [
      { label: 'Apr 2025', deadline: '2025-05-15', done: true },
      { label: 'May 2025', deadline: '2025-06-15', done: true },
      { label: 'Jun 2025', deadline: '2025-07-15', done: true },
      { label: 'Jul 2025', deadline: '2025-08-15', done: true },
      { label: 'Aug 2025', deadline: '2025-09-15', done: true },
      { label: 'Sep 2025', deadline: '2025-10-15', done: true },
      { label: 'Oct 2025', deadline: '2025-11-15', done: true },
      { label: 'Nov 2025', deadline: '2025-12-15', done: true },
      { label: 'Dec 2025', deadline: '2026-01-15', done: true },
      { label: 'Jan 2026', deadline: '2026-02-15', done: true },
      { label: 'Feb 2026', deadline: '2026-03-15', done: false },
      { label: 'Mar 2026', deadline: '2026-04-15', done: false },
    ];
    months.forEach(m => {
      filings.push({ title: `ESIC Contribution — ${m.label}`, deadline: m.deadline, status: m.done ? 'Done' : 'Pending' });
    });
  }

  return filings;
}

// Which compliance types apply to which entity type
function getApplicableCompliances(entityType: string, companyName: string) {
  const applicable: string[] = [];

  if (entityType === 'Individual' || entityType === 'HUF') {
    // Individuals and HUFs only get ITR and Advance Tax
    return ['ITR Filing FY 2024-25 (Individuals & HUF)', 'Advance Tax Q1', 'Advance Tax Q2', 'Advance Tax Q3', 'Advance Tax Q4'];
  }

  if (entityType === 'Public Limited' || entityType === 'Private Limited') {
    applicable.push(...[
      'GSTR-1 (Monthly Outward Supplies)',
      'GSTR-3B (Monthly Summary Return)',
      'GSTR-9 Annual Return FY 2024-25',
      'GSTR-9C Reconciliation FY 2024-25',
      'TDS Return Q1', 'TDS Return Q2', 'TDS Return Q3', 'TDS Return Q4',
      'ITR Filing FY 2024-25 (Audit Cases)',
      'Tax Audit Report Form 3CA/3CB FY 2024-25',
      'Advance Tax Q1', 'Advance Tax Q2', 'Advance Tax Q3', 'Advance Tax Q4',
      'AOC-4 Annual Financial Statements FY 2024-25',
      'MGT-7/7A Annual Return FY 2024-25',
      'DPT-3 Return of Deposits FY 2024-25',
      'DIR-3 KYC Director KYC FY 2025-26',
      'MSME-1 Outstanding Payment Return H1',
      'PF Monthly Payment & ECR Filing',
      'ESIC Monthly Contribution',
    ]);
    if (entityType === 'Public Limited') {
      applicable.push('MGT-14 Board Resolution Filing', 'PAS-6 Share Capital Reconciliation');
    }
  }

  if (entityType === 'Partnership') {
    applicable.push(...[
      'GSTR-1 (Monthly Outward Supplies)',
      'GSTR-3B (Monthly Summary Return)',
      'GSTR-9 Annual Return FY 2024-25',
      'TDS Return Q1', 'TDS Return Q2', 'TDS Return Q3', 'TDS Return Q4',
      'ITR Filing FY 2024-25 (Audit Cases)',
      'Tax Audit Report Form 3CA/3CB FY 2024-25',
      'Advance Tax Q1', 'Advance Tax Q2', 'Advance Tax Q3', 'Advance Tax Q4',
      'PF Monthly Payment & ECR Filing',
      'ESIC Monthly Contribution',
    ]);
  }

  return applicable;
}

export async function seedDatabase() {
  const supabase = getAdminSupabase();

  // 1. Entity types - extended to include HUF and Individual
  await supabase.from('entity_types').upsert([
    { name: 'Private Limited' }, { name: 'Public Limited' }, { name: 'LLP' },
    { name: 'Partnership' }, { name: 'Sole Proprietorship' },
    { name: 'Individual' }, { name: 'HUF' },
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

  // 4. Companies — insert real Saraogi group companies
  const { data: initialCompanies } = await supabase.from('companies').select('*');
  
  // Cleanup: Delete the previous demo companies if they exist
  const DEMO_NAMES = ['Saraogi Industries Pvt Ltd', 'Pinnacle Solutions Pvt Ltd', 'Meridian Global Ltd', 'Vertex Capital LLP', 'NexGen Tech LLP', 'Arjun & Sons Trading Co', 'Riya Enterprises', 'Kapoor Consultants', 'Sharma Logistics', 'Bharat Infrastructure Pvt Ltd'];
  const demoIds = (initialCompanies || [])
    .filter(c => DEMO_NAMES.includes(c.name))
    .map(c => c.id);
    
  if (demoIds.length > 0) {
    await supabase.from('company_filings').delete().in('company_id', demoIds);
    await supabase.from('companies').delete().in('id', demoIds);
    console.log(`Deleted ${demoIds.length} demo companies.`);
  }

  // RE-FETCH existing companies after potential deletion
  const { data: currentCompanies, error: fetchError } = await supabase.from('companies').select('name, id, entity_type');
  if (fetchError) throw fetchError;
  
  const existingNames = new Set((currentCompanies || []).map(c => c.name));
  const newCompanies = REAL_COMPANIES.filter(c => !existingNames.has(c.name));
  let allCompanies: any[] = currentCompanies || [];

  if (newCompanies.length > 0) {
    console.log(`Inserting ${newCompanies.length} new real companies...`);
    const { data: created, error: insertError } = await supabase.from('companies').insert(newCompanies).select();
    if (insertError) {
      console.error('Error inserting companies:', insertError);
      throw new Error(`Company insertion failed: ${insertError.message}. Did you run the SQL migration?`);
    }
    allCompanies = [...allCompanies, ...(created || [])];
  }

  if (allCompanies.length === 0) {
    return { success: false, message: 'No companies found or created.' };
  }

  // RE-SEED FILINGS: To ensure real data is fresh, we clear all filings for these entities first
  const allCompanyIds = allCompanies.map(c => c.id);
  console.log(`Clearing existing filings for ${allCompanyIds.length} companies to ensure fresh data...`);
  await supabase.from('company_filings').delete().in('company_id', allCompanyIds);

  // 5. Company Filings — generate real filings for EACH company
  const allNewFilings: any[] = [];
  console.log(`Generating filings for ${allCompanies.length} companies from Excel data...`);

  for (const company of allCompanies) {
    const applicableKeys = getApplicableCompliances(company.entity_type, company.name);

    for (const masterKey of applicableKeys) {
      let master: any = null;
      for (const [name, m] of masterMap.entries()) {
        if (name.startsWith(masterKey) || name.includes(masterKey)) {
          master = m;
          break;
        }
      }
      if (!master) continue;

      const instances = getComplianceFilings(master.name, master.due_date_rule);
      for (const inst of instances) {
        allNewFilings.push({
          company_id: company.id,
          master_filing_id: master.id,
          title: inst.title,
          deadline: inst.deadline,
          status: inst.status,
          period: inst.period || null,
          completed_at: inst.status === 'Done' ? new Date(new Date(inst.deadline).getTime() - 1000 * 60 * 60 * 24 * 3).toISOString() : null,
        });
      }
    }
  }

  if (allNewFilings.length > 0) {
    console.log(`Inserting ${allNewFilings.length} filings in batches...`);
    for (let i = 0; i < allNewFilings.length; i += 200) {
      const { error: batchError } = await supabase.from('company_filings').insert(allNewFilings.slice(i, i + 200));
      if (batchError) {
        console.error('Batch insert error:', batchError);
        throw batchError;
      }
    }
    return { success: true, message: `FRESH SEED SUCCESS: Imported ${allCompanies.length} companies and ${allNewFilings.length} real FY 25-26 compliance filings!` };
  }

  return { success: true, message: `Entities registered (${allCompanies.length}), but no filings were applicable based on their entity types.` };
}



