import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://bwiyftdjhzjqtftniuha.supabase.co';
const supabaseAnonKey = 'sb_publishable_xkUY7WZVo2fwEDe9UBLKYA_pAPbqdm4';

export const supabaseIstemcisi = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
