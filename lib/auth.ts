import { cookies } from 'next/headers';
import { getAdminSupabase } from './supabase';

const SESSION_COOKIE_NAME = 'compliance_session';

export async function setSessionCookie(access_token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) {
    console.log('Auth: No token found in session cookie');
    return null;
  }
  const supabase = getAdminSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    console.log('Auth: getUser failed for token:', error?.message);
    return null;
  }
  
  let { data: dbUser } = await supabase
    .from('users')
    .select('id, role, full_name, is_active')
    .eq('email', user.email)
    .single();
    
  // If the user hasn't been synced to the public.users table yet, auto-create them
  if (!dbUser) {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    // Make the first person to login the admin
    const isFirstUser = count === 0;
    
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: isFirstUser ? 'admin' : 'accountant',
        is_active: true
      })
      .select('id, role, full_name, is_active')
      .single();
      
    dbUser = newUser;
  }
    
  if (!dbUser || !dbUser.is_active) return null;
  
  return { ...user, role: dbUser.role as string, full_name: dbUser.full_name as string, display_id: dbUser.id as string };
}
