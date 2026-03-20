import { NextResponse } from 'next/server';
import { syncMasterFilings, syncCompaniesFromSheet, syncFilingsFromSheet } from '@/lib/google-sheets';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    // 1. Sync Categories & Master Filing Rules
    const masterResult = await syncMasterFilings();
    
    // 2. Sync Companies
    const companyResult = await syncCompaniesFromSheet();
    
    // 3. Sync Specific Compliance Filings/Dates
    const filingResult = await syncFilingsFromSheet();

    return NextResponse.json({
      success: true,
      master: masterResult,
      companies: companyResult,
      filings: filingResult,
      message: `Sync complete: ${masterResult.count || 0} rules, ${companyResult.count || 0} companies, and ${filingResult.count || 0} filings processed.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
