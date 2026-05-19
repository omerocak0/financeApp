import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bwiyftdjhzjqtftniuha.supabase.co';
const supabaseAnonKey = 'sb_publishable_xkUY7WZVo2fwEDe9UBLKYA_pAPbqdm4';

export const supabaseIstemcisi = createClient(supabaseUrl, supabaseAnonKey);
