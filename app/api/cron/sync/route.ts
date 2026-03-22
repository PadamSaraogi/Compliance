import { NextResponse } from 'next/server';
import { applyMasterRulesToCompanies } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

/**
 * Monthly Cron Job to advance the compliance windows (Auto-Pilot)
 * Should be triggered once a month (e.g. 1st of month)
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Cron: Starting Auto-Pilot Sync...');
    const result = await applyMasterRulesToCompanies();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Compliance windows advanced successfully',
      generated: result.count 
    });
  } catch (error: any) {
    console.error('Cron Sweep Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
