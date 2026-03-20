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

const COMPLIANCES = [
  // Income Tax
  {
    name: 'Income Tax Return (ITR) - Audit Cases',
    category: 'Income Tax',
    frequency: 'Annual',
    due_date_rule: '31st October',
    governing_law: 'Income Tax Act, 1961',
    penalty_description: 'Late fee u/s 234F up to Rs 10,000 + Interest u/s 234A',
    applicable_to: ['Private Limited', 'Public Limited', 'LLP'],
  },
  {
    name: 'Income Tax Return (ITR) - Non-Audit Cases',
    category: 'Income Tax',
    frequency: 'Annual',
    due_date_rule: '31st July',
    governing_law: 'Income Tax Act, 1961',
    penalty_description: 'Late fee u/s 234F up to Rs 5,000 + Interest u/s 234A',
    applicable_to: ['Partnership', 'Sole Proprietorship'],
  },
  
  // GST
  {
    name: 'GSTR-1 (Monthly)',
    category: 'GST',
    frequency: 'Monthly',
    due_date_rule: '11th of succeeding month',
    governing_law: 'CGST Act, 2017',
    penalty_description: 'Rs 50 per day (Rs 20 for Nil return)',
    applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'],
  },
  {
    name: 'GSTR-3B (Monthly)',
    category: 'GST',
    frequency: 'Monthly',
    due_date_rule: '20th of succeeding month',
    governing_law: 'CGST Act, 2017',
    penalty_description: 'Rs 50 per day (Rs 20 for Nil return) + Interest @ 18% p.a.',
    applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'],
  },
  {
    name: 'GSTR-9 (Annual Return)',
    category: 'GST',
    frequency: 'Annual',
    due_date_rule: '31st December of next FY',
    governing_law: 'CGST Act, 2017',
    penalty_description: 'Rs 200 per day (100 CGST + 100 SGST) max 0.25% of turnover',
    applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'],
  },
  
  // MCA (RoC)
  {
    name: 'AOC-4 (Financial Statements)',
    category: 'MCA (RoC)',
    frequency: 'Annual',
    due_date_rule: 'Within 30 days of AGM',
    governing_law: 'Companies Act, 2013',
    penalty_description: 'Rs 100 per day of delay',
    applicable_to: ['Private Limited', 'Public Limited'],
  },
  {
    name: 'MGT-7/7A (Annual Return)',
    category: 'MCA (RoC)',
    frequency: 'Annual',
    due_date_rule: 'Within 60 days of AGM',
    governing_law: 'Companies Act, 2013',
    penalty_description: 'Rs 100 per day of delay',
    applicable_to: ['Private Limited', 'Public Limited'],
  },
  {
    name: 'Form 11 (Annual Return of LLP)',
    category: 'MCA (RoC)',
    frequency: 'Annual',
    due_date_rule: '30th May',
    governing_law: 'LLP Act, 2008',
    penalty_description: 'Rs 100 per day of delay',
    applicable_to: ['LLP'],
  },
  {
    name: 'DIR-3 KYC',
    category: 'MCA (RoC)',
    frequency: 'Annual',
    due_date_rule: '30th September',
    governing_law: 'Companies Act, 2013',
    penalty_description: 'Rs 5,000 late fee after due date',
    applicable_to: ['Private Limited', 'Public Limited', 'LLP'],
  },
  
  // TDS
  {
    name: 'TDS Payment',
    category: 'TDS/TCS',
    frequency: 'Monthly',
    due_date_rule: '7th of succeeding month',
    governing_law: 'Income Tax Act, 1961',
    penalty_description: 'Interest @ 1.5% per month or part of a month',
    applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'],
  },
  {
    name: 'TDS Return (Form 24Q, 26Q, 27Q)',
    category: 'TDS/TCS',
    frequency: 'Quarterly',
    due_date_rule: '31st of month following Quarter',
    governing_law: 'Income Tax Act, 1961',
    penalty_description: 'Late fee u/s 234E of Rs 200 per day max up to TDS amount',
    applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'],
  },
  
  // EPFO/ESIC
  {
    name: 'PF Payment & Chalan Cum Return (ECR)',
    category: 'EPFO/ESIC',
    frequency: 'Monthly',
    due_date_rule: '15th of succeeding month',
    governing_law: 'EPF & MP Act, 1952',
    penalty_description: 'Damages ranging from 5% to 25% + Interest @ 12% p.a.',
    applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'],
  },
  {
    name: 'ESIC Payment',
    category: 'EPFO/ESIC',
    frequency: 'Monthly',
    due_date_rule: '15th of succeeding month',
    governing_law: 'ESI Act, 1948',
    penalty_description: 'Interest @ 12% p.a. + Damages up to 25%',
    applicable_to: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship'],
  }
];

export async function seedDatabase() {
  const supabase = getAdminSupabase();

  const entityTypes = [
    { name: 'Private Limited' },
    { name: 'Public Limited' },
    { name: 'LLP' },
    { name: 'Partnership' },
    { name: 'Sole Proprietorship' },
  ];
  await supabase.from('entity_types').upsert(entityTypes, { onConflict: 'name' });

  const { data: insertedCategories } = await supabase.from('compliance_categories')
    .upsert(DEFAULT_CATEGORIES, { onConflict: 'name' }).select();
    
  const catMap = new Map((insertedCategories || []).map(c => [c.name, c.id]));

  const masterPayloads = COMPLIANCES.map(c => ({
    name: c.name,
    category_id: catMap.get(c.category),
    frequency: c.frequency,
    due_date_rule: c.due_date_rule,
    governing_law: c.governing_law,
    penalty_description: c.penalty_description,
    applicable_to: c.applicable_to,
    is_active: true
  }));

  const { data: insertedMaster } = await supabase.from('master_filings')
    .upsert(masterPayloads, { onConflict: 'name' }).select();

  const now = new Date();
  
  const getRandomDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString();
  };

  const filingsToCreate = [];
  
  if (insertedMaster) {
    for (let i = 0; i < insertedMaster.length; i++) {
       const m = insertedMaster[i];
       
       if (i % 4 === 0) {
         filingsToCreate.push({
           master_filing_id: m.id,
           title: m.name + ` (FY 23-24)`,
           deadline: getRandomDate(-Math.floor(Math.random() * 20) - 1),
           status: 'Overdue'
         });
       } else if (i % 4 === 1) {
         filingsToCreate.push({
           master_filing_id: m.id,
           title: m.name + ` (${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()})`,
           deadline: getRandomDate(Math.floor(Math.random() * 15) + 1),
           status: 'Pending'
         });
       } else if (i % 4 === 2) {
         filingsToCreate.push({
           master_filing_id: m.id,
           title: m.name + ` (Previous)`,
           deadline: getRandomDate(-Math.floor(Math.random() * 60) - 10),
           status: 'Done',
           completed_at: getRandomDate(-Math.floor(Math.random() * 60) - 15)
         });
       } else {
         filingsToCreate.push({
           master_filing_id: m.id,
           title: m.name + ` (Future)`,
           deadline: getRandomDate(Math.floor(Math.random() * 100) + 40),
           status: 'Pending'
         });
       }
    }
    
    const { count } = await supabase.from('company_filings').select('*', { count: 'exact', head: true });
    
    if (count === 0) {
      await supabase.from('company_filings').insert(filingsToCreate);
    }
  }

  return { success: true, message: 'Database seeded successfully' };
}
