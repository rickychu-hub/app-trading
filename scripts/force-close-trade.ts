
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERROR: Faltan credenciales de Supabase (SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY) en .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Script de Cierre de Fuerza Bruta
 * Uso: npx ts-node scripts/force-close-trade.ts [ID_TRADE] [PRECIO_SALIDA]
 */
async function forceClose() {
    const tradeId = process.argv[2];
    const exitPrice = process.argv[3];

    if (!tradeId) {
        console.log("\n🛠️  MODO DE USO:");
        console.log("npx ts-node scripts/force-close-trade.ts [ID_OPERACION] [PRECIO_SALIDA_OPCIONAL]");
        console.log("\nEjemplo: npx ts-node scripts/force-close-trade.ts 42 67500\n");
        return;
    }

    console.log(`\n🧹 Iniciando LIMPIEZA DE ESTADO de fuerza bruta para trade ID: ${tradeId}...`);

    const { data: trade, error: fetchError } = await supabase
        .from('paper_trades')
        .select('*')
        .eq('id', tradeId)
        .single();

    if (fetchError || !trade) {
        console.error("❌ Error: No se encontró la operación en la base de datos.");
        return;
    }

    const price = Number(exitPrice) || trade.entry_price;
    const pnl = (price - trade.entry_price) * (trade.quantity || 1);

    const { error } = await supabase
        .from('paper_trades')
        .update({
            status: 'CLOSED',
            exit_price: price,
            final_pnl: pnl,
            exit_time: new Date().toISOString(),
            close_reason: 'FORCE BRUTE MANUAL SHUTDOWN'
        })
        .eq('id', tradeId);

    if (error) {
        console.error("❌ Error de Supabase al cerrar:", error.message);
    } else {
        console.log(`\n✅ ÉXITO: El trade ${tradeId} (${trade.ticker}) ha sido marcado como CERRADO.`);
        console.log(`📊 P&L Registrado: $${pnl.toFixed(2)}\n`);
    }
}

forceClose();
