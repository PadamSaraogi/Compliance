import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { filingUpdateSchema } from '@/lib/validations';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
      .eq('id', id)
      .single();
      
    if (error) throw error;

    return NextResponse.json({ filing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    if (user.role === 'ceo') {
      return NextResponse.json({ error: 'Forbidden. CEO has read-only access.' }, { status: 403 });
    }

    const body = await req.json();
    const result = filingUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid update data', details: result.error.format() }, { status: 400 });
    }
    const updates = result.data;
    const supabase = getAdminSupabase();

    // Fetch existing for notification comparison
    const { data: existing } = await supabase.from('company_filings').select('status, notes').eq('id', id).single();
    const oldStatus = existing?.status;
    
    if (updates.status === 'Done') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.display_id;
    }

    const { data: updated, error } = await supabase
      .from('company_filings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;

    // Trigger Real-Time Notification
    const { sendUpdateNotification } = await import('@/lib/notifications');
    if (updates.status && updates.status !== oldStatus) {
      await sendUpdateNotification(id, 'status_change', {
        oldStatus,
        newStatus: updates.status,
        updatedBy: user.full_name
      });
    } else if (updates.notes && updates.notes !== existing?.notes) {
      await sendUpdateNotification(id, 'note_added', {
        noteTitle: updates.notes.substring(0, 50) + (updates.notes.length > 50 ? '...' : ''),
        updatedBy: user.full_name
      });
    }

    // Log to audit log
    await supabase.from('audit_log').insert({
      user_id: user.display_id,
      company_filing_id: id,
      action: updates.status ? 'status_changed' : 'details_updated',
      new_value: { status: updates.status, notes: updates.notes },
    });

    return NextResponse.json({ success: true, filing: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
