import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getAdminSupabase();
    
    const { data: filing, error } = await supabase
      .from('company_filings')
      .select(`
        *,
        master_filings!inner(
          name, frequency, due_date_rule, governing_law, penalty_description, penalty_formula, category_id,
          compliance_categories(name, color)
        ),
        users!assigned_to(full_name)
      `)
      .eq('id', params.id)
      .single();
      
    if (error) throw error;

    return NextResponse.json({ filing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    if (user.role === 'ceo') {
      return NextResponse.json({ error: 'Forbidden. CEO has read-only access.' }, { status: 403 });
    }

    const updates = await req.json();
    const supabase = getAdminSupabase();
    
    if (updates.status === 'Done') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.display_id;
    }

    const { data: updated, error } = await supabase
      .from('company_filings')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();
      
    if (error) throw error;

    // Log to audit log
    await supabase.from('audit_log').insert({
      user_id: user.display_id,
      company_filing_id: params.id,
      action: 'status_changed',
      new_value: { status: updates.status },
    });

    return NextResponse.json({ success: true, filing: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
