import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getAdminSupabase();
    
    const { data: documents, error } = await supabase
      .from('filing_documents')
      .select('*, users!uploaded_by(full_name)')
      .eq('company_filing_id', id)
      .order('uploaded_at', { ascending: false });
      
    if (error) throw error;

    return NextResponse.json({ documents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
