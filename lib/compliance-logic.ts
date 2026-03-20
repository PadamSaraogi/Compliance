import { addMonths, format } from 'date-fns';

/**
 * Maps Entity Type codes to their standard labels
 */
export const ENTITY_TYPE_MAP: Record<string, string> = {
  'PVT': 'Private Limited',
  'PUB': 'Public Limited',
  'LLP': 'LLP',
  'PART': 'Partnership',
  'SOLE': 'Sole Proprietorship',
  'INDIV': 'Individual',
  'HUF': 'HUF'
};

/**
 * Calculates deadline instances based on frequency and rule
 * Includes EXACT historical dates from the user's Saraogi Group spreadsheet
 */
export function getComplianceInstances(masterName: string, frequency: string, dueDateRule: string) {
  const filings: { title: string; deadline: string; status: string; period?: string }[] = [];
  const now = new Date();

  // 1. ANNUAL FILINGS (ITR, ROC)
  if (frequency === 'Annual' || masterName.includes('GSTR-9')) {
    const years = [
      { label: 'FY 2024-25', year: 2024, done: true },
      { label: 'FY 2025-26', year: 2025, done: false },
    ];
    
    years.forEach(y => {
      let deadline = '2025-12-31';
      
      // Exact Dates from User Image
      if (masterName.includes('ITR') || masterName.includes('Income Tax')) {
        deadline = (masterName.includes('Individual') || masterName.includes('HUF') || masterName.includes('Partnership')) 
          ? `${y.year + 1}-09-15` 
          : `${y.year + 1}-10-31`;
      } else if (masterName.includes('DPT-3')) {
        deadline = `${y.year + 1}-06-30`;
      } else if (masterName.includes('DIR-3')) {
        deadline = `${y.year + 1}-09-30`;
      } else if (masterName.includes('AOC-4') || masterName.includes('MGT-7') || masterName.includes('GSTR-9')) {
        deadline = `${y.year + 1}-12-31`;
      }
      
      filings.push({ 
        title: `${masterName} — ${y.label}`, 
        deadline, 
        status: y.done ? 'Done' : 'Pending',
        period: y.label
      });
    });
  } 
  
  // 2. QUARTERLY FILINGS (TDS, Advance Tax)
  else if (frequency === 'Quarterly') {
    const quarters = [
      { label: 'Q1 2025-26', deadline: '2025-07-31', done: true },
      { label: 'Q2 2025-26', deadline: '2025-10-31', done: true },
      { label: 'Q3 2025-26', deadline: '2026-01-31', done: true },
      { label: 'Q4 2025-26', deadline: '2026-05-31', done: false },
    ];

    quarters.forEach(q => {
      filings.push({
        title: `${masterName} — ${q.label}`,
        deadline: q.deadline,
        status: q.done ? 'Done' : 'Pending',
        period: q.label
      });
    });
  }

  // 3. MONTHLY FILINGS (GST, PF)
  else if (frequency === 'Monthly') {
    // Generate Jan, Feb, Mar 2026
    const months = [
      { label: 'Jan 2026', done: true },
      { label: 'Feb 2026', done: false },
      { label: 'Mar 2026', done: false },
    ];

    months.forEach(m => {
       // Manual parse for Jan 2026
       let month = 0; let year = 2026;
       if (m.label.startsWith('Jan')) month = 0;
       if (m.label.startsWith('Feb')) month = 1;
       if (m.label.startsWith('Mar')) month = 2;

       const nextMonth = new Date(year, month + 1, 1);
      
      let day = 20;
      // Extract day from rule (e.g. "1st of every month", "2nd of every month", "11th")
      const dayMatch = dueDateRule.match(/(\d+)(st|nd|rd|th)/i);
      if (dayMatch) {
        day = parseInt(dayMatch[1]);
      } else if (masterName.includes('GSTR-1')) {
        day = 11;
      }
      
      const deadline = format(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day), 'yyyy-MM-dd');
      
      filings.push({
        title: `${masterName} — ${m.label}`,
        deadline,
        status: m.done ? 'Done' : 'Pending',
        period: m.label
      });
    });
  }

  return filings;
}
