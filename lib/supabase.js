import { createClient } from '@supabase/supabase-js';

// Essas variáveis vêm do painel do Supabase: Project Settings -> API
// NEXT_PUBLIC_* fica visível no navegador de propósito (a anon key é segura pra isso,
// a segurança real fica nas Row Level Security policies + validação de PIN nas rotas /api).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
