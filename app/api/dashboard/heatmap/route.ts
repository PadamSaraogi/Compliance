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
      .select('deadline, status')
      .neq('status', 'NA')
      .neq('status', 'Done');
      
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
      
      if (deadline < now || f.status === 'Overdue') {
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
