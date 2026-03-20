import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');
    const companyId = searchParams.get('company_id');

    const supabase = getAdminSupabase();
    
    let query = supabase
      .from('company_filings')
      .select(`
        *,
        master_filings!inner(name, frequency, category_id, compliance_categories(name, color)),
        users!assigned_to(full_name),
        companies(name, entity_type, color)
      `);

    if (companyId && companyId !== 'all') {
      query = query.eq('company_id', companyId);
    }
    if (categoryId) {
      query = query.eq('master_filings.category_id', categoryId);
    }
    if (status && status !== 'All') {
      query = query.eq('status', status);
    }
    if (assignedTo && assignedTo !== 'All') {
      query = query.eq('assigned_to', assignedTo);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    query = query.order('deadline', { ascending: true });

    const { data: filings, error } = await query;
      
    if (error) throw error;

    return NextResponse.json({ filings });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
