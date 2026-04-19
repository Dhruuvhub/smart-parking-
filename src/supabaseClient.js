import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mhhfiwvmgvwkaaysefnn.supabase.co';
const supabaseKey = 'sb_publishable_fUchIishtJWDYIPN8pP7SA_mZlMMSV3';

export const supabase = createClient(supabaseUrl, supabaseKey);
