import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id');

    const supabase = getAdminSupabase();
    
    // Improved select to ensure nested joins work correctly with PostgREST
    let query = supabase
      .from('company_filings')
      .select(`
        *,
        master_filings (
          id,
          compliance_categories (
            name,
            color
          )
        )
      `, { count: 'exact' })
      .neq('status', 'NA');

    if (companyId && companyId !== 'all') {
      query = query.eq('company_id', companyId);
    }

    const { data: filings, error, count } = await query.limit(5000);
      
    if (error) throw error;

    const now = new Date();
    now.setHours(0,0,0,0);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    // Financial Year Start (April 1st)
    const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(currentYear, 3, 1);

    let totalCountAllTime = count || 0;
    let overdueCount = 0;
    let due30Days = 0;
    let completedThisFY = 0;
    let totalEligibleThisFY = 0;
    
    const categories: Record<string, { total: number; completed: number; color: string }> = {};

    filings.forEach((f: any) => {
      const deadline = new Date(f.deadline);
      const isCompleted = f.status === 'Done';
      
      // We only care about current FY for the primary dashboard metrics
      const isCurrentFY = deadline >= fyStart;
      
      if (isCurrentFY) {
        totalEligibleThisFY++;
      }

      if (isCompleted) {
        // Use completed_at if present, else fallback to deadline for stats realism
        const compDate = f.completed_at ? new Date(f.completed_at) : deadline;
        if (compDate >= fyStart) {
          completedThisFY++;
        }
      }
      
      // Calculate overdue: Status is 'Overdue' OR not completed and deadline passed
      if (f.status === 'Overdue' || (!isCompleted && deadline < now)) {
        overdueCount++;
      }
      
      // Due in next 30 days
      if (!isCompleted && deadline >= now && deadline <= thirtyDaysFromNow) {
        due30Days++;
      }
      
      // Extract Category Name and Color safely
      const mf = Array.isArray(f.master_filings) ? f.master_filings[0] : f.master_filings;
      const cat = mf?.compliance_categories;
      const catName = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || 'Other';
      const catColor = (Array.isArray(cat) ? cat[0]?.color : cat?.color) || '#94a3b8';
      
      if (isCurrentFY) {
        if (!categories[catName]) {
          categories[catName] = { total: 0, completed: 0, color: catColor };
        }
        categories[catName].total++;
        if (isCompleted) {
          categories[catName].completed++;
        }
      }
    });

    // Health Score: Only count things that are actually DUE by now or are finished.
    // Logic: completed / (completed + overdue)
    // This removes future "pending" items from the denominator.
    const healthScore = (completedThisFY + overdueCount) > 0 
      ? Math.round((completedThisFY / (completedThisFY + overdueCount)) * 100) 
      : 100; // Perfect health if nothing is due/overdue yet

    return NextResponse.json({
      total: totalEligibleThisFY, // Metric 1: Total Filings (Current FY)
      overdue: overdueCount,      // Metric 2: Overdue
      due30Days,                 // Metric 3: Due Next 30 Days
      completedThisFY,           // Metric 4: Completed (This FY)
      healthScore,
      totalAllTime: totalCountAllTime, // Hidden/Extra info
      categories: Object.entries(categories).map(([name, data]) => ({ name, ...data }))
    });

  } catch (error: any) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
