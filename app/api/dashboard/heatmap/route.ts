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
    
    let query = supabase
      .from('company_filings')
      .select('deadline, status')
      .neq('status', 'NA');

    if (companyId && companyId !== 'all') {
      query = query.eq('company_id', companyId);
    }

    const { data: filings, error } = await query.limit(5000);
      
    if (error) throw error;

    const heatmapData: Record<string, number> = {};
    const overdueData: Record<string, boolean> = {};

    const now = new Date();
    now.setHours(0,0,0,0);

    filings.forEach(f => {
      const deadline = new Date(f.deadline);
      const dateString = deadline.toISOString().split('T')[0];
      
      if (!heatmapData[dateString]) heatmapData[dateString] = 0;
      heatmapData[dateString]++;
      
      if (f.status !== 'Done' && (deadline < now || f.status === 'Overdue')) {
        overdueData[dateString] = true;
      }
    });

    return NextResponse.json({
      heatmap: heatmapData,
      overdue: overdueData
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
