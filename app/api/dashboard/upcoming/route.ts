import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { differenceInDays } from 'date-fns';

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
      .select(`
        id, 
        title, 
        deadline, 
        status, 
        assigned_to, 
        users!assigned_to(full_name),
        master_filings(
          compliance_categories(name, color)
        )
      `)
      .neq('status', 'Done')
      .neq('status', 'NA')
      .order('deadline', { ascending: true })
      .limit(15);

    if (companyId && companyId !== 'all') {
      query = query.eq('company_id', companyId);
    }

    const { data: filings, error } = await query;
      
    if (error) throw error;

    const today = new Date();
    today.setHours(0,0,0,0);

    const upcoming = filings.map(f => {
      const deadline = new Date(f.deadline);
      const daysLeft = differenceInDays(deadline, today);
      
      return {
        id: f.id,
        title: f.title,
        deadline: f.deadline,
        status: f.status,
        daysLeft,
        // @ts-ignore
        categoryName: f.master_filings?.compliance_categories?.name || 'Other',
        // @ts-ignore
        categoryColor: f.master_filings?.compliance_categories?.color || '#94a3b8',
        // @ts-ignore
        assignedTo: f.users?.full_name || 'Unassigned'
      };
    });

    return NextResponse.json({ upcoming });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
