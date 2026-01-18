import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR CRÍTICO: Faltan las variables NEXT_PUBLIC_SUPABASE...');
    throw new Error('Configuración de Supabase incompleta en el navegador. Revise las variables de entorno.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
