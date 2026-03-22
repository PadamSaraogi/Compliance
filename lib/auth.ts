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
    console.log('getCurrentUser: No token found in cookies');
    return null;
  }
  
  const supabase = getAdminSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError) {
    console.error('getCurrentUser: Supabase auth error:', authError.message);
    return null;
  }
  
  if (!user) {
    console.log('getCurrentUser: No user found for token');
    return null;
  }
  
  try {
    let { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, role, full_name, is_active')
      .eq('email', user.email)
      .single();
      
    if (dbError) {
      console.log('getCurrentUser: Database user fetch error:', dbError.message);
    }
      
    // If the user hasn't been synced to the public.users table yet, auto-create them
    if (!dbUser) {
      console.log('getCurrentUser: User not found in DB, attempting auto-sync for:', user.email);
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      // Make the first person to login the admin
      const isFirstUser = count === 0;
      
      const { data: newUser, error: insertError } = await supabase
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
        
      if (insertError) {
        console.error('getCurrentUser: Failed to auto-sync user:', insertError.message);
        return null;
      }
      dbUser = newUser;
    }
      
    if (!dbUser || !dbUser.is_active) {
      console.log('getCurrentUser: User is inactive or missing in DB');
      return null;
    }
    
    return { ...user, role: dbUser.role as string, full_name: dbUser.full_name as string, display_id: dbUser.id as string };
  } catch (err: any) {
    console.error('getCurrentUser: Unexpected error:', err.message);
    return null;
  }
}
