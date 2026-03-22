import { addMonths, format, startOfMonth, subMonths, getYear, getMonth } from 'date-fns';

/**
 * Mapping of entity type codes to human-readable names.
 */
export const ENTITY_TYPE_MAP: Record<string, string> = {
  'PVT': 'Private Limited',
  'PUB': 'Public Limited',
  'LLP': 'LLP',
  'PART': 'Partnership',
  'SOLE': 'Sole Proprietorship',
  'INDIV': 'Individual',
  'HUF': 'HUF',
  'SBL SUB': 'SBL Subsidiary'
};

/**
 * Calculates deadline instances based on frequency and rule
 * TRULY DYNAMIC: Generates based on the current date, ensuring perpetual automation.
 */
export function getComplianceInstances(masterName: string, frequency: string, dueDateRule: string, oneTimeDate?: string) {
  const filings: { title: string; deadline: string; status: string; period?: string }[] = [];
  const now = new Date();
  
  // 0. ONE-TIME FILINGS
  if (frequency === 'Once' && oneTimeDate) {
    const deadlineDate = new Date(oneTimeDate);
    filings.push({
      title: masterName,
      deadline: oneTimeDate,
      status: deadlineDate < now ? 'Done' : 'Pending',
      period: 'One-time'
    });
    return filings;
  }

  // Calculate Current Financial Year (Starts April)
  const currentYear = getYear(now);
  const currentMonth = getMonth(now); // 0-indexed
  const fiscalStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  // 1. ANNUAL FILINGS
  if (frequency === 'Annual' || masterName.includes('GSTR-9')) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let monthIdx = 11; // Default Dec
    let day = 31;

    // Parse Month from Rule (e.g. "31st July")
    const monthMatch = months.find(m => dueDateRule?.includes(m));
    if (monthMatch) monthIdx = months.indexOf(monthMatch);

    // Parse Day from Rule
    const dayMatch = dueDateRule ? dueDateRule.match(/(\d+)(st|nd|rd|th)/i) : null;
    if (dayMatch) day = parseInt(dayMatch[1]);

    // Generate for Last, Current, and Next Financial Year
    for (let offset = -1; offset <= 1; offset++) {
      const year = fiscalStartYear + offset;
      const label = `FY ${year}-${(year + 1).toString().slice(-2)}`;
      
      // Calculate deadline year. Usually deadlines for a FY are in the FOLLOWING calendar year.
      // e.g. FY 24-25 -> 31st July 2025.
      const deadlineYear = year + 1;
      
      const deadline = format(new Date(deadlineYear, monthIdx, day), 'yyyy-MM-dd');
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
  
  // 2. QUARTERLY FILINGS
  else if (frequency === 'Quarterly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let day = 15; // Default 15th
    const dayMatch = dueDateRule ? dueDateRule.match(/(\d+)(st|nd|rd|th)/i) : null;
    if (dayMatch) day = parseInt(dayMatch[1]);

    // Check for custom start month (e.g. "2nd February")
    const startMonthMatch = months.find(m => dueDateRule?.includes(m));
    const startMonthIdx = startMonthMatch ? months.indexOf(startMonthMatch) : -1;

    // Generate for Current and Next Financial Year
    for (let offset = 0; offset <= 1; offset++) {
      const startYear = fiscalStartYear + offset;
      const yearSuffix = `${startYear}-${(startYear + 1).toString().slice(-2)}`;
      
      let baseQuarters: { label: string; month: number; year: number }[] = [];
      
      if (startMonthIdx !== -1) {
        // Custom cycle starting from the detected month
        baseQuarters = [0, 3, 6, 9].map((mOff, i) => {
          const m = (startMonthIdx + mOff) % 12;
          const y = startYear + Math.floor((startMonthIdx + mOff) / 12);
          return { label: `Q${i+1} ${yearSuffix}`, month: m, year: y };
        });
      } else {
        // Standard Indian Fiscal Quarters
        baseQuarters = [
          { label: `Q1 ${yearSuffix}`, month: 6, year: startYear },      // July 
          { label: `Q2 ${yearSuffix}`, month: 9, year: startYear },      // Oct
          { label: `Q3 ${yearSuffix}`, month: 0, year: startYear + 1 },  // Jan
          { label: `Q4 ${yearSuffix}`, month: 4, year: startYear + 1 },  // May (typical for TDS/ROC)
        ];
      }

      baseQuarters.forEach(q => {
        const deadline = format(new Date(q.year, q.month, day), 'yyyy-MM-dd');
        const deadlineDate = new Date(deadline);
        filings.push({
          title: `${masterName} — ${q.label}`,
          deadline,
          status: deadlineDate < now ? 'Done' : 'Pending',
          period: q.label
        });
      });
    }
  }

  // 3. MONTHLY FILINGS
  else if (frequency === 'Monthly') {
    const startDate = subMonths(startOfMonth(now), 3);
    
    for (let i = 0; i < 12; i++) {
      const periodDate = addMonths(startDate, i);
      const periodLabel = format(periodDate, 'MMM yyyy');
      const deadlineMonth = addMonths(periodDate, 1);
      
      let day = 20;
      const dayMatch = dueDateRule ? dueDateRule.match(/(\d+)(st|nd|rd|th)/i) : null;
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
