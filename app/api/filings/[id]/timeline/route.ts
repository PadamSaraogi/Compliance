import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getAdminSupabase();
    
    const { data: timeline, error } = await supabase
      .from('audit_log')
      .select('*, users!user_id(full_name)')
      .eq('company_filing_id', id)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;

    return NextResponse.json({ timeline });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'ceo') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { note } = await req.json();
    const supabase = getAdminSupabase();

    const { data, error } = await supabase.from('audit_log').insert({
      user_id: user.display_id,
      company_filing_id: id,
      action: 'note_added',
      new_value: { text: note },
    }).select().single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, note: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
