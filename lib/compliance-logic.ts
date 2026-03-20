import { addMonths, format, startOfMonth, subMonths, getYear, getMonth } from 'date-fns';

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
 * TRULY DYNAMIC: Generates based on the current date, ensuring perpetual automation.
 */
export function getComplianceInstances(masterName: string, frequency: string, dueDateRule: string) {
  const filings: { title: string; deadline: string; status: string; period?: string }[] = [];
  const now = new Date();
  
  // Calculate Current Financial Year (Starts April)
  const currentYear = getYear(now);
  const currentMonth = getMonth(now); // 0-indexed
  const fiscalStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  // 1. ANNUAL FILINGS (ITR, ROC, GSTR-9)
  if (frequency === 'Annual' || masterName.includes('GSTR-9')) {
    // Generate for Last, Current, and Next Financial Year
    for (let offset = -1; offset <= 1; offset++) {
      const year = fiscalStartYear + offset;
      const label = `FY ${year}-${(year + 1).toString().slice(-2)}`;
      
      let deadline = `${year + 1}-12-31`;
      
      if (masterName.includes('ITR') || masterName.includes('Income Tax')) {
        deadline = (masterName.includes('Individual') || masterName.includes('HUF') || masterName.includes('Partnership')) 
          ? `${year + 1}-09-15` 
          : `${year + 1}-10-31`;
      } else if (masterName.includes('DPT-3')) {
        deadline = `${year + 1}-06-30`;
      } else if (masterName.includes('DIR-3')) {
        deadline = `${year + 1}-09-30`;
      } else if (masterName.includes('AOC-4') || masterName.includes('MGT-7') || masterName.includes('GSTR-9')) {
        deadline = `${year + 1}-12-31`;
      }
      
      // Safety check: if today's date is "Mar 2026", and we are calculating FY 24-25, it's historical
      const deadlineDate = new Date(deadline);
      const isHistorical = deadlineDate < now;

      filings.push({ 
        title: `${masterName} — ${label}`, 
        deadline, 
        status: isHistorical ? 'Done' : 'Pending',
        period: label
      });
    }
  } 
  
  // 2. QUARTERLY FILINGS (TDS, Advance Tax)
  else if (frequency === 'Quarterly') {
    // Generate for Current and Next Financial Year
    for (let offset = 0; offset <= 1; offset++) {
      const startYear = fiscalStartYear + offset;
      const yearSuffix = `${startYear}-${(startYear + 1).toString().slice(-2)}`;
      
      const qs = [
        { label: `Q1 ${yearSuffix}`, deadline: `${startYear}-07-31` },
        { label: `Q2 ${yearSuffix}`, deadline: `${startYear}-10-31` },
        { label: `Q3 ${yearSuffix}`, deadline: `${startYear + 1}-01-31` },
        { label: `Q4 ${yearSuffix}`, deadline: `${startYear + 1}-05-31` },
      ];

      qs.forEach(q => {
        const deadlineDate = new Date(q.deadline);
        filings.push({
          title: `${masterName} — ${q.label}`,
          deadline: q.deadline,
          status: deadlineDate < now ? 'Done' : 'Pending',
          period: q.label
        });
      });
    }
  }

  // 3. MONTHLY FILINGS (GST, PF, ESIC)
  else if (frequency === 'Monthly') {
    // Generate 12 months window: 3 months back (historical) + current + 8 months ahead
    const startDate = subMonths(startOfMonth(now), 3);
    
    for (let i = 0; i < 12; i++) {
      const periodDate = addMonths(startDate, i);
      const periodLabel = format(periodDate, 'MMM yyyy');
      
      // Deadline is in the NEXT month
      const deadlineMonth = addMonths(periodDate, 1);
      
      let day = 20;
      const dayMatch = dueDateRule.match(/(\d+)(st|nd|rd|th)/i);
      if (dayMatch) {
        day = parseInt(dayMatch[1]);
      } else if (masterName.includes('GSTR-1')) {
        day = 11;
      }
      
      const deadline = format(new Date(deadlineMonth.getFullYear(), deadlineMonth.getMonth(), day), 'yyyy-MM-dd');
      const isHistorical = periodDate < startOfMonth(now);
      
      filings.push({
        title: `${masterName} — ${periodLabel}`,
        deadline,
        status: isHistorical ? 'Done' : 'Pending',
        period: periodLabel
      });
    }
  }

  return filings;
}
