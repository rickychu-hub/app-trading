const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ CRITICAL: Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function resetDatabase() {
    console.log('🔄 Starting Database Reset...\n');

    try {
        // 1. Delete all trade_history records
        console.log('🗑️  Deleting all records from trade_history...');
        const { error: tradeHistoryError } = await supabase
            .from('trade_history')
            .delete()
            .neq('id', 0); // Delete all rows

        if (tradeHistoryError) {
            console.error('❌ Error deleting trade_history:', tradeHistoryError.message);
        } else {
            console.log('✅ trade_history cleared');
        }

        // 2. Delete all paper_trades records
        console.log('🗑️  Deleting all records from paper_trades...');
        const { error: paperTradesError } = await supabase
            .from('paper_trades')
            .delete()
            .neq('id', 0);

        if (paperTradesError) {
            console.error('❌ Error deleting paper_trades:', paperTradesError.message);
        } else {
            console.log('✅ paper_trades cleared');
        }

        // 3. Delete all daily_balances records
        console.log('🗑️  Deleting all records from daily_balances...');
        const { error: dailyBalancesError } = await supabase
            .from('daily_balances')
            .delete()
            .neq('id', 0);

        if (dailyBalancesError) {
            console.error('❌ Error deleting daily_balances:', dailyBalancesError.message);
        } else {
            console.log('✅ daily_balances cleared');
        }

        // 4. Insert initial balance for today
        const todayStr = new Date().toISOString().split('T')[0];
        console.log(`\n💰 Inserting initial balance for ${todayStr}...`);

        const { error: insertError } = await supabase
            .from('daily_balances')
            .insert([{
                date: todayStr,
                start_balance: 10000,
                current_balance: 10000,
                peak_balance: 10000,
                max_drawdown: 0,
                status: 'ACTIVE'
            }]);

        if (insertError) {
            console.error('❌ Error inserting initial balance:', insertError.message);
        } else {
            console.log('✅ Initial balance set: $10,000');
        }

        // 5. Reset account_state if it exists
        console.log('\n🔄 Resetting account_state...');
        const { error: accountStateError } = await supabase
            .from('account_state')
            .update({
                initial_capital: 10000,
                available_cash: 10000,
                last_updated: new Date().toISOString()
            })
            .eq('id', 1);

        if (accountStateError) {
            console.log('⚠️  account_state table may not exist or update failed:', accountStateError.message);
        } else {
            console.log('✅ account_state reset');
        }

        console.log('\n✨ Database Reset Complete!');
        console.log('📊 Status:');
        console.log('   - All trades deleted');
        console.log('   - All history cleared');
        console.log('   - Starting balance: $10,000');
        console.log('   - Ready for Day 1 🚀\n');

    } catch (error) {
        console.error('❌ Unexpected error during reset:', error.message);
        process.exit(1);
    }
}

// Execute
resetDatabase()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
