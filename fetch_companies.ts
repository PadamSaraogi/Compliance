import { getAdminSupabase } from './lib/supabase';

async function listCompanies() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase.from('companies').select('name').order('name');
  
  if (error) {
    console.error('Error fetching companies:', error.message);
    process.exit(1);
  }

  console.log(JSON.stringify(data.map(c => c.name), null, 2));
}

listCompanies();
