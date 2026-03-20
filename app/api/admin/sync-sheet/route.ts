import { NextResponse } from 'next/server';
import { syncMasterFilings } from '@/lib/google-sheets';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const result = await syncMasterFilings();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
