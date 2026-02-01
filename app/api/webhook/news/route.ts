import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(request: Request) {
    try {
        // Robust JSON parsing
        let body;
        try {
            body = await request.json();
        } catch (e) {
            console.error('❌ Invalid JSON received');
            return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Destructuring with fallbacks
        const {
            title = 'Sin título',
            summary = 'Sin resumen disponible',
            url = '',
            published_at = new Date().toISOString(),
            sentiment_score = 0,
            tickers = [],
            veto = false
        } = body;

        console.log(`📡 Noticia Recibida: [${title}] (Veto: ${veto})`);

        // Mapping n8n fields to Supabase schema
        const newsData = {
            titulo: title,
            resumen: summary,
            enlace: url,
            fecha: published_at,
            score: Number(sentiment_score) || 0,
            tickers: Array.isArray(tickers) ? tickers : [],
            sentimiento: (sentiment_score > 0.3) ? 'Positivo' : (sentiment_score < -0.3) ? 'Negativo' : 'Neutro'
        };

        const { error } = await supabase
            .from('news')
            .insert([newsData]);

        if (error) {
            console.error('❌ Error guardando en Supabase:', error.message);
            // We return 200 even if DB fails to prevent n8n from retrying infinitely if it's a schema issue, 
            // but log it clearly. Or return 202. Let's stick to 200 to silence n8n errors if desired, 
            // but the user asked for a bulletproof receiver.
            return new Response(JSON.stringify({ status: 'warning', message: error.message }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ status: 'success', message: 'Noticia procesada' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('❌ Critical Error in Webhook:', err.message);
        return new Response(JSON.stringify({ status: 'error', message: 'Internal Server Error' }), {
            status: 200, // Return 200 to prevent n8n crash, but log error
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

