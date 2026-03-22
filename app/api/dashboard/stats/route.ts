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

    let total = count || 0;
    let overdueCount = 0;
    let due30Days = 0;
    let completedThisFY = 0;
    let completedTotal = 0;
    
    const categories: Record<string, { total: number; completed: number; color: string }> = {};

    filings.forEach((f: any) => {
      const deadline = new Date(f.deadline);
      const isCompleted = f.status === 'Done';
      
      if (isCompleted) {
        completedTotal++;
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
      // Note: master_filings might be an object or a single-item array depending on the Supabase client version/config
      const mf = Array.isArray(f.master_filings) ? f.master_filings[0] : f.master_filings;
      const cat = mf?.compliance_categories;
      const catName = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || 'Other';
      const catColor = (Array.isArray(cat) ? cat[0]?.color : cat?.color) || '#94a3b8';
      
      if (!categories[catName]) {
        categories[catName] = { total: 0, completed: 0, color: catColor };
      }
      categories[catName].total++;
      if (isCompleted) {
        categories[catName].completed++;
      }
    });

    const healthScore = total > 0 ? Math.round((completedTotal / total) * 100) : 0;

    return NextResponse.json({
      total,
      overdue: overdueCount,
      due30Days,
      completedThisFY,
      healthScore,
      categories: Object.entries(categories).map(([name, data]) => ({ name, ...data }))
    });

  } catch (error: any) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
