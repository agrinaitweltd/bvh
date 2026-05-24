import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'kavotechuk@gmail.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
