import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
// @ts-ignore
import { RSI, EMA } from 'technicalindicators';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Secure Key for Server
const LOOP_INTERVAL = 60000; // 1 minute

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ CRITICAL: Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TOP_ASSETS = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'
];

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// --- Analysis Services (Mirrored from Frontend) ---

async function fetchCandles(symbol: string, interval: string = '1h', limit: number = 50): Promise<Candle[]> {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol, interval, limit }
        });

        return response.data.map((d: any[]) => ({
            time: d[0],
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5]),
        }));
    } catch (e) {
        console.error(`⚠️ Error fetching ${symbol}:`, (e as any).message);
        return [];
    }
}

function calculateIndicators(candles: Candle[]) {
    const closes = candles.map(c => c.close);

    // EMA 9 & 21
    const emaFastInput = { values: closes, period: 9 };
    const emaSlowInput = { values: closes, period: 21 };

    // RSI 14
    const rsiInput = { values: closes, period: 14 };

    const emaFast = EMA.calculate(emaFastInput);
    const emaSlow = EMA.calculate(emaSlowInput);
    const rsi = RSI.calculate(rsiInput);

    // Get latest values (last index)
    return {
        price: closes[closes.length - 1],
        emaFast: emaFast[emaFast.length - 1] || 0,
        emaSlow: emaSlow[emaSlow.length - 1] || 0,
        rsi: rsi[rsi.length - 1] || 50
    };
}

// --- Trading Logic ---

async function executeTrade(ticker: string, price: number, amount: number) {
    if (!price || price <= 0) {
        console.warn(`⚠️ SKIPPING BUY: Invalid Price $${price} for ${ticker}`);
        return;
    }

    // 1. Check if we already have an open trade for this user/bot (Idempotency)
    const cleanTicker = ticker.replace('USDT', '').trim().toUpperCase();

    // Double Check: Verify if ANY open position exists for this ticker
    const { data: existingTrades, error: fetchError } = await supabase
        .from('paper_trades')
        .select('id, ticker, status')
        .eq('status', 'OPEN')
        .ilike('ticker', cleanTicker); // Use ilike for case-insensitivity

    if (fetchError) {
        console.error(`❌ DB Error checking duplicates for ${cleanTicker}:`, fetchError.message);
        return; // Fail safe
    }

    if (existingTrades && existingTrades.length > 0) {
        console.log(`⏸️  Skipping ${cleanTicker}: Position already open (ID: ${existingTrades[0].id}).`);
        return;
    }

    // 2. Insert Trade
    const quantity = amount / price;

    const { error } = await supabase.from('paper_trades').insert([{
        ticker: cleanTicker,
        entry_price: price,
        invested_amount: amount,
        quantity: quantity,
        initial_score: 85, // Auto-Bot Score
        status: 'OPEN',
        news_id: 'BOT-WORKER' // Marker for headless bot
    }]);

    if (error) console.error(`❌ DB Insert Error for ${cleanTicker}:`, error.message);
    else console.log(`🚀 BUY EXECUTED: ${cleanTicker} @ $${price}`);
}

async function runMarketScan() {
    console.log(`\n🔎 Scanning Market [${new Date().toISOString()}]...`);

    for (const symbol of TOP_ASSETS) {
        // 1. Fetch
        const candles = await fetchCandles(symbol);
        if (candles.length < 30) continue;

        // 2. Analyze
        const { price, emaFast, emaSlow, rsi } = calculateIndicators(candles);

        // 3. Logic (Trend Following)
        const spread = emaFast - emaSlow;
        const trendUp = spread > 0;
        const momentum = rsi > 50 && rsi < 70;

        // Custom Score Logic
        let score = 50;
        if (trendUp) score += 20;
        if (momentum) score += 15;
        if (rsi > 75) score -= 10; // Overbought

        const logMsg = `${symbol.padEnd(8)} | Price: ${price.toFixed(2)} | RSI: ${rsi.toFixed(1)} | Spread: ${spread.toFixed(2)} | Score: ${score}`;
        // console.log(logMsg); // Verbose log

        // 4. Decision
        if (score >= 80) {
            console.log(`✅ OPPORTUNITY FOUND: ${logMsg}`);
            await executeTrade(symbol, price, 1000); // 1k investment
        }
    }
}

// --- Main Loop ---

async function managePositions() {
    console.log("🛡️ Checking Risk Levels for Open Positions...");

    // 1. Fetch ALL Open Trades
    const { data: openTrades, error } = await supabase
        .from('paper_trades')
        .select('*')
        .eq('status', 'OPEN');

    if (error || !openTrades || openTrades.length === 0) return;

    for (const trade of openTrades) {
        // Normalize Ticker to match Binance format (e.g. BTC -> BTCUSDT)
        const symbol = trade.ticker.endsWith('USDT') ? trade.ticker : `${trade.ticker}USDT`;

        // 2. Get Live Price
        // Optimization: In a real bot, we would fetch all prices properly, here we fetch one by one
        const candles = await fetchCandles(symbol, '1m', 5); // 1m candles for fast reaction
        if (!candles || candles.length === 0) continue;

        const currentPrice = candles[candles.length - 1].close;
        const entryPrice = trade.entry_price || trade.invested_amount; // Fallback for legacy

        if (!entryPrice || entryPrice <= 0) continue;

        // 3. Risk Logic
        const pnlPercent = (currentPrice - entryPrice) / entryPrice; // e.g. -0.05 for -5%

        let shouldSell = false;
        let reason = "";

        // Stop Loss (-2%)
        if (pnlPercent <= -0.02) {
            shouldSell = true;
            reason = `STOP LOSS TRIGGERED (${(pnlPercent * 100).toFixed(2)}%)`;
        }

        // Take Profit (+5%)
        else if (pnlPercent >= 0.05) {
            shouldSell = true;
            reason = `TAKE PROFIT TRIGGERED (+${(pnlPercent * 100).toFixed(2)}%)`;
        }

        // 4. Execute Sale
        if (shouldSell) {
            console.log(`🚨 EXECUTING SALE for ${trade.ticker}: ${reason}`);

            // Calc Final PnL Amount
            const invested = trade.invested_amount || entryPrice;
            const quantity = trade.quantity || (invested / entryPrice);
            const exitValue = quantity * currentPrice;
            const finalPnL = exitValue - invested;

            const { error: closeError } = await supabase
                .from('paper_trades')
                .update({
                    status: 'CLOSED',
                    exit_price: currentPrice,
                    exit_time: new Date().toISOString(),
                    final_pnl: finalPnL,
                    close_reason: reason
                })
                .eq('id', trade.id);

            if (closeError) {
                console.error(`❌ FAILED to close trade ${trade.id}:`, closeError.message);
            } else {
                console.log(`✅ Trade ${trade.id} CLOSED successfully.`);
            }
        }
    }
}

// --- Main Loop ---

async function startBot() {
    console.log('🤖 Headless Bot Worker Started...');
    console.log(`Targeting: ${TOP_ASSETS.join(', ')}`);

    while (true) {
        try {
            // Priority 1: Manage Risks (Sell before Buy)
            await managePositions();

            // Priority 2: Look for opportunities
            await runMarketScan();

            console.log('💤 Cycle complete. Sleeping...');
        } catch (error) {
            console.error('❌ Critical Loop Error:', error);
        }
        await new Promise(resolve => setTimeout(resolve, LOOP_INTERVAL));
    }
}

// Start
startBot();
