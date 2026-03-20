import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      return NextResponse.json({ error: authError?.message || 'Invalid credentials' }, { status: 401 });
    }

    await setSessionCookie(authData.session.access_token);
    
    // We update the last_login in users table since we have service role access on the server side
    // We shouldn't do it from the client supabase instance here. Wait, api Route has access to admin client.
    // However, basic supabase JS does the trick for fetching role.
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();
        
    const role = userData?.role || 'accountant';

    return NextResponse.json({ success: true, role });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
