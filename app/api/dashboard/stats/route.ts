import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getAdminSupabase();
    
    const { data: filings, error } = await supabase
      .from('company_filings')
      .select('*, master_filings(category_id, compliance_categories(name, color))')
      .neq('status', 'NA');
      
    if (error) throw error;

    const now = new Date();
    now.setHours(0,0,0,0);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(currentYear, 3, 1);

    let total = filings.length;
    let overdue = 0;
    let due30Days = 0;
    let completedThisFY = 0;
    let completed = 0;
    
    const categories: Record<string, { total: number; completed: number; color: string }> = {};

    filings.forEach(f => {
      const deadline = new Date(f.deadline);
      const isCompleted = f.status === 'Done';
      
      if (isCompleted) completed++;
      if (isCompleted && f.completed_at && new Date(f.completed_at) >= fyStart) {
        completedThisFY++;
      }
      
      if (f.status === 'Overdue' || (!isCompleted && deadline < now)) overdue++;
      if (!isCompleted && deadline >= now && deadline <= thirtyDaysFromNow) due30Days++;
      
      // @ts-ignore
      const catName = f.master_filings?.compliance_categories?.name || 'Other';
      // @ts-ignore
      const catColor = f.master_filings?.compliance_categories?.color || '#94a3b8';
      
      if (!categories[catName]) {
        categories[catName] = { total: 0, completed: 0, color: catColor };
      }
      categories[catName].total++;
      if (isCompleted) categories[catName].completed++;
    });

    const healthScore = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json({
      total,
      overdue,
      due30Days,
      completedThisFY,
      healthScore,
      categories: Object.entries(categories).map(([name, data]) => ({ name, ...data }))
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
