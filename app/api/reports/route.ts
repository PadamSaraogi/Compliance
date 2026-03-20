import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { format } from 'date-fns';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all'; 

    const supabase = getAdminSupabase();
    let query = supabase
      .from('company_filings')
      .select('*, master_filings(name, compliance_categories(name)), users!assigned_to(full_name)')
      .neq('status', 'NA');

    if (type === 'overdue') {
      const today = new Date().toISOString();
      query = query.neq('status', 'Done').lt('deadline', today);
    } else if (type === 'upcoming') {
      const today = new Date().toISOString();
      query = query.neq('status', 'Done').gte('deadline', today);
    } else if (type === 'completed') {
      query = query.eq('status', 'Done');
    }

    const { data: filings, error } = await query.order('deadline', { ascending: true });
    if (error) throw error;

    const headers = ['Filing Name', 'Category', 'Deadline', 'Status', 'Assigned To', 'Completed At'];
    const rows = filings.map(f => [
      `"${(f.title || '').replace(/"/g, '""')}"`,
      `"${(f.master_filings?.compliance_categories?.name || 'Other').replace(/"/g, '""')}"`,
      format(new Date(f.deadline), 'yyyy-MM-dd'),
      f.status,
      `"${(f.users?.full_name || 'Unassigned').replace(/"/g, '""')}"`,
      f.completed_at ? format(new Date(f.completed_at), 'yyyy-MM-dd') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="compliance_report_${type}_${format(new Date(), 'yyyyMMdd')}.csv"`
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
