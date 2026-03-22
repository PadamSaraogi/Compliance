import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { complianceCreateSchema } from '@/lib/validations';
import { getComplianceInstances } from '@/lib/compliance-logic';
import { appendMasterFilingToSheet } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // ... (keep existing GET logic)
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

    query = query.order('deadline', { ascending: true }).limit(5000);

    const { data: filings, error } = await query;
      
    if (error) throw error;

    return NextResponse.json({ filings });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    if (user.role === 'ceo') {
      return NextResponse.json({ error: 'Forbidden. CEO has read-only access.' }, { status: 403 });
    }

    const body = await req.json();
    const result = complianceCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid data', details: result.error.format() }, { status: 400 });
    }

    const data = result.data;
    // For one-time filings, ensure frequency is 'Once'
    if (data.type === 'one-time') {
      data.frequency = 'Once';
    }
    const supabase = getAdminSupabase();

    // 1. Create Master Filing
    const { data: masterFiling, error: masterError } = await supabase
      .from('master_filings')
      .insert({
        name: data.name,
        category_id: data.categoryId,
        frequency: data.frequency,
        due_date_rule: data.type === 'recurring' ? (data.dueDateRule || 'N/A') : null,
        notes: data.notes,
        applicable_to: data.companyId === 'all' ? ['all'] : (data.companyId.startsWith('type:') ? [data.companyId.replace('type:', '')] : []),
        is_active: true
      })
      .select()
      .single();

    if (masterError) throw masterError;

    // SYNC TO GOOGLE SHEETS (Background/Non-blocking)
    let sheetSyncSuccess = true;
    try {
      const { data: category } = await supabase.from('compliance_categories').select('name').eq('id', data.categoryId).single();
      const applicableToList = data.companyId === 'all' ? ['all'] : (data.companyId.startsWith('type:') ? [data.companyId.replace('type:', '')] : []);
      
      await appendMasterFilingToSheet({
        name: data.name!,
        categoryName: category?.name || 'Other',
        frequency: data.frequency!,
        dueDateRule: data.type === 'recurring' ? (data.dueDateRule || 'N/A') : `One-time: ${data.dueDate}`,
        notes: data.notes,
        applicableTo: applicableToList
      });
    } catch (sheetErr) {
      console.error('Failed to sync to Google Sheets:', sheetErr);
      sheetSyncSuccess = false;
    }

    // 2. Identify Companies
    let companyIds: string[] = [];
    if (data.companyId === 'all') {
      const { data: companies } = await supabase.from('companies').select('id').eq('is_active', true);
      companyIds = (companies || []).map(c => c.id);
    } else if (data.companyId.startsWith('type:')) {
      const entityType = data.companyId.replace('type:', '');
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('entity_type', entityType)
        .eq('is_active', true);
      companyIds = (companies || []).map(c => c.id);
    } else {
      companyIds = [data.companyId];
    }

    // 3. Generate Instances using the shared logic
    const instances = getComplianceInstances(
      data.name, 
      masterFiling.frequency, 
      masterFiling.due_date_rule,
      data.dueDate
    );

    // 4. Create Company Filings for each company
    const filingsToInsert: any[] = [];
    companyIds.forEach(cId => {
      instances.forEach(inst => {
        filingsToInsert.push({
          company_id: cId,
          master_filing_id: masterFiling.id,
          title: inst.title,
          deadline: inst.deadline,
          status: inst.status,
          period: inst.period,
          notes: data.notes
        });
      });
    });

    const { error: fError } = await supabase.from('company_filings').insert(filingsToInsert);
    if (fError) throw fError;

    return NextResponse.json({ 
      success: true, 
      count: filingsToInsert.length,
      sheetSyncSuccess,
      message: sheetSyncSuccess 
        ? `Compliance created and synced to Google Sheets. ${filingsToInsert.length} filings generated.`
        : `Compliance created in database, but Google Sheets sync failed. ${filingsToInsert.length} filings generated.`
    });

  } catch (error: any) {
    console.error('Create Compliance Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
