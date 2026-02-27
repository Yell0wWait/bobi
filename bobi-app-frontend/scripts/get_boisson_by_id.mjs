import { supabase } from '../src/lib/supabase.js';

const id = process.argv[2] || 'e2eb2d33-ac2b-48ec-89ce-4c8acee68db5';

async function run() {
  try {
    const { data, error } = await supabase
      .from('boissons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

run();
