import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { uploadFile } from '@/lib/google-drive';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'ceo') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const supabase = getAdminSupabase();
    
    // Auto provision a drive folder if not available mapping root -> category -> filing
    const { data: filing } = await supabase.from('company_filings').select('gdrive_folder_id').eq('id', id).single();
    let folderId = filing?.gdrive_folder_id || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'mock_folder';

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const result = await uploadFile(file.name, file.type, buffer, folderId);

    const { data: document, error } = await supabase.from('filing_documents').insert({
      company_filing_id: id,
      file_name: file.name,
      file_type: file.type,
      file_size_kb: Math.round(file.size / 1024),
      gdrive_file_id: result.id,
      gdrive_view_url: result.viewUrl,
      gdrive_download_url: result.downloadUrl || result.viewUrl,
      uploaded_by: user.display_id,
      description
    }).select().single();

    if (error) throw error;
    
    await supabase.from('audit_log').insert({
      user_id: user.display_id,
      company_filing_id: id,
      action: 'file_uploaded',
      new_value: { file_name: file.name, description },
    });

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
