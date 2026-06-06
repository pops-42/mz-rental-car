import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cyokeqdmnnocjyhufhtr.supabase.co'
const supabaseKey = 'sb_publishable_TbhjSwHkFmP2xAfSc8cNCg_5he5xYu4'

export const supabase = createClient(supabaseUrl, supabaseKey)